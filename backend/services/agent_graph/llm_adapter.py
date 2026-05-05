"""
agent_graph/llm_adapter.py
────────────────────────────────────────────────────────────────────
Mevcut httpx tabanlı LLM çağrı altyapısını (Gemini + OpenAI uyumlu)
LangGraph node'larından tek arayüzle çağrılabilir hale getirir.

LangChain'in `ChatOpenAI` / `ChatGoogleGenerativeAI` paketlerini
KULLANMIYORUZ — ai_service.py'deki rate limit, retry, cost log ve
özel header mantığını korumak için kendi adapter'ımızı yazıyoruz.

Public:
  call_llm(agent_config, messages, **kwargs) -> str
        — tam yanıt; non-streaming
  stream_llm(agent_config, messages, **kwargs) -> AsyncIterator[str]
        — token-level streaming için
  get_llm(agent_config) -> CustomLLM
        — opsiyonel: LangChain Runnable arayüzü gerekirse
"""

from __future__ import annotations

import json
from typing import AsyncIterator
from collections.abc import Iterable

import httpx

from core.logger import get_logger
from core.db_bridge import get_user_models
from services import provider_registry

logger = get_logger("agent_graph.llm")


# ── Provider seçimi ─────────────────────────────────────────────────────────

def _resolve_active_model(agent_config: dict | None) -> dict:
    """
    Agent config'inde belirtilen model'i kullanıcı modelleri arasında bulur.
    Yoksa kullanıcının ilk modeli (varsayılan).
    """
    models = get_user_models()
    if not models:
        raise RuntimeError("Sistemde kayıtlı yapay zeka modeli yok.")

    selected = agent_config and agent_config.get("model")
    active = next((m for m in models if m["name"] == selected), None) if selected else None
    return active or models[0]


def _is_gemini(model_info: dict) -> bool:
    """get_user_models() çıkışında 'protocol' alanı vardır — registry'den gelir."""
    return (model_info or {}).get("protocol") == "google_gemini"


def _normalize_gemini_model(model_name: str) -> str:
    invalid = {"gemini", "google gemini", "google", "gemini ai", "gemini-pro"}
    n = (model_name or "").lower().strip()
    if n in invalid or "1.5" in n:
        return "gemini-1.5-pro" if "pro" in n else "gemini-1.5-flash"
    if "2.0" in n:
        return "gemini-2.0-flash"
    return model_name


# ── HTTP yardımcıları ───────────────────────────────────────────────────────

async def _post_with_retry(client: httpx.AsyncClient, url: str, *, max_retries: int = 3, **kwargs) -> httpx.Response:
    """ai_service.py'deki retry mantığı — buraya kopyalandı bağımsız çalışsın."""
    import asyncio
    delays = (2.0, 4.0, 8.0)
    for attempt in range(max_retries + 1):
        try:
            response = await client.post(url, **kwargs)
            response.raise_for_status()
            return response
        except httpx.HTTPStatusError as exc:
            if attempt < max_retries and exc.response.status_code in (429, 500, 502, 503, 504):
                delay = delays[min(attempt, len(delays) - 1)]
                logger.warning(
                    "[LLM] HTTP %d, %.0fs sonra retry (%d/%d)",
                    exc.response.status_code, delay, attempt + 1, max_retries,
                )
                await asyncio.sleep(delay)
                continue
            raise
    raise RuntimeError("unreachable")  # pragma: no cover


# ── Mesaj formatı dönüşümleri ───────────────────────────────────────────────

def _to_gemini_payload(
    messages: list[dict],
    temperature: float,
    response_mime: str | None = None,
    max_tokens: int | None = None,
) -> dict:
    """
    Standart [{role, content}] listesini Gemini API formatına çevirir.
    Sistem mesajı ayrı `systemInstruction` olarak, user/assistant turn'leri
    `contents` listesinde.
    """
    system_parts = []
    contents = []
    for m in messages:
        role = m.get("role")
        text = m.get("content", "")
        if role == "system":
            system_parts.append(text)
            continue
        gemini_role = "user" if role == "user" else "model"
        contents.append({"role": gemini_role, "parts": [{"text": text}]})

    payload = {
        "contents": contents,
        "generationConfig": {"temperature": float(temperature)},
    }
    if system_parts:
        payload["systemInstruction"] = {"parts": [{"text": "\n\n".join(system_parts)}]}
    if response_mime:
        payload["generationConfig"]["responseMimeType"] = response_mime
    if max_tokens and max_tokens > 0:
        payload["generationConfig"]["maxOutputTokens"] = int(max_tokens)
    return payload


