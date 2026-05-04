"""
seed_graph_agents.py
────────────────────────────────────────────────────────────────────
LG.7 — Graph node ajanlarını DB'ye seed eder.

Her graph node için bir AIAgent kaydı oluşturulur. Eski legacy ajanlar
(chatbot, msg_bot, action_bot) soft-delete edilir (aktif_mi=false);
fiziksel olarak silinmez — rollback emniyeti için 1-2 hafta bekletilir.

İlk açılışta (idempotent) çalışır; mevcut kayıt varsa dokunmaz.
"""

from __future__ import annotations

import datetime
import logging

logger = logging.getLogger("seed_graph_agents")


# ─── Seed kayıtları ───────────────────────────────────────────────────────────

GRAPH_AGENTS = [
    {
        "kimlik": "sys_node_supervisor",
        "agent_kind": "graph_node",
        "ad": "Supervisor (Intent Sınıflandırıcı)",
        "persona": "LangGraph orkestrasyon beyni",
        "prompt": (
            "Sen bir intent sınıflandırıcısın. Kullanıcının mesajını okur ve şu "
            "kategorilerden birini seçersin:\n"
            "- general: genel sohbet, tanımlama, açık uçlu soru\n"
            "- hata_cozumu: SAP/sistem hata kodu (ör. ME083, FB60), 'şu hata "
            "veriyor', 'çalışmıyor' tarzı arıza/destek mesajı\n"
            "- rapor_arama: Z'li rapor (ZMM_, ZSD_), 'rapor bulamıyorum' tarzı "
            "rapor/transaction arama\n"
            "- n8n: net bir otomasyon tetikleme isteği (toplantı kaydet, rapor "
            "gönder, görev oluştur)\n"
            "- dosya_qa: belirli bir dosya hakkında soru\n\n"
            "SADECE şu JSON formatında cevap ver, başka HİÇBİR şey yazma:\n"
            '{"intent": "<kategori>", "needs_polish": <bool>, "reasoning": '
            '"<1-cümle-gerekçe>"}\n\n'
            "needs_polish: cevabın tonunun resmi/uzun olması gerekiyorsa true, "
            "kısa/teknik/JSON cevap için false."
        ),
        "negative_prompt": "JSON dışında metin yazma. Açıklama yapma.",
        "provider": "openai",
        "model": "gpt-4o",
        "temperature": 0.0,
        "max_tokens": 256,
        "strict_fact_check": False,
        "chat_history_length": 0,
        "can_ask_follow_up": False,
        "node_config": {
            "use_llm_classifier": True,
            "fallback_to_rules": True,
        },
    },
    {
        "kimlik": "sys_node_rag_search",
        "agent_kind": "graph_node",
        "ad": "RAG Arama (Hibrit)",
        "persona": "Bilgi tabanı arama uzmanı",
        "prompt": "(LLM çağrısı yapmaz; bu kayıt yalnızca node-specific ayarları tutar.)",
        "negative_prompt": None,
        "provider": "openai",
        "model": "n/a",
        "temperature": 0.0,
        "max_tokens": 0,
        "strict_fact_check": False,
        "chat_history_length": 0,
        "can_ask_follow_up": False,
        "allowed_rags": ["rag_1", "rag_2"],
        "node_config": {
            "top_k": 10,
            "score_threshold": 0.05,
            "expand_chunk_graph": True,
        },
    },
    {
        "kimlik": "sys_node_error_solver",
        "agent_kind": "graph_node",
        "ad": "Hata Çözücü (SAP/Sistem)",
        "persona": "SAP destek uzmanı",
        "prompt": (
            "Sen bir SAP & kurumsal sistem destek uzmanısın. Kullanıcının bildirdiği "
            "hatayı analiz eder, çözüm adımlarını yapılandırılmış JSON formatında "
            "üretirsin.\n\n"
            "[HATA ÇÖZÜMÜ MODU]\n"
            "Cevabını AŞAĞIDAKİ tek bir JSON kod bloğu olarak ver. JSON dışında "
            "HİÇBİR metin yazma. Eksik bilgi varsa ilgili alanı boş bırak.\n\n"
            "```json\n"
            "{\n"
            '  "type": "error_solution",\n'
            '  "id": "<hata_kodu>",\n'
            '  "title": "<kısa_başlık>",\n'
            '  "module": "<SAP_modülü>",\n'
            '  "severity": "low|medium|high|critical",\n'
            '  "frequency": <int>,\n'
            '  "summary": "<özet>",\n'
            '  "cause": "<neden>",\n'
            '  "steps": [{"title": "...", "tcode": "...", "detail": "..."}],\n'
            '  "docs": [{"name": "...", "page": <int|null>}],\n'
            '  "similar": [{"code": "...", "title": "...", "count": <int>}]\n'
            "}\n"
            "```"
        ),
        "negative_prompt": "Tahmin yapma; bilmediğin alanı boş bırak. JSON dışı metin yazma.",
        "provider": "openai",
        "model": "gpt-4o",
        "temperature": 0.2,
        "max_tokens": 1500,
        "strict_fact_check": True,
        "chat_history_length": 0,
        "can_ask_follow_up": False,
        "node_config": {
            "use_rag_context": True,
            "output_schema_version": 1,
        },
    },
    {
        "kimlik": "sys_node_zli_finder",
        "agent_kind": "graph_node",
        "ad": "Z'li Rapor Bulucu",
        "persona": "ABAP rapor uzmanı",
        "prompt": (
            "Sen Z'li rapor (özelleştirilmiş ABAP raporu) sorgusu uzmanısın. "
            "SQL'den gelen aday raporlar arasından en uygun olanı ve alternatifleri "
            "seçersin. Eşleşme yoksa best_match=null ver. SADECE JSON döndür."
        ),
        "negative_prompt": "JSON dışı metin yazma.",
        "provider": "openai",
        "model": "gpt-4o",
        "temperature": 0.0,
        "max_tokens": 800,
        "strict_fact_check": True,
        "chat_history_length": 0,
        "can_ask_follow_up": False,
        "node_config": {
            "sql_match_limit": 5,
            "min_score": 0.0,
        },
    },
    {
        "kimlik": "sys_node_n8n_trigger",
        "agent_kind": "graph_node",
        "ad": "n8n Tetikleyici (İşlem Botu)",
        "persona": "Aksiyon karar motoru",
        "prompt": (
            "Sen bir aksiyon karar motorusun. Kullanıcının mesajını analiz ederek "
            "aşağıdaki kararlardan birini ver ve SADECE JSON döndür:\n\n"
            "1. n8n otomasyonu için: "
            '{"action": "n8n", "webhook": "<webhook_adi>", "payload": {}}\n'
            "2. UI navigasyon için: "
            '{"action": "ui_navigate", "target": "<sekme_kimlik>"}\n'
            "3. Aksiyon yoksa: "
            '{"action": "none"}\n\n'
            "Mevcut UI sekmeleri: archive, database, meetings, ai_center, n8n, monitor"
        ),
        "negative_prompt": "JSON dışı metin yazma. Açıklama yapma.",
        "provider": "openai",
        "model": "gpt-4o",
        "temperature": 0.0,
        "max_tokens": 256,
        "strict_fact_check": False,
        "chat_history_length": 0,
        "can_ask_follow_up": False,
        "allowed_workflows": [],  # Kullanıcı UI'dan ekler
        "node_config": {
            "require_explicit_intent": True,
        },
    },
    {
        "kimlik": "sys_node_aggregator",
        "agent_kind": "graph_node",
        "ad": "Aggregator (Kullanıcı Yüzü)",
        "persona": "Şirket içi yapay zeka asistanı",
        "prompt": (
            "Sen şirket içi yapay zeka asistanısın. Kullanıcının sorusuna açık, "
            "kısa ve doğru cevap ver. Türkçe yaz. Bilgi tabanı bağlamı (RAG) varsa "
            "onu temel al; yoksa profesyonel ve nazik bir tonda kendi bilginle "
            "cevapla."
        ),
        "negative_prompt": "Politika ve din konularına girme. Kişisel tavsiye verme.",
        "provider": "openai",
        "model": "gpt-4o",
        "temperature": 0.5,
        "max_tokens": 2048,
        "strict_fact_check": False,
        "chat_history_length": 10,
        "can_ask_follow_up": True,
        "allowed_rags": ["rag_1", "rag_2"],
        "node_config": {
            "include_chat_memory": True,
            "include_history": True,
            "trim_low_score_rag": False,
        },
    },
    {
        "kimlik": "sys_node_msg_polish",
        "agent_kind": "graph_node",
        "ad": "Mesaj Revize (Post-process)",
        "persona": "Kurumsal iletişim uzmanı",
        "prompt": (
            "Sana gelen metni imla, üslup ve profesyonellik açısından daha iyi "
            "bir hale getir. Liste varsa daha okunabilir yap. Sadece revize "
            "edilmiş metni döndür, kendi yorumunu ekleme."
        ),
        "negative_prompt": "Mesajın ana fikrini değiştirme. Bilgi ekleme.",
        "provider": "openai",
        "model": "gpt-4o",
        "temperature": 0.4,
        "max_tokens": 1024,
        "strict_fact_check": False,
        "chat_history_length": 0,
        "can_ask_follow_up": False,
        "node_config": {
            "skip_if_already_clean": True,
            "min_chars_to_revise": 50,
        },
    },
]


