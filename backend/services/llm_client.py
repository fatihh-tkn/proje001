"""
llm_client.py — Provider-agnostic düşük seviyeli LLM yardımcıları.

İçerir:
  - _post_with_retry : 429/5xx için exponential backoff ile httpx POST
  - resolve_model_name : Gemini model adı normalizasyonu
  - call_llm          : Tek seferlik (non-streaming) Gemini / OpenAI uyumlu çağrı
"""
import asyncio
import json
import logging

import httpx

from core.logger import get_logger
from services import provider_registry

logger = get_logger("llm_client")

# Gemini modeli için geçersiz / eski isimler
_GEMINI_INVALID_NAMES: frozenset[str] = frozenset(
    {"gemini", "google gemini", "google", "gemini ai", "gemini-pro"}
)


async def _post_with_retry(
    client: httpx.AsyncClient,
    url: str,
    *,
    max_retries: int = 3,
    **kwargs,
) -> httpx.Response:
    """429 ve 5xx hataları için exponential backoff retry (2s → 4s → 8s, maks 3 deneme)."""
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
                    "AI API geçici hata [HTTP %d], %.0fs sonra yeniden deneniyor (%d/%d)",
                    exc.response.status_code, delay, attempt + 1, max_retries,
                )
                await asyncio.sleep(delay)
                continue
            raise
    raise RuntimeError("unreachable")  # pragma: no cover


def resolve_model_name(model_name: str, is_gemini: bool) -> str:
    """Kullanıcının girdiği model adını gerçek API adına çevirir."""
    if not is_gemini:
        return model_name
    name_lower = model_name.lower().strip()
    if name_lower in _GEMINI_INVALID_NAMES or "1.5" in model_name:
        return "gemini-1.5-pro" if "pro" in name_lower else "gemini-1.5-flash"
    if "2.0" in model_name:
        return "gemini-2.0-flash"
    return model_name


async def call_llm(
    *,
    active_model: dict,
    system_prompt: str,
    user_input: str,
    temperature: float = 0.7,
    history: list[dict] | None = None,
    response_format_json: bool = False,
    timeout: float = 120.0,
) -> tuple[str, dict]:
    """
    Tek seferlik (non-streaming) LLM çağrısı.

    Döner: (reply_text, usage_dict)
    usage_dict — Gemini: {promptTokenCount, candidatesTokenCount, totalTokenCount}
                 OpenAI: {prompt_tokens, completion_tokens, total_tokens}
    """
    from core.prompts import build_gemini_contents, build_openai_messages

    is_gemini = active_model.get("protocol") == "google_gemini"
    base_url = active_model.get("base_url") or ""
    api_key = active_model["api_key"]
    extra_headers = active_model.get("extra_headers") or {}
    actual_model_name = resolve_model_name(active_model["name"], is_gemini)

    async with httpx.AsyncClient(timeout=timeout) as client:
        if is_gemini:
            url = f"{base_url}/models/{actual_model_name}:generateContent?key={api_key}"
            contents = build_gemini_contents(history or [], user_input)
            payload: dict = {
                "systemInstruction": {"parts": [{"text": system_prompt}]},
                "contents": contents,
                "generationConfig": {"temperature": temperature},
            }
            response = await _post_with_retry(
                client, url,
                headers={"Content-Type": "application/json"},
                json=payload,
            )
            data = response.json()
            try:
                reply_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            except (KeyError, IndexError):
                reply_text = ""
            return reply_text, data.get("usageMetadata", {})

        else:
            messages = build_openai_messages(history or [], system_prompt, user_input)
            body: dict = {
                "model": actual_model_name,
                "messages": messages,
                "temperature": temperature,
            }
            if response_format_json:
                body["response_format"] = {"type": "json_object"}
            response = await _post_with_retry(
                client,
                provider_registry.openai_chat_url(base_url),
                headers=provider_registry.openai_headers(api_key, extra_headers),
                json=body,
            )
            data = response.json()
            reply_text = data["choices"][0]["message"]["content"].strip()
            return reply_text, data.get("usage", {})
