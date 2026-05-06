"""
nodes/error_solver.py
────────────────────────────────────────────────────────────────────
SAP/sistem hatalarını yapılandırılmış JSON çıktıyla çözümleyen uzman.

Mevcut akıştaki `command="error_solve"` davranışını birebir korur —
front-end aynı şemayı (`type: "error_solution"`) parse ediyor.

RAG bağlamı varsa (rag_search node'u paralel çalıştığında) onu da
prompt'a ekler ki çözüm önerileri kurum içi belgelere dayansın.

Çıktı:
    {
      "error_solution": {parsed_json},     # aggregator'ın UI'ya yansıttığı dict
      "error_draft":    "<json-string>",   # ham JSON metni (aggregator pass-through)
      "nodes_executed": ["error_solver"],
      "node_timings":   {"error_solver": ms},
      "total_tokens":   {"error_solver": {p, c}},
    }
"""

from __future__ import annotations

import json
import re
import time

from core.logger import get_logger
from core.db_bridge import get_assigned_agent
from ..state import AgentState, get_agent_config
from ..llm_adapter import call_llm, build_messages

logger = get_logger("agent_graph.error_solver")


_SYSTEM_BASE = (
    "Sen bir SAP & kurumsal sistem destek uzmanısın. Kullanıcının "
    "bildirdiği hatayı analiz eder, çözüm adımlarını üretirsin.\n\n"
    "[HATA ÇÖZÜMÜ MODU]\n"
    "Kullanıcının mesajı bir SAP/sistem hatası hakkında. "
    "Cevabını AŞAĞIDAKİ tek bir JSON kod bloğu olarak ver. "
    "JSON dışında HİÇBİR metin yazma. Eksik bilgi varsa ilgili alanı "
    "boş bırak veya tahmin etmeden makul varsayılan kullan.\n\n"
    "```json\n"
    "{\n"
    '  "type": "error_solution",\n'
    '  "id": "<hata_kodu_ör_ME083>",\n'
    '  "title": "<kısa_başlık>",\n'
    '  "module": "<SAP_modülü_ör_MM/PP/SD>",\n'
    '  "severity": "low|medium|high|critical",\n'
    '  "frequency": <int_geçmişte_kaç_kez_görüldü_bilinmiyorsa_0>,\n'
    '  "summary": "<1-2_cümle_genel_özet>",\n'
    '  "cause": "<hatanın_tespit_edilen_nedeni>",\n'
    '  "steps": [\n'
    '    {"title": "<adım_başlığı>", "tcode": "<varsa_T-kod>", "detail": "<detay>"}\n'
    "  ],\n"
    '  "docs": [{"name": "<dosya_adı>", "page": <int|null>}],\n'
    '  "similar": [{"code": "<hata_kodu>", "title": "<başlık>", "count": <int>}]\n'
    "}\n"
    "```"
)


def _strip_json_fence(text: str) -> str:
    t = (text or "").strip()
    # Önce ```json ... ``` bloğunu yakalamayı dene
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", t)
    if fence:
        return fence.group(1).strip()
    # Olmazsa ilk { ... } bloğunu döndür
    m = re.search(r"\{[\s\S]*\}", t)
    return m.group(0) if m else t


# SAP/sistem hata kodu paterni — kullanıcı mesajından çekmek için.
_CODE_RE = re.compile(r"\b([A-Z]{1,3}\d{2,4}|[A-Z]{2,4}_\d+)\b")


# Yetersiz bilgi tespiti için anahtar kelimeler (büyük/küçük harf duyarsız).
_ERROR_INFO_KEYWORDS = (
    "hata", "error", "dump", "exception", "çalışmıyor", "kilitlendi",
    "açılmıyor", "veriyor", "alıyor", "kaydedilmiyor", "girilmiyor",
    "bağlanamıyor", "donuyor", "yanıt vermiyor", "patladı", "çöktü",
)


