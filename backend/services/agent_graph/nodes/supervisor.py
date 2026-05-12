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


# ── Hazır cevap DB cache (60 sn TTL) ────────────────────────────────────────
import time as _time

_CANNED_CACHE: list[dict] | None = None
_CANNED_CACHE_TS: float = 0.0
_CANNED_TTL = 60.0


def invalidate_canned_cache() -> None:
    """settings.py POST endpoint'i kayıt sonrası çağırır."""
    global _CANNED_CACHE, _CANNED_CACHE_TS
    _CANNED_CACHE = None
    _CANNED_CACHE_TS = 0.0


def _load_canned_from_db() -> list[dict]:
    global _CANNED_CACHE, _CANNED_CACHE_TS
    now = _time.time()
    if _CANNED_CACHE is not None and (now - _CANNED_CACHE_TS) < _CANNED_TTL:
        return _CANNED_CACHE
    try:
        from database.sql.session import get_session
        from database.sql.models import SistemAyari
        from sqlalchemy import select
        with get_session() as db:
            row = db.scalar(select(SistemAyari).where(SistemAyari.anahtar == "hazir_cevaplar"))
            _CANNED_CACHE = row.deger if row and isinstance(row.deger, list) else []
    except Exception as e:
        logger.debug("[supervisor] hazir_cevaplar DB okunamadı: %s", e)
        _CANNED_CACHE = _CANNED_CACHE or []
    _CANNED_CACHE_TS = now
    return _CANNED_CACHE


def _check_db_canned(msg: str) -> str | None:
    """DB'deki aktif kayıtlarda eşleşen trigger varsa cevabı döner."""
    normalized = (msg or "").strip().lower()
    for item in _load_canned_from_db():
        if not item.get("active", True):
            continue
        for trigger in (item.get("triggers") or []):
            if normalized == trigger.strip().lower():
                return item.get("response") or ""
    return None


# Geçerli intent değerleri (LLM classifier çıktısı için — 'sohbet' deterministik fast-path)
_VALID_INTENTS = {"general", "serbest", "hata_cozumu", "rapor_arama", "n8n", "dosya_qa", "skill_query"}

