"""
nodes/supervisor.py
────────────────────────────────────────────────────────────────────
Plan üretici (orkestratör). Kullanıcı mesajını + komutu + dosya
bilgisini analiz eder, intent + paralel çalışacak specialist
listesini üretir.

LG.2 — LLM-tabanlı intent classifier:
  • `command` set ise (hızlı aksiyon) deterministik kural çalışır.
  • Aksi halde küçük JSON-response LLM çağrısı yapılır.
  • LLM erişilemezse rule-based fallback devreye girer.

Çıktı (state'e merge edilir):
    {
      "intent": "general" | "hata_cozumu" | "rapor_arama" | "n8n" | "dosya_qa",
      "plan":   [{"node": "rag_search", "mode": "parallel", ...}, ...],
      "plan_reasoning": "...",
      "needs_polish": bool,
    }

Plan içindeki "node" değerleri graph.py'deki conditional dispatcher
tarafından okunup `Send` API ile paralel yayılır.
"""

from __future__ import annotations

import json
import time
import re

from fastapi.concurrency import run_in_threadpool

from core.logger import get_logger
from core.db_bridge import get_assigned_agent, get_all_assigned_agents, check_cost_cap
from ..state import AgentState
from ..llm_adapter import call_llm, build_messages

logger = get_logger("agent_graph.supervisor")


# Geçerli intent değerleri (LLM classifier çıktısı için — 'sohbet' deterministik fast-path)
_VALID_INTENTS = {"general", "hata_cozumu", "rapor_arama", "n8n", "dosya_qa"}

# Komut → intent (deterministik)
_COMMAND_INTENT_MAP = {
    "error_solve":       "hata_cozumu",
    "zli_report_query":  "rapor_arama",
    "summarize":         "general",
    "bpmn_analyze":      "general",
    "extract_tables":    "general",
    "gen_questions":     "general",
    "action_items":      "general",
}

# Kısa sohbet kalıpları — fast-path: LLM classifier'a hiç uğramadan 'sohbet'e düşür.
# Selamlama, vedalaşma, teşekkür, kısa onay/red gibi RAG/specialist gerektirmeyen turlar.
_CHITCHAT_RE = re.compile(
    r"^("
    r"selam(lar)?|merhaba|mrb|slm|"
    r"naber|nbr|n[' ]?aber|naptın|ne haber|naber kanka|naber dostum|"
    r"nasılsın|nslsn|"
    r"hey|hi|hello|hola|"
    r"günaydın|iyi günler|iyi akşamlar|iyi geceler|tünaydın|hayırlı (sabahlar|akşamlar|geceler)|"
    r"teşekkürler|teşekkür ederim|sağol(un)?|sağ ol(un)?|eyvallah|"
    r"tamam(dır)?|ok(ey)?|peki|oldu|anladım|"
    r"görüşürüz|hoşçakal|bay|bb"
    r")[\s\.\!\?]*$",
    re.IGNORECASE,
)


def _is_chitchat(msg: str) -> bool:
    """Çok kısa ve sohbet kalıbına oturan mesaj mı? (selam, nbr, ok, teşekkürler)"""
    text = (msg or "").strip()
    if not text or len(text) > 30:
        return False
    return bool(_CHITCHAT_RE.match(text))


# Intent → varsayılan specialist plan (paralel)
# 'sohbet' boş plan: graph dispatcher direkt aggregator'a düşer, RAG çağrılmaz.
_INTENT_PLAN = {
    "sohbet":      [],
    "general":     [("rag_search", True)],
    "hata_cozumu": [("rag_search", True), ("error_solver", False)],
    "rapor_arama": [("rag_search", True), ("zli_finder", False)],
    "n8n":         [("n8n_trigger", False), ("rag_search", True)],
    "dosya_qa":    [("rag_search", False)],
}


