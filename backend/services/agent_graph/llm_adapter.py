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
from services.llm_client import _post_with_retry  # noqa: F401 — shared retry logic

logger = get_logger("agent_graph.llm")


# ── Provider seçimi ─────────────────────────────────────────────────────────

def _resolve_active_model(agent_config: dict | None) -> dict:
    """
    Agent config'inde belirtilen model'i kullanıcı modelleri arasında bulur.
    Yoksa kullanıcının ilk modeli (varsayılan).
    """
    models = get_user_models(include_secret=True)
    if not models:
        raise RuntimeError("Sistemde kayıtlı yapay zeka modeli yok.")

    selected = agent_config and agent_config.get("model")
    active = next((m for m in models if m["name"] == selected), None) if selected else None
    if selected and active is None:
        logger.warning(
            "[_resolve_active_model] '%s' modeli bulunamadı → fallback='%s'. Kayıtlı isimler: %s",
            selected, models[0]["name"], [m["name"] for m in models],
        )
    elif selected:
        logger.info("[_resolve_active_model] '%s' → protocol=%s", selected, active.get("protocol"))
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
    Mesajda `_image_base64` varsa inline_data olarak eklenir (vision).
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
        parts: list[dict] = [{"text": text}]
        img_b64 = m.get("_image_base64")
        if img_b64 and role == "user":
            parts.append({
                "inline_data": {
                    "mime_type": m.get("_image_mime", "image/jpeg"),
                    "data": img_b64,
                }
            })
        contents.append({"role": gemini_role, "parts": parts})

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
    # Mesajlardaki özel _image_* anahtarlarını OpenAI vision formatına çevir.
    processed: list[dict] = []
    for m in messages:
        img_b64 = m.get("_image_base64")
        if img_b64 and m.get("role") == "user":
            processed.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": m.get("content", "")},
                    {"type": "image_url", "image_url": {
                        "url": f"data:{m.get('_image_mime', 'image/jpeg')};base64,{img_b64}"
                    }},
                ],
            })
        else:
            processed.append({k: v for k, v in m.items() if not k.startswith("_")})
    payload = {
        "model": model,
        "messages": processed,
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
    image_base64: str | None = None,
    image_mime: str = "image/jpeg",
) -> list[dict]:
    """
    Standart {role, content} listesi üretir.
    history: [{role: 'user'|'assistant', content: str}, ...]
    image_base64: opsiyonel ekran görüntüsü (vision destekleyen modeller için).
      `_image_base64` / `_image_mime` özel anahtarlarıyla işaretlenir;
      payload builder'lar (Gemini / OpenAI) bunu provider formatına çevirir.
    """
    msgs: list[dict] = [{"role": "system", "content": system}]
    if history:
        for m in history:
            r = m.get("role")
            if r in ("user", "assistant"):
                msgs.append({"role": r, "content": m.get("content", "")})
    user_msg: dict = {"role": "user", "content": user}
    if image_base64:
        user_msg["_image_base64"] = image_base64
        user_msg["_image_mime"] = image_mime
    msgs.append(user_msg)
    return msgs