def _to_openai_payload(
    messages: list[dict],
    temperature: float,
    model: str,
    response_format: str | None = None,
    max_tokens: int | None = None,
) -> dict:
    payload = {
        "model": model,
        "messages": messages,
        "temperature": float(temperature),
    }
    if response_format == "json_object":
        payload["response_format"] = {"type": "json_object"}
    if max_tokens and max_tokens > 0:
        payload["max_tokens"] = int(max_tokens)
    return payload


# ── Public API ──────────────────────────────────────────────────────────────

async def call_llm(
    agent_config: dict | None,
    messages: list[dict],
    *,
    temperature: float | None = None,
    response_format: str | None = None,   # 'json_object' → strict JSON
    max_tokens: int | None = None,
    timeout: float = 60.0,
) -> dict:
    """
    Tek-shot LLM çağrısı. Döner:
        {
          "text":              str,
          "model":             str,
          "provider":          str,
          "prompt_tokens":     int,
          "completion_tokens": int,
        }
    """
    model_info = _resolve_active_model(agent_config)
    model_name = model_info["name"]
    api_key = model_info["api_key"]
    base_url = model_info.get("base_url") or ""
    extra_headers = model_info.get("extra_headers") or {}
    provider_label = model_info.get("provider_label") or model_info.get("provider", "")
    temp = temperature if temperature is not None else (agent_config and agent_config.get("temperature", 0.7)) or 0.7
    # max_tokens öncelik: explicit param → agent_config.max_tokens → None
    eff_max_tokens = max_tokens
    if eff_max_tokens is None and agent_config:
        eff_max_tokens = agent_config.get("max_tokens") or None
    is_gemini = _is_gemini(model_info)
    actual_model = _normalize_gemini_model(model_name) if is_gemini else model_name

    async with httpx.AsyncClient(timeout=timeout) as client:
        if is_gemini:
            url = f"{base_url}/models/{actual_model}:generateContent?key={api_key}"
            mime = "application/json" if response_format == "json_object" else None
            payload = _to_gemini_payload(messages, temp, response_mime=mime, max_tokens=eff_max_tokens)
            response = await _post_with_retry(
                client, url,
                headers={"Content-Type": "application/json"},
                json=payload,
            )
            data = response.json()
            try:
                text = data["candidates"][0]["content"]["parts"][0]["text"]
            except (KeyError, IndexError):
                text = ""
            usage = data.get("usageMetadata", {}) or {}
            return {
                "text": text,
                "model": actual_model,
                "provider": provider_label or "Google Gemini",
                "prompt_tokens": int(usage.get("promptTokenCount", 0) or 0),
                "completion_tokens": int(usage.get("candidatesTokenCount", 0) or 0),
            }
        else:
            url = provider_registry.openai_chat_url(base_url)
            payload = _to_openai_payload(messages, temp, actual_model, response_format=response_format, max_tokens=eff_max_tokens)
            response = await _post_with_retry(
                client, url,
                headers=provider_registry.openai_headers(api_key, extra_headers),
                json=payload,
            )
            data = response.json()
            text = (data.get("choices") or [{}])[0].get("message", {}).get("content", "") or ""
            usage = data.get("usage", {}) or {}
            return {
                "text": text,
                "model": actual_model,
                "provider": provider_label or "OpenAI (Custom)",
                "prompt_tokens": int(usage.get("prompt_tokens", 0) or 0),
                "completion_tokens": int(usage.get("completion_tokens", 0) or 0),
            }