_CLASSIFIER_SYSTEM_FALLBACK = (
    "Sen bir intent sınıflandırıcısın. Kullanıcının mesajını okur ve şu "
    "kategorilerden birini seçersin:\n"
    "- general: tanımlama veya açık uçlu bilgi sorusu (ör. 'CS01 nedir', "
    "'MM modülü ne işe yarar', 'şu transaction'ı açıkla'). KOD geçse bile "
    "soru bir SORUN bildirimi değil tanıma talebi ise general.\n"
    "- hata_cozumu: Bir SİSTEM HATASI/ARIZA bildirimi. Kullanıcı 'şu hata "
    "veriyor', 'dump alıyor', 'çalışmıyor', 'ekran kilitlendi' gibi sorun "
    "ifadeleri kullanıyor. Sadece kod (ör. ME083) verilse bile bağlam bir "
    "SORUN tarifi olmalı.\n"
    "- rapor_arama: Z'li rapor (ZMM_, ZSD_), 'rapor bulamıyorum' tarzı "
    "rapor arama.\n"
    "- n8n: net bir otomasyon tetikleme isteği (toplantı kaydet, rapor "
    "gönder, görev oluştur).\n"
    "- dosya_qa: belirli bir dosya hakkında soru.\n\n"
    "SADECE şu JSON formatında cevap ver, başka HİÇBİR şey yazma:\n"
    '{"intent": "<kategori>", "needs_polish": <bool>, "reasoning": '
    '"<1-cümle-gerekçe>"}\n\n'
    "needs_polish: cevabın tonunun resmi/uzun olması gerekiyorsa true, "
    "kısa/teknik/JSON cevap için false."
)


# LLM classifier "hata_cozumu" döndürdüğünde gerçekten hata bildirimi mi
# diye doğrulamak için kullanılan keyword listesi.
_ERROR_KEYWORDS = (
    "hata veriyor", "hata alıyor", "hata mesajı", "hata kodu",
    "dump", "çalışmıyor", "kilitlendi", "çöktü", "patladı", "donuyor",
    "error", "exception", "şu hata", "bu hata", "yeni hata",
    "kayıt edilmiyor", "kaydedilmiyor", "açılmıyor", "kapanıyor",
    "girilmiyor", "yazmıyor", "vermiyor cevap",
)
_DEFINITION_RE = re.compile(
    r"\b(nedir|ne demek|ne işe yarar|ne yapar|nasıl çalışır|nasıl kullanılır|açıkla|tanımla|anlat|hakkında bilgi|nedirler)\b",
    re.IGNORECASE,
)


def _resolve_system_prompt(agent_config: dict | None) -> str:
    """DB'den prompt çek; yoksa kod fallback'ine düş."""
    if agent_config:
        prompt = (agent_config.get("prompt") or "").strip()
        if prompt:
            return prompt
    return _CLASSIFIER_SYSTEM_FALLBACK


def _strip_json_fence(text: str) -> str:
    """LLM'in ```json ... ``` ile sardığı çıktıdan saf JSON çıkarır."""
    t = (text or "").strip()
    m = re.search(r"\{[\s\S]*\}", t)
    return m.group(0) if m else t


async def _classify_with_llm(user_message: str, agent_config: dict | None = None) -> dict | None:
    """
    Küçük LLM çağrısı ile intent sınıflandırması. Hata olursa None döner;
    çağıran rule-based fallback'e düşer.

    `agent_config`: state.agent_configs üzerinden geçirilir. None ise
    eski davranışla DB'den çekmeye düşer (defansif).
    """
    try:
        if agent_config is None:
            try:
                agent_config = get_assigned_agent("supervisor")
            except Exception:
                pass

        # node_config: rule-only çalıştırmak isterse use_llm_classifier=false
        node_cfg = (agent_config or {}).get("node_config") or {}
        if node_cfg.get("use_llm_classifier") is False:
            return None

        messages = build_messages(
            system=_resolve_system_prompt(agent_config),
            history=None,
            user=user_message,
        )
        result = await call_llm(
            agent_config,
            messages,
            temperature=0.0,
            response_format="json_object",
            timeout=20.0,
        )
        raw = result.get("text") or ""
        parsed = json.loads(_strip_json_fence(raw))
        intent = (parsed.get("intent") or "").strip()
        if intent not in _VALID_INTENTS:
            return None

        reasoning = (parsed.get("reasoning") or "").strip()
        msg_lower = (user_message or "").lower()

        # Defensive override #1: LLM 'hata_cozumu' dedi ama mesaj bir TANIM sorusu
        # ve hata anahtar kelimesi yok → 'general'a düşür. Eski supervisor prompt'u
        # DB'de kaldıysa LLM 'CS01 nedir'i hala hata sanabilir.
        if intent == "hata_cozumu":
            has_error_kw = any(kw in msg_lower for kw in _ERROR_KEYWORDS)
            is_definition_q = bool(_DEFINITION_RE.search(msg_lower))
            if is_definition_q and not has_error_kw:
                logger.info(
                    "[supervisor] LLM hata_cozumu→general override (tanım sorusu, hata keyword yok)"
                )
                intent = "general"
                reasoning = "Tanım sorusu (hata keyword yok) — hata_cozumu'ndan general'a override."

        # Defensive override #2: LLM 'rapor_arama' dedi ama 'Z'li' / 'rapor' kelimeleri
        # geçmiyor — büyük ihtimal yine bir tanım sorusu. zli_finder'ı boş yere
        # tetikleyip {best_match: null, alternatives: []} JSON pass-through yapmasın.
        if intent == "rapor_arama":
            has_zli_signal = (
                "z'li" in msg_lower
                or "zli" in msg_lower
                or "rapor" in msg_lower
                or "transaction" in msg_lower
                or bool(re.search(r"\bz[a-z]{1,3}_", msg_lower))
            )
            is_definition_q = bool(_DEFINITION_RE.search(msg_lower))
            if not has_zli_signal or (is_definition_q and "rapor" not in msg_lower):
                logger.info(
                    "[supervisor] LLM rapor_arama→general override (Z'li sinyali yok veya tanım sorusu)"
                )
                intent = "general"
                reasoning = "Rapor sinyali yok — rapor_arama'dan general'a override."

        return {
            "intent": intent,
            "needs_polish": bool(parsed.get("needs_polish", False)),
            "reasoning": reasoning,
            "tokens": {
                "p": result.get("prompt_tokens", 0),
                "c": result.get("completion_tokens", 0),
            },
        }
    except Exception as e:
        logger.warning("[supervisor] LLM intent classification başarısız: %s", e)
        return None