# Aksiyon/bağlam sinyalleri — kullanıcı ne yapıyordu hakkında ipucu.
_ACTION_KEYWORDS = (
    "yaparken", "yapıyordum", "yapmaya çalışırken", "yapmaya çalıştığımda",
    "denedim", "deniyorum",
    "girdim", "girerken", "girmeye", "yazdım", "yazarken",
    "tıkladım", "tıklayınca", "tıklayınca", "tıklarken",
    "kaydederken", "kaydetmeye", "kaydet", "kaydedince",
    "açtım", "açarken", "açmaya", "açınca",
    "kapadım", "kapatırken",
    "doldururken", "doldurduğumda",
    "seçtim", "seçerken", "seçince",
    "onaylayınca", "onaylarken", "onayladığımda",
    "çalıştırdım", "çalıştırırken", "çalıştığımda",
    "girişimde", "girişinde",
    "fatura", "sipariş", "transferi", "kaydı",
)


def _has_enough_error_info(msg: str) -> bool:
    """Kullanıcının açıklaması bir çözüm üretmek için yeterli mi?

    Sıkı eşik — agent yüzeysel cevap vermek yerine kullanıcıya soru sorsun.
    Şu kombinasyonlardan biri gerekli:
        • ≥8 kelime VE en az 2 farklı sinyal {kod, hata-kw, aksiyon-kw}
        • ≥15 kelime VE en az 1 sinyal (uzun ve detaylı tarif kabul)
    Aksi halde clarification akışına yönlendirilir.
    """
    text = (msg or "").strip()
    words = text.split()
    if len(words) < 4:
        return False

    msg_lower = text.lower()
    has_code = bool(re.search(r"\b[a-z]{1,3}\d{2,4}\b", msg_lower))
    has_error_word = any(kw in msg_lower for kw in _ERROR_INFO_KEYWORDS)
    has_action = any(kw in msg_lower for kw in _ACTION_KEYWORDS)
    signals = sum([has_code, has_error_word, has_action])

    if len(words) >= 15 and signals >= 1:
        return True
    if len(words) >= 8 and signals >= 2:
        return True
    return False


_CLARIFICATION_SYSTEM = (
    "Sen 15+ yıllık deneyime sahip kıdemli bir SAP Basis/Fonksiyonel destek "
    "uzmanısın. Kullanıcı kısa ve eksik bir hata bildirimi yaptı.\n\n"
    "GÖREV: ROOT CAUSE analizi için tam olarak 4-5 KESKİN, DİAGNOSTİK soru sor.\n\n"
    "[KRİTİK KURALLAR]\n"
    "1. Her soruya tam olarak 4-5 SOMUT, BAĞLAMA ÖZGÜ şık yaz.\n"
    "2. Her soruda SON İKİ şık DAİMA şunlar olsun: \"Bilmiyorum\", \"Diğer\".\n"
    "   Yani options dizisi: [\"somut_1\", \"somut_2\", \"somut_3\", \"Bilmiyorum\", \"Diğer\"]\n"
    "3. Şıklar JENERİK değil, kullanıcının bildirdiği koda/duruma ÖZEL olsun.\n"
    "   Örnek: Kullanıcı 'FB60' diyorsa şıklar 'Vendor faturası girişinde', \n"
    "   'Posting key 31/40 seçiminde', 'Company code alanında' gibi FB60'a \n"
    "   özgü seçenekler olmalı.\n"
    "4. ÇÖZÜM ÖNERME. Sadece TANI sorusu sor.\n"
    "5. 'Şunu denedin mi?' tarzı sorular YASAK. 'Hata tam olarak hangi adımda "
    "çıkıyor?' tarzı diagnostic sorular sor.\n\n"
    "[SORU STRATEJİSİ — sırayla bu eksenlerden sor]\n"
    "Q1: Tam hata mesajı/dump metni ne diyor? (kullanıcıya somut seçenekler sun)\n"
    "Q2: Hangi adımda/alanda hata çıkıyor? (ekran, buton, alan bazlı şıklar)\n"
    "Q3: Bu işlem daha önce çalışıyor muydu? Ne değişti? (zaman, yetki, veri)\n"
    "Q4: Hangi organizasyon yapısıyla çalışıyorsun? (şirket kodu, tesis vs.)\n"
    "Q5: Başka kullanıcılar da aynı hatayı alıyor mu? (izolasyon)\n\n"
    "Kullanıcı bir SAP T-code verdiyse (ör. FB60, ME21N, VA01, MM01) soruları "
    "o transaction'ın altyapısına göre özelleştir. Kod yoksa genel SAP teşhis.\n\n"
    "SADECE aşağıdaki JSON formatında cevap ver, başka HİÇBİR metin yazma:\n"
    "```json\n"
    "{\n"
    '  "type": "error_solution",\n'
    '  "needs_clarification": true,\n'
    '  "id": "<kullanıcı_yazdıysa_SAP_kodu_yoksa_boş>",\n'
    '  "title": "Hatayı netleştirelim",\n'
    '  "module": "<varsa_modül_ör_FI/MM/SD>",\n'
    '  "severity": "medium",\n'
    '  "frequency": 0,\n'
    '  "summary": "<1_cümle_kullanıcının_bildirdiği_durumun_özeti>. <1_cümle_root_cause_için_neyi_bilmen_gerektiğini_belirt>",\n'
    '  "cause": "",\n'
    '  "clarification_questions": [\n'
    '    {\n'
    '      "id": "q1",\n'
    '      "question": "<KESKİN_DİAGNOSTİK_SORU>",\n'
    '      "options": ["<bağlama_özgü_şık_1>", "<bağlama_özgü_şık_2>", "<bağlama_özgü_şık_3>", "Bilmiyorum", "Diğer"],\n'
    '      "allow_other": true\n'
    '    }\n'
    "  ],\n"
    '  "steps": [], "docs": [], "similar": []\n'
    "}\n"
    "```"
)