async def stream_llm(
    agent_config: dict | None,
    messages: list[dict],
    *,
    temperature: float | None = None,
    max_tokens: int | None = None,
    timeout: float = 120.0,
) -> AsyncIterator[dict]:
    """
    Token-level streaming. Her chunk:
        {"type": "token", "text": str}
    Stream tamamlandığında son chunk:
        {"type": "done", "model": str, "provider": str,
         "prompt_tokens": int, "completion_tokens": int, "full_text": str}
    """
    model_info = _resolve_active_model(agent_config)
    model_name = model_info["name"]
    api_key = model_info["api_key"]
    base_url = model_info.get("base_url") or ""
    extra_headers = model_info.get("extra_headers") or {}
    provider_label = model_info.get("provider_label") or model_info.get("provider", "")
    temp = temperature if temperature is not None else (agent_config and agent_config.get("temperature", 0.7)) or 0.7
    eff_max_tokens = max_tokens
    if eff_max_tokens is None and agent_config:
        eff_max_tokens = agent_config.get("max_tokens") or None
    is_gemini = _is_gemini(model_info)
    actual_model = _normalize_gemini_model(model_name) if is_gemini else model_name
    full_text_parts: list[str] = []
    p_tok, c_tok = 0, 0

    async with httpx.AsyncClient(timeout=timeout) as client:
        if is_gemini:
            url = f"{base_url}/models/{actual_model}:streamGenerateContent?alt=sse&key={api_key}"
            payload = _to_gemini_payload(messages, temp, max_tokens=eff_max_tokens)
            async with client.stream("POST", url,
                                     headers={"Content-Type": "application/json"},
                                     json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    raw = line[5:].strip()
                    if not raw:
                        continue
                    try:
                        chunk = json.loads(raw)
                        parts = (chunk.get("candidates", [{}])[0]
                                      .get("content", {})
                                      .get("parts", []))
                        for p in parts:
                            t = p.get("text", "")
                            if t:
                                full_text_parts.append(t)
                                yield {"type": "token", "text": t}
                        usage = chunk.get("usageMetadata") or {}
                        if usage:
                            p_tok = int(usage.get("promptTokenCount", p_tok) or p_tok)
                            c_tok = int(usage.get("candidatesTokenCount", c_tok) or c_tok)
                    except (json.JSONDecodeError, IndexError, KeyError):
                        continue
            yield {
                "type": "done",
                "model": actual_model, "provider": provider_label or "Google Gemini",
                "prompt_tokens": p_tok, "completion_tokens": c_tok,
                "full_text": "".join(full_text_parts),
            }
        else:
            url = provider_registry.openai_chat_url(base_url)
            payload = _to_openai_payload(messages, temp, actual_model, max_tokens=eff_max_tokens)
            payload["stream"] = True
            async with client.stream("POST", url,
                                     headers=provider_registry.openai_headers(api_key, extra_headers),
                                     json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    raw = line[5:].strip()
                    if not raw or raw == "[DONE]":
                        continue
                    try:
                        chunk = json.loads(raw)
                        delta = (chunk.get("choices", [{}])[0]
                                      .get("delta", {})
                                      .get("content", ""))
                        if delta:
                            full_text_parts.append(delta)
                            yield {"type": "token", "text": delta}
                        usage = chunk.get("usage")
                        if usage:
                            p_tok = int(usage.get("prompt_tokens", p_tok) or p_tok)
                            c_tok = int(usage.get("completion_tokens", c_tok) or c_tok)
                    except (json.JSONDecodeError, IndexError, KeyError):
                        continue
            yield {
                "type": "done",
                "model": actual_model, "provider": provider_label or "OpenAI (Custom)",
                "prompt_tokens": p_tok, "completion_tokens": c_tok,
                "full_text": "".join(full_text_parts),
            }


# ── Yardımcı: messages listesi inşa et (system + history + user) ────────────

def build_messages(
    *,
    system: str,
    history: Iterable[dict] | None = None,
    user: str,
) -> list[dict]:
    """
    Standart {role, content} listesi üretir.
    history: [{role: 'user'|'assistant', content: str}, ...]
    """
    msgs: list[dict] = [{"role": "system", "content": system}]
    if history:
        for m in history:
            r = m.get("role")
            if r in ("user", "assistant"):
                msgs.append({"role": r, "content": m.get("content", "")})
    msgs.append({"role": "user", "content": user})
    return msgs