def _rule_based_intent(user_message: str, has_file: bool) -> tuple[str, str]:
    """LLM yoksa basit kelime/regex eşleştirmesi.

    Önemli: 'CS01 nedir', 'FB60 ne işe yarar' gibi TANIM sorularını
    'hata_cozumu'na yönlendirmemek için question-pattern + error-keyword
    çakışması kontrol edilir. Sadece kod görmek hata anlamına gelmez.
    """
    msg = (user_message or "").lower()

    if has_file:
        return "dosya_qa", "Dosya bağlamı verilmiş → dosya QA modu."

    # Tanım/açıklama sorusu mu? (X nedir, X ne yapar, X nasıl çalışır, X'i açıkla)
    is_definition_q = bool(_DEFINITION_RE.search(msg))

    # Hata anahtar kelimeleri (gerçek arıza bildirimi sinyalleri)
    has_error_kw = any(kw in msg for kw in _ERROR_KEYWORDS)

    # SAP/sistem kodu paterni (CS01, FB60, ME083, MM02, vs.)
    has_sap_code = bool(re.search(r"\b[a-z]{1,3}\d{2,4}\b", msg))

    # Karar tablosu:
    # - Tanım sorusu varsa, kod olsa bile general (CS01 nedir → general)
    # - Tanım sorusu yok + hata keyword varsa → hata_cozumu
    # - Tanım sorusu yok + sadece kod (sorun bağlamı yok) → general (riskli kategorize etmektense bilgi ver)
    # - Tanım sorusu yok + hata keyword + kod → hata_cozumu (klasik 'FB60 hata veriyor')
    if has_error_kw:
        return "hata_cozumu", "Hata bildirimi anahtar kelimesi tespit edildi."

    # Z'li rapor paterni
    if "z'li" in msg or re.search(r"\bz[a-z]{1,3}_", msg) or any(
        kw in msg for kw in ("rapor bulamıyorum", "rapor lazım", "rapor arıyorum")
    ):
        return "rapor_arama", "Rapor arama anahtar kelimesi tespit edildi."

    # n8n otomasyon paterni
    if any(kw in msg for kw in ("toplantı kaydet", "rapor gönder",
                                 "görev oluştur", "bildirim gönder",
                                 "otomatik gönder", "tetikle")):
        return "n8n", "Bilinen otomasyon ifadesi tespit edildi."

    # Tanım sorusu veya sadece kod / belirsiz → general
    if is_definition_q:
        return "general", "Tanım/açıklama sorusu — bilgi tabanına bak."
    if has_sap_code:
        return "general", "Kod var ama hata bildirimi sinyali yok — tanım/bilgi sorusu olarak değerlendir."

    return "general", "Belirgin bir sinyal yok → genel sohbet."


def _plan_for_intent(intent: str) -> list[dict]:
    """Intent'e göre specialist listesini plan formatına çevirir."""
    nodes = _INTENT_PLAN.get(intent, _INTENT_PLAN["general"])
    return [
        {"node": name, "mode": "parallel", "optional": optional}
        for name, optional in nodes
    ]