# Kod fallback için (LLM erişilemezse) — generic, bağlama bağımsız sorular.
_GENERIC_CLARIFICATION_QUESTIONS = [
    {
        "id": "q1",
        "question": "Hata tam olarak hangi ekran/T-code'da ortaya çıktı?",
        "options": ["Liste/rapor ekranı", "Veri girişi ekranı", "Kaydet butonuna bastığımda", "Bilmiyorum", "Diğer"],
        "allow_other": True,
    },
    {
        "id": "q2",
        "question": "Ekranda gördüğünüz hata mesajı veya kodu neydi?",
        "options": ["Ekran bir hata kodu gösterdi", "Sadece 'hata oluştu' dedi", "Dump/short dump verdi", "Bilmiyorum", "Diğer"],
        "allow_other": True,
    },
    {
        "id": "q3",
        "question": "Bu işlem daha önce sorunsuz çalışıyor muydu?",
        "options": ["Evet, daha önce çalışıyordu", "Hayır, ilk kez deniyorum", "Bazen çalışıyor bazen hata veriyor", "Bilmiyorum", "Diğer"],
        "allow_other": True,
    },
    {
        "id": "q4",
        "question": "Hata sadece sizde mi yoksa başka kullanıcılar da alıyor mu?",
        "options": ["Sadece ben alıyorum", "Birden fazla kullanıcı da alıyor", "Tüm kullanıcılar alıyor", "Bilmiyorum", "Diğer"],
        "allow_other": True,
    },
    {
        "id": "q5",
        "question": "Son günlerde bu işlemle ilgili bir sistem değişikliği/yetki güncellemesi oldu mu?",
        "options": ["Evet, yetki değişikliği oldu", "Evet, transport/güncelleme taşındı", "Hayır, bildiğim bir değişiklik yok", "Bilmiyorum", "Diğer"],
        "allow_other": True,
    },
]


def _build_clarification_solution(user_msg: str) -> dict:
    """LLM erişilemediğinde fallback: generic seçmeceli clarification kartı."""
    code_match = _CODE_RE.search(user_msg or "")
    return {
        "type": "error_solution",
        "needs_clarification": True,
        "id": code_match.group(1) if code_match else "",
        "title": "Daha fazla bilgi gerekli",
        "module": "",
        "severity": "medium",
        "frequency": 0,
        "summary": (
            "Doğru çözüm üretebilmem için aşağıdaki sorulara cevap verir misin? "
            "Şıklardan birini seçebilir veya 'Diğer'i tıklayıp kendi cevabını yazabilirsin."
        ),
        "cause": "",
        "clarification_questions": list(_GENERIC_CLARIFICATION_QUESTIONS),
        "steps": [],
        "docs": [],
        "similar": [],
    }