# Eski (legacy) ajan ID'leri — soft-delete edilecek
LEGACY_AGENT_IDS = [
    "sys_agent_chatbot_001",
    "sys_agent_msg_001",
    "sys_agent_action_001",
    # NOT: sys_agent_prompt_001 graph dışı /revise-prompt için aktif kalır
]


def seed_graph_agents() -> None:
    """
    Idempotent seed:
      - Yeni 7 graph node ajanı yoksa oluşturur (mevcut kayıt varsa dokunmaz)
      - Eski 3 legacy ajanı `aktif_mi=false` yapar (ilk seed çalışmasında bir kez)

    Yeni kayıt oluştururken mümkünse legacy ajanın promptunu kopyalar:
      sys_agent_chatbot_001  → sys_node_aggregator
      sys_agent_msg_001      → sys_node_msg_polish
      sys_agent_action_001   → sys_node_n8n_trigger
    """
    from database.sql.session import get_session
    from database.sql.models import AIAgent
    from sqlalchemy import select

    # Legacy → yeni node eşleşmesi (prompt + model migration için)
    LEGACY_TO_NEW = {
        "sys_agent_chatbot_001": "sys_node_aggregator",
        "sys_agent_msg_001":     "sys_node_msg_polish",
        "sys_agent_action_001":  "sys_node_n8n_trigger",
    }

    now = datetime.datetime.utcnow().isoformat()

    with get_session() as db:
        # 1) Yeni ajanları oluştur (mevcut yoksa)
        legacy_data: dict[str, AIAgent] = {}
        for legacy_id in LEGACY_TO_NEW:
            legacy_row = db.scalar(select(AIAgent).where(AIAgent.kimlik == legacy_id))
            if legacy_row:
                legacy_data[legacy_id] = legacy_row

        for spec in GRAPH_AGENTS:
            existing = db.scalar(select(AIAgent).where(AIAgent.kimlik == spec["kimlik"]))
            if existing:
                # Önceden seed edilmiş — dokunma (kullanıcı düzenlemiş olabilir)
                continue

            # Legacy promptu varsa migrate et
            new_id = spec["kimlik"]
            legacy_id = next((lid for lid, nid in LEGACY_TO_NEW.items() if nid == new_id), None)
            legacy = legacy_data.get(legacy_id) if legacy_id else None

            payload = dict(spec)
            payload["olusturulma_tarihi"] = now
            payload["guncelleme_tarihi"] = now
            payload.setdefault("aktif_mi", True)

            if legacy:
                # Kullanıcı legacy ajanı özelleştirmişse o değerleri taşı
                if legacy.prompt:
                    payload["prompt"] = legacy.prompt
                if legacy.negative_prompt:
                    payload["negative_prompt"] = legacy.negative_prompt
                if legacy.model and legacy.model != "n/a":
                    payload["model"] = legacy.model
                if legacy.provider:
                    payload["provider"] = legacy.provider
                if legacy.temperature is not None:
                    payload["temperature"] = legacy.temperature
                if legacy.max_tokens:
                    payload["max_tokens"] = legacy.max_tokens
                if legacy.allowed_rags:
                    payload["allowed_rags"] = legacy.allowed_rags
                if legacy.allowed_workflows:
                    payload["allowed_workflows"] = legacy.allowed_workflows
                logger.info(
                    "[seed] %s legacy ajan %s'den prompt/model migrate edildi",
                    new_id, legacy_id,
                )

            new_agent = AIAgent(**payload)
            db.add(new_agent)
            logger.info("[seed] graph node ajanı oluşturuldu: %s", new_id)

        # 2) Legacy ajanları soft-delete (aktif_mi=false)
        for legacy_id in LEGACY_AGENT_IDS:
            row = db.scalar(select(AIAgent).where(AIAgent.kimlik == legacy_id))
            if row and row.aktif_mi:
                row.aktif_mi = False
                row.guncelleme_tarihi = now
                logger.info("[seed] legacy ajan soft-delete: %s", legacy_id)

        db.commit()