# Komut → intent (deterministik)
_COMMAND_INTENT_MAP = {
    "error_solve":              "hata_cozumu",
    "clarification_continue":   "hata_cozumu_devam",   # tur devamı — sadece error_solver
    "zli_report_query":         "rapor_arama",
    "parca_suresi_hesapla":     "general",
    "summarize":                "general",
    "bpmn_analyze":             "general",
    "extract_tables":           "general",
    "gen_questions":            "general",
    "action_items":             "general",
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
    """Çok kısa ve sohbet kalıbına oturan mesaj mı?
    Önce regex fast-path, ardından DB trigger listesi."""
    text = (msg or "").strip()
    if not text or len(text) > 60:
        return False
    if bool(_CHITCHAT_RE.match(text)):
        return True
    # DB'deki aktif trigger'larla eşleşiyor mu?
    return _check_db_canned(text) is not None


def _canned_chitchat(msg: str) -> str:
    """Chitchat için LLM çağrısı yapmadan hazır cevap üret.
    Önce DB kayıtlarını kontrol eder, eşleşme yoksa hardcoded fallback'e düşer."""
    db_resp = _check_db_canned(msg)
    if db_resp:
        return db_resp

    # Hardcoded fallback (DB'de hiç kayıt yoksa devreye girer)
    m = (msg or "").strip().lower().rstrip(".!? ")
    if re.match(r"(selam|merhaba|mrb|slm|hey|hi|hello|hola|günaydın|iyi günler|iyi akşamlar|iyi geceler|tünaydın|hayırlı)", m):
        return "Merhaba! Nasıl yardımcı olabilirim?"
    if re.match(r"(teşekkür|sağol|eyvallah)", m):
        return "Rica ederim! Başka bir konuda yardımcı olabilir miyim?"
    if re.match(r"(görüşürüz|hoşçakal|bay|bb)", m):
        return "Güle güle! İyi çalışmalar."
    if re.match(r"(naber|nbr|n[' ]?aber|naptın|ne haber|nasılsın|nslsn)", m):
        return "İyiyim, teşekkürler! Nasıl yardımcı olabilirim?"
    if re.match(r"(tamam|ok|peki|oldu|anladım)", m):
        return "Anlaşıldı! Başka yardımcı olabileceğim bir konu var mı?"
    return "Peki! Başka bir konuda yardımcı olabilir miyim?"


# Intent → varsayılan specialist plan (paralel)
# 'sohbet' boş plan: supervisor canned cevap set eder, aggregator LLM çağırmaz.
# 'serbest' boş plan: aggregator LLM çağırır ama RAG yok (genel bilgi soruları).
# 'general' RAG açık: şirkete/SAP'a özgü domain soruları.
_INTENT_PLAN = {
    "sohbet":           [],
    "serbest":          [],
    "general":          [("rag_search", True)],
    "hata_cozumu":      [("rag_search", True), ("error_solver", False)],
    "hata_cozumu_devam":[("error_solver", False)],  # clarification devamı — RAG atla
    "rapor_arama":      [("rag_search", True), ("zli_finder", False)],
    "n8n":              [("n8n_trigger", False), ("rag_search", True)],
    "dosya_qa":         [("rag_search", False)],
    "skill_query":      [("skill_reader", False)],
}


_CLASSIFIER_SYSTEM_FALLBACK = (
    "Sen bir intent sınıflandırıcısın. Kullanıcının mesajını okur ve şu "
    "kategorilerden birini seçersin:\n\n"
    "- general: Şirkete, iş süreçlerine, prosedürlere, politikalara, SAP'a veya "
    "şirket bilgi tabanındaki herhangi bir konuya ilişkin soru. SAP transaction kodu "
    "(CS01, FB60, ME083...), SAP modülü (MM, SD, FI, CO, PP, HR, PM...), "
    "iş süreci, BPMN akışı, kurumsal sistem, insan kaynakları, finans, bütçe, "
    "izin, görevlendirme, tedarik veya diğer kurumsal konular dahildir. "
    "Belirsiz durumlarda bu kategoriyi seç — bilgi tabanında aranması zararsız.\n"
    "- serbest: AÇIKÇA genel bilgi/teknoloji sorusu; Python, Java, matematik, "
    "fizik, tarih, coğrafya, internet teknolojileri gibi konular ve şirkete "
    "HİÇBİR bağlantısı olmayan sorular. Bilgi tabanı aramasına gerek yok.\n"
    "- hata_cozumu: Bir SİSTEM HATASI/ARIZA bildirimi. Kullanıcı 'şu hata "
    "veriyor', 'dump alıyor', 'çalışmıyor', 'ekran kilitlendi' gibi sorun "
    "ifadeleri kullanıyor. Sadece kod (ör. ME083) verilse bile bağlam bir "
    "SORUN tarifi olmalı.\n"
    "- rapor_arama: Z'li rapor (ZMM_, ZSD_), 'rapor bulamıyorum' tarzı "
    "rapor arama.\n"
    "- n8n: net bir otomasyon tetikleme isteği (toplantı kaydet, rapor "
    "gönder, görev oluştur).\n"
    "- dosya_qa: belirli bir dosya hakkında soru.\n"
    "- skill_query: sistemin yetenekleri, araçları veya nasıl kullanıldığı hakkında "
    "soru (ör. 'neler yapabilirsin', 'hangi özelliklerin var', 'bana nasıl yardım edersin').\n\n"
    "KARAR KURALI: Açıkça genel bilgi sorusu (Python, matematik, tarih vs.) ise → serbest. "
    "Şirkete/iş süreçlerine ilişkin olabilecek her türlü soru → general. "
    "Belirsiz → general (bilgi tabanını aramak her zaman güvenli). "
    "Sistem yetenekleri sorusuysa → skill_query.\n\n"
    "SADECE şu JSON formatında cevap ver, başka HİÇBİR şey yazma:\n"
    '{"intent": "<kategori>", "confidence": 0.0-1.0, "complexity": "low|medium|high", '
    '"needs_polish": <bool>, "reasoning": "<1-cümle-gerekçe>"}\n\n'
    "confidence: sınıflandırma güven skoru (0.8+ → eminsin, 0.5–0.8 → belirsiz, <0.5 → çok belirsiz).\n"
    "complexity: low=kısa/basit soru, medium=açıklama/adım gerektiriyor, high=çok boyutlu analiz.\n"
    "needs_polish: cevabın tonunun resmi/uzun olması gerekiyorsa true, "
    "kısa/teknik/JSON cevap için false."
)


# LLM classifier "hata_cozumu" döndürdüğünde gerçekten hata bildirimi mi
# diye doğrulamak için kullanılan keyword listesi.
_ERROR_KEYWORDS = (
    # tam formlar
    "hata veriyor", "hata alıyor", "hata mesajı", "hata kodu",
    "dump", "çalışmıyor", "kilitlendi", "çöktü", "patladı", "donuyor",
    "error", "exception", "şu hata", "bu hata", "yeni hata",
    "kayıt edilmiyor", "kaydedilmiyor", "açılmıyor", "kapanıyor",
    "girilmiyor", "yazmıyor", "vermiyor cevap",
    # Türkçe çekim ekleri — "hatası alıyorum", "hatasını", "hatayı alıyorum"
    "hatası alıyor", "hatayı alıyor", "hata alıyorum", "hata alıyoruz",
    "hata çıkıyor", "hata geliyor", "hata fırlatıyor",
    "dump alıyor", "dump veriyor", "crash", "çalışmıyor",
)
_DEFINITION_RE = re.compile(
    r"\b(nedir|ne demek|ne işe yarar|ne yapar|nasıl çalışır|nasıl kullanılır|açıkla|tanımla|anlat|hakkında bilgi|nedirler)\b",
    re.IGNORECASE,
)

# Açıkça genel bilgi alanları — SAP/şirketle bağlantısı olmayan tanım soruları
_GENERIC_KNOWLEDGE_RE = re.compile(
    r"\b(python|java|javascript|typescript|html|css|sql|linux|ubuntu|windows|android|ios|"
    r"matematik|fizik|kimya|biyoloji|tarih|coğrafya|felsefe|psikoloji|sosyoloji|"
    r"excel|word|powerpoint|outlook|teams|"
    r"internet|wifi|bluetooth|gpu|cpu|ram|router|vpn|"
    r"ingilizce|fransızca|almanca|ispanyolca|italyanca|rusça|arapça|"
    r"yapay\s+zeka|makine\s+öğrenimi|derin\s+öğrenme|neural\s+network|"
    r"blockchain|kripto|bitcoin)\b",
    re.IGNORECASE,
)

# Türkçe çekimli hata ifadeleri — "ME083 hatası alıyorum", "şu hatayı alıyor"
# \w* → hatası / hatayı / hatasını / hatadan gibi tüm çekim eklerini yakalar
_ERROR_PATTERN_RE = re.compile(
    r"\bhata\w*\s+(alıyor|alıyorum|alıyoruz|veriyor|veriyor|çıkıyor|geliyor|aldım|verdim|çıktı)"
    r"|\b(dump|crash)\b"
    r"|\b(sistem|ekran|uygulama|modül)\s+(çöktü|kilitlendi|dondu|çalışmıyor)\b",
    re.IGNORECASE,
)


def _resolve_system_prompt(agent_config: dict | None) -> str:
    """DB'den prompt çek; önce agent config, sonra prompt_template tablosu, son olarak kod fallback'i."""
    if agent_config:
        prompt = (agent_config.get("prompt") or "").strip()
        if prompt:
            return prompt
    from core.prompts import _get_prompt_template
    return _get_prompt_template("supervisor_classifier", _CLASSIFIER_SYSTEM_FALLBACK)


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

        raw_confidence = parsed.get("confidence", 0.8)
        try:
            confidence = float(raw_confidence)
        except (TypeError, ValueError):
            confidence = 0.8
        confidence = max(0.0, min(1.0, confidence))

        raw_complexity = (parsed.get("complexity") or "medium").strip().lower()
        if raw_complexity not in ("low", "medium", "high"):
            raw_complexity = "medium"

        return {
            "intent": intent,
            "confidence": confidence,
            "complexity": raw_complexity,
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


_SAP_MODULES_RE = re.compile(
    r"\b(mm|sd|fi|co|cs|pp|hr|pm|qm|wm|ps|sm|re|tr|bc|basis|abap|bapi|idoc|smartform|sap)\b",
    re.IGNORECASE,
)
_SAP_CODE_RE = re.compile(r"\b[a-z]{1,3}\d{2,4}\b", re.IGNORECASE)


def _has_domain_signal(msg: str) -> bool:
    """SAP/kurumsal bağlam sinyali var mı? Varsa RAG açık (general), yoksa RAG kapalı (serbest)."""
    return bool(_SAP_CODE_RE.search(msg)) or bool(_SAP_MODULES_RE.search(msg))


def _rule_based_intent(user_message: str, has_file: bool) -> tuple[str, str]:
    """LLM yoksa basit kelime/regex eşleştirmesi.

    Önemli: 'CS01 nedir', 'FB60 ne işe yarar' gibi TANIM sorularını
    'hata_cozumu'na yönlendirmemek için question-pattern + error-keyword
    çakışması kontrol edilir. Sadece kod görmek hata anlamına gelmez.
    """
    msg = (user_message or "").lower()

    if has_file:
        return "dosya_qa", "Dosya bağlamı verilmiş → dosya QA modu."

    # Hata anahtar kelimeleri (gerçek arıza bildirimi sinyalleri)
    has_error_kw = (
        any(kw in msg for kw in _ERROR_KEYWORDS)
        or bool(_ERROR_PATTERN_RE.search(msg))
    )

    # Tanım/açıklama sorusu mu? (X nedir, X ne yapar, X nasıl çalışır, X'i açıkla)
    is_definition_q = bool(_DEFINITION_RE.search(msg))

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

    # Sistem yeteneği sorgulama
    if any(kw in msg for kw in (
        "neler yapabilirsin", "ne yapabilirsin", "hangi özellik", "yeteneklerin",
        "nasıl yardım", "ne biliyorsun", "skill", "özelliğin", "araçların",
        "hakkında anlat", "tanıtır mısın", "nasıl çalışıyorsun",
    )):
        return "skill_query", "Sistem yeteneği sorgulama tespit edildi."

    # Domain sinyali varsa (SAP kodu, SAP modülü) → bilgi tabanına bak (general)
    if _has_domain_signal(msg):
        return "general", "SAP/domain sinyali tespit edildi — bilgi tabanına bak."

    # Açıkça genel bilgi sorusu (teknoloji, fen, coğrafya, tarih, matematik...)
    # ve SAP/şirkete özgü hiçbir bağlam yok → serbest
    if is_definition_q and _GENERIC_KNOWLEDGE_RE.search(msg):
        return "serbest", "Açıkça genel bilgi/teknoloji sorusu — RAG atla."

    # SAP dışı şirket belgesi (HR, finans, prosedür) olabilir — taramak zararsız
    return "general", "Belirgin sinyal yok → bilgi tabanı aramasını dene."


def _make_plan_briefs(intent: str, user_msg: str, plan: list[dict], cmd: str | None = None) -> dict[str, str]:
    """Her specialist node için kısa odak talimatı üretir (rule-based, sıfır LLM maliyeti)."""
    msg_snippet = (user_msg or "")[:120].strip()
    briefs: dict[str, str] = {}
    for item in plan:
        node = item.get("node", "")
        if node == "rag_search":
            if cmd == "parca_suresi_hesapla":
                briefs[node] = (
                    f"Parça süresi / operasyon süresi hesaplama isteği: «{msg_snippet}». "
                    "Operasyon süreleri, setup zamanları, işlem süresi tabloları, "
                    "iş emri süre verileri ve ilgili SAP üretim kayıtlarını ara."
                )
            else:
                briefs[node] = (
                    f"Şu soruyla ilgili bilgi tabanında ara: «{msg_snippet}». "
                    "Doğrudan ilgili paragrafları ve sayfa numaralarını döndür."
                )
        elif node == "error_solver":
            briefs[node] = (
                f"Şu hatayı analiz et: «{msg_snippet}». "
                "Hata kodunu tespit et, adım adım çözüm öner, ilgili T-kodu ekle."
            )
        elif node == "zli_finder":
            briefs[node] = (
                f"Şu isteğe uygun Z'li rapor bul: «{msg_snippet}». "
                "En iyi eşleşen rapor kodunu ve kısa açıklamasını döndür."
            )
        elif node == "n8n_trigger":
            briefs[node] = (
                f"Şu otomasyon isteğini tetikle: «{msg_snippet}». "
                "Uygun workflow'u seç ve parametreleri doldur."
            )
        elif node == "skill_reader":
            briefs[node] = (
                f"Sistemin yeteneklerini ve araçlarını özetle. "
                f"Kullanıcı şunu sordu: «{msg_snippet}»"
            )
    return briefs


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
                "intent_confidence": 1.0,
                "complexity": "low",
                "plan": [],
                "plan_briefs": {},
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
    intent_confidence = 1.0
    complexity = "low"

    # 1) Hızlı aksiyon komutu varsa deterministik
    if cmd in _COMMAND_INTENT_MAP:
        intent = _COMMAND_INTENT_MAP[cmd]
        reasoning = f"Hızlı aksiyon '{cmd}' → intent='{intent}'."
        needs_polish = False  # JSON cevap, polish istemez
        complexity = "medium"
    elif _is_chitchat(user_msg):
        # Kısa sohbet (selam, nbr, teşekkürler, ok ...) — LLM çağrısı hiç yapılmaz.
        # Supervisor hazır cevabı final_reply'a yazar; aggregator LLM atlar.
        intent = "sohbet"
        reasoning = "Kısa sohbet kalıbı tespit edildi → LLM atlandı, hazır cevap."
        needs_polish = False
        elapsed_ms = int((time.time() - t0) * 1000)
        logger.info("[supervisor] chitchat fast-path → canned response (%d ms)", elapsed_ms)
        return {
            "intent": "sohbet",
            "intent_confidence": 1.0,
            "complexity": "low",
            "plan": [],
            "plan_briefs": {},
            "plan_reasoning": reasoning,
            "needs_polish": False,
            "final_reply": _canned_chitchat(user_msg),
            "agent_configs": agent_configs,
            "nodes_executed": ["supervisor"],
            "node_timings": {"supervisor": elapsed_ms},
            "total_tokens": {"supervisor": {"p": 0, "c": 0}},
        }
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
            intent_confidence = llm_result.get("confidence", 0.8)
            complexity = llm_result.get("complexity", "medium")
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
    if intent in ("hata_cozumu", "hata_cozumu_devam", "rapor_arama", "sohbet", "serbest"):
        if needs_polish:
            logger.info(
                "[supervisor] intent=%s için needs_polish zorla False (JSON/sohbet/serbest pass-through)",
                intent,
            )
        needs_polish = False

    plan = _plan_for_intent(intent)
    plan_briefs = _make_plan_briefs(intent, user_msg, plan, cmd=cmd)
    elapsed_ms = int((time.time() - t0) * 1000)

    logger.info(
        "[supervisor] intent=%s conf=%.2f complexity=%s plan=%s polish=%s (%d ms)",
        intent, intent_confidence, complexity,
        [p["node"] for p in plan],
        needs_polish,
        elapsed_ms,
    )

    return {
        "intent": intent,
        "intent_confidence": intent_confidence,
        "complexity": complexity,
        "plan": plan,
        "plan_briefs": plan_briefs,
        "plan_reasoning": reasoning,
        "needs_polish": needs_polish,
        "agent_configs": agent_configs,
        "nodes_executed": ["supervisor"],
        "node_timings": {"supervisor": elapsed_ms},
        "total_tokens": {"supervisor": tokens},
    }