async def _generate_clarification_with_llm(
    user_msg: str,
    agent_config: dict | None,
) -> dict | None:
    """LLM'le bağlama uygun seçmeceli clarification soruları üret.

    Hata olursa None döner; çağıran kod fallback'e (generic sorular) düşer.
    """
    try:
        messages = build_messages(
            system=_CLARIFICATION_SYSTEM,
            history=None,
            user=user_msg or "(boş)",
        )
        result = await call_llm(
            agent_config,
            messages,
            temperature=0.3,
            response_format="json_object",
            max_tokens=800,
            timeout=25.0,
        )
        raw = (result.get("text") or "").strip()
        parsed = json.loads(_strip_json_fence(raw))
        if (
            isinstance(parsed, dict)
            and parsed.get("type") == "error_solution"
            and parsed.get("needs_clarification") is True
            and isinstance(parsed.get("clarification_questions"), list)
            and len(parsed["clarification_questions"]) > 0
        ):
            # Eksik alanları doldur (defensive)
            parsed.setdefault("module", "")
            parsed.setdefault("severity", "medium")
            parsed.setdefault("frequency", 0)
            parsed.setdefault("title", "Daha fazla bilgi gerekli")
            parsed.setdefault("summary", "Birkaç sorum var.")
            parsed.setdefault("cause", "")
            parsed.setdefault("steps", [])
            parsed.setdefault("docs", [])
            parsed.setdefault("similar", [])
            if not parsed.get("id"):
                m = _CODE_RE.search(user_msg or "")
                parsed["id"] = m.group(1) if m else ""
            return parsed
    except Exception as e:
        logger.warning("[error_solver] LLM clarification başarısız: %s", e)
    return None


def _normalize_error_solution(parsed: dict | None, user_msg: str) -> dict:
    """error_solution şemasını eksiksiz hale getir.

    Bu, frontend `parseErrorSolution`'ın `"type": "error_solution"` alanını
    aramasını garanti eder ve eksik alanları (id/title/severity/...) makul
    varsayılanlarla doldurur. ErrorSolutionCard'ın hep render edilebilmesi için.
    """
    p = dict(parsed or {})
    p["type"] = "error_solution"

    if not p.get("id"):
        m = _CODE_RE.search(user_msg or "")
        p["id"] = m.group(1) if m else ""

    if not p.get("title"):
        # Mesajın ilk anlamlı kısmını başlık olarak al
        snippet = (user_msg or "").strip().split("\n", 1)[0][:80]
        p["title"] = snippet or "Hata Çözümü"

    p.setdefault("module", "")
    p.setdefault("severity", "medium")
    p.setdefault("frequency", 0)
    p.setdefault("summary", (user_msg or "")[:240])
    p.setdefault("cause", "")
    p.setdefault("steps", [])
    p.setdefault("docs", [])
    p.setdefault("similar", [])
    return p