async def supervisor_node(state: AgentState) -> dict:
    t0 = time.time()

    # Tüm graph rollerinin ajan konfigürasyonlarını bir kez yükle (request-scoped cache).
    # Specialist'ler ve aggregator state üzerinden okuyarak DB sorgularını azaltır.
    agent_configs: dict[str, dict] = {}
    try:
        agent_configs = await run_in_threadpool(get_all_assigned_agents)
    except Exception as e:
        logger.warning("[supervisor] agent_configs toplu yükleme başarısız: %s", e)

    # Cost cap kontrolü en başta — aşıldıysa hem supervisor LLM çağrısını
    # hem specialist'lerin LLM çağrılarını atla; aggregator boş plan ile
    # tetiklenip cap mesajını yayınlayacak.
    try:
        capped, cap_msg = await run_in_threadpool(check_cost_cap)
        if capped:
            elapsed_ms = int((time.time() - t0) * 1000)
            logger.warning("[supervisor] cost cap aşıldı, plan iptal edildi")
            return {
                "intent": "general",
                "plan": [],
                "plan_reasoning": "cost_cap_exceeded",
                "needs_polish": False,
                "cost_capped": True,
                "final_reply": cap_msg,
                "agent_configs": agent_configs,
                "nodes_executed": ["supervisor"],
                "node_timings": {"supervisor": elapsed_ms},
                "node_errors": {"supervisor": "cost_cap_exceeded"},
            }
    except Exception as e:
        logger.warning("[supervisor] cost cap kontrolü atlandı: %s", e)

    cmd = state.get("command")
    user_msg = state.get("user_message") or state.get("original_message") or ""
    has_file = bool(state.get("file_name"))
    tokens = {"p": 0, "c": 0}

    # 1) Hızlı aksiyon komutu varsa deterministik
    if cmd in _COMMAND_INTENT_MAP:
        intent = _COMMAND_INTENT_MAP[cmd]
        reasoning = f"Hızlı aksiyon '{cmd}' → intent='{intent}'."
        needs_polish = False  # JSON cevap, polish istemez
    elif _is_chitchat(user_msg):
        # Kısa sohbet (selam, nbr, teşekkürler, ok ...) — LLM classifier'a uğramadan
        # direkt sohbet moduna düş. Aggregator minimal prompt'la 1-2 cümle döner.
        intent = "sohbet"
        reasoning = "Kısa sohbet kalıbı tespit edildi → LLM atlandı."
        needs_polish = False
    elif has_file:
        intent = "dosya_qa"
        reasoning = f"file_name='{state['file_name']}' → dosya QA modu."
        needs_polish = True
    else:
        supervisor_cfg = agent_configs.get("supervisor")
        # 2) LLM tabanlı sınıflandırma (sıcak yol)
        llm_result = await _classify_with_llm(user_msg, supervisor_cfg)
        if llm_result:
            intent = llm_result["intent"]
            reasoning = f"LLM: {llm_result['reasoning']}"
            needs_polish = llm_result["needs_polish"]
            tokens = llm_result["tokens"]
        else:
            # 3) Rule-based fallback (node_config.fallback_to_rules ile devre dışı bırakılabilir)
            _cfg = (supervisor_cfg or {}).get("node_config") or {}
            if _cfg.get("fallback_to_rules", True):
                intent, reasoning = _rule_based_intent(user_msg, has_file)
                needs_polish = (intent == "general")
            else:
                intent = "general"
                reasoning = "LLM erişilemedi; rule-based fallback kapalı → general."
                needs_polish = True

    # JSON pass-through intent'lerinde polish ZORLA kapat — error_solver/zli_finder
    # yapılandırılmış JSON döner, msg_polish sonradan çalışırsa şemayı bozabilir
    # veya stream sonunda gereksiz LLM çağrısı + olası hata fırlatır. UI kartı
    # zaten bütün halinde gösteriyor, post-process'e gerek yok.
    if intent in ("hata_cozumu", "rapor_arama", "sohbet"):
        if needs_polish:
            logger.info(
                "[supervisor] intent=%s için needs_polish zorla False (JSON/sohbet pass-through)",
                intent,
            )
        needs_polish = False

    plan = _plan_for_intent(intent)
    elapsed_ms = int((time.time() - t0) * 1000)

    logger.info(
        "[supervisor] intent=%s plan=%s polish=%s (%d ms)",
        intent,
        [p["node"] for p in plan],
        needs_polish,
        elapsed_ms,
    )

    return {
        "intent": intent,
        "plan": plan,
        "plan_reasoning": reasoning,
        "needs_polish": needs_polish,
        "agent_configs": agent_configs,
        "nodes_executed": ["supervisor"],
        "node_timings": {"supervisor": elapsed_ms},
        "total_tokens": {"supervisor": tokens},
    }