async def error_solver_node(state: AgentState) -> dict:
    t0 = time.time()
    user_msg = state.get("user_message") or state.get("original_message") or ""
    rag_ctx = state.get("rag_context") or ""

    # "Hata Çözümü" hızlı aksiyonu açıkça tıklandıysa şemayı zorla doldur
    # (UI ErrorSolutionCard her zaman render etmeli). Doğal sınıflandırmadan
    # gelen turlarda LLM şemaya uymazsa draft yazma → aggregator doğal dilde
    # cevap üretsin.
    explicit_command = state.get("command") == "error_solve"

    agent_config = get_agent_config(state, "error_solver")
    if agent_config is None:
        try:
            agent_config = get_assigned_agent("error_solver")
        except Exception:
            pass

    # Yetersiz bilgi tespiti — quick action OLSUN OLMASIN, mesaj çözüm
    # üretmeye yetmiyorsa clarification kartını döndür. "hata aldım" gibi
    # 2-3 kelimelik turlarda LLM null-filled şema üretiyordu; kart boş
    # görünüyordu. Artık erkenden seçmeceli sorular gönderiyoruz.
    if not _has_enough_error_info(user_msg):
        clarification = await _generate_clarification_with_llm(user_msg, agent_config)
        used_fallback = clarification is None
        if clarification is None:
            clarification = _build_clarification_solution(user_msg)
        elapsed_ms = int((time.time() - t0) * 1000)
        logger.info(
            "[error_solver] clarification (%s) → %d soru, explicit_cmd=%s, %d ms",
            "fallback" if used_fallback else "llm",
            len(clarification.get("clarification_questions") or []),
            explicit_command, elapsed_ms,
        )
        return {
            "error_solution": clarification,
            "error_draft": json.dumps(clarification, ensure_ascii=False),
            "nodes_executed": ["error_solver"],
            "node_timings": {"error_solver": elapsed_ms},
        }

    # DB'den prompt çek; yoksa kod fallback'ini kullan.
    system_prompt = ((agent_config or {}).get("prompt") or "").strip() or _SYSTEM_BASE
    negative = ((agent_config or {}).get("negative_prompt") or "").strip()
    if negative:
        system_prompt += f"\n\n[KESİNLİKLE YAPMAMAN GEREKENLER]\n{negative}"

    node_cfg = (agent_config or {}).get("node_config") or {}
    use_rag_context = node_cfg.get("use_rag_context", True)

    # Sistem prompt'una RAG bağlamı varsa ekle (node_config ile kapatılabilir)
    system = system_prompt
    if rag_ctx and use_rag_context:
        system += (
            "\n\n[BİLGİ TABANI BAĞLAMI]\n"
            "Aşağıdaki kurum içi belge alıntılarını çözüm adımlarını ve "
            "`docs` alanını üretirken kullan. Çelişen bilgi varsa belgeyi "
            "esas al.\n\n" + rag_ctx
        )

    try:
        temperature = (agent_config or {}).get("temperature", 0.2)
        max_tokens = (agent_config or {}).get("max_tokens") or None
        messages = build_messages(system=system, history=None, user=user_msg)
        result = await call_llm(
            agent_config,
            messages,
            temperature=temperature,
            response_format="json_object",
            max_tokens=max_tokens,
            timeout=45.0,
        )
        raw = (result.get("text") or "").strip()
        elapsed_ms = int((time.time() - t0) * 1000)

        parsed: dict | None = None
        try:
            parsed = json.loads(_strip_json_fence(raw))
        except Exception as pe:
            logger.warning("[error_solver] JSON parse başarısız: %s", pe)

        # Şema uyum kontrolü: 'type=error_solution' VE en az bir anlamlı
        # alan dolu olmalı. LLM null-filled şema üretirse (her şeyi null/boş
        # bırakıp sadece type set ederse) bu kart kullanıcıya boş görünür —
        # geçersiz sayıyoruz.
        def _has_real_content(p: dict | None) -> bool:
            if not p:
                return False
            if (p.get("title") or "").strip():
                return True
            if (p.get("summary") or "").strip():
                return True
            if (p.get("cause") or "").strip():
                return True
            if isinstance(p.get("steps"), list) and len(p["steps"]) > 0:
                return True
            return False

        has_valid_schema = bool(
            parsed
            and parsed.get("type") == "error_solution"
            and _has_real_content(parsed)
        )

        logger.info(
            "[error_solver] parsed=%s, schema_ok=%s, explicit_cmd=%s, %d ms",
            bool(parsed), has_valid_schema, explicit_command, elapsed_ms,
        )

        out: dict = {
            "model_used": result.get("model", ""),
            "provider_used": result.get("provider", ""),
            "nodes_executed": ["error_solver"],
            "node_timings": {"error_solver": elapsed_ms},
            "total_tokens": {"error_solver": {
                "p": result.get("prompt_tokens", 0),
                "c": result.get("completion_tokens", 0),
            }},
        }

        if explicit_command:
            # Quick action: kart her zaman render olsun → şemayı zorla doldur.
            normalized = _normalize_error_solution(parsed, user_msg)
            out["error_solution"] = normalized
            out["error_draft"] = json.dumps(normalized, ensure_ascii=False)
        elif has_valid_schema:
            # Doğal sınıflandırma + LLM şemaya uydu → pass-through.
            out["error_solution"] = parsed
            out["error_draft"] = raw
        # else: aggregator LLM çağrısına bırak (boş JSON pass-through olmasın)

        return out

    except Exception as e:
        elapsed_ms = int((time.time() - t0) * 1000)
        logger.error("[error_solver] hata: %s", e, exc_info=True)
        out: dict = {
            "nodes_executed": ["error_solver"],
            "node_timings": {"error_solver": elapsed_ms},
            "node_errors": {"error_solver": str(e)},
        }
        if explicit_command:
            # LLM erişilemese bile UI kart bekliyor — minimal şema üret.
            normalized = _normalize_error_solution(None, user_msg)
            normalized["summary"] = (
                f"LLM erişilemedi. Hata kodunu/mesajını manuel inceleyin: "
                f"{(user_msg or '')[:200]}"
            )
            out["error_solution"] = normalized
            out["error_draft"] = json.dumps(normalized, ensure_ascii=False)
        return out
