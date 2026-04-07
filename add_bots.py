import os
import sys

base_dir = os.path.dirname(os.path.abspath(__file__))
# append backend directory to path
backend_dir = os.path.join(base_dir, "backend")
sys.path.append(backend_dir)

from database.sql.session import SessionLocal
from database.sql.models import AIAgent
from datetime import datetime, timezone

def _simdi() -> str:
    return datetime.now(timezone.utc).isoformat()

def seed_agents():
    db = SessionLocal()
    
    # 1. İstem Revize Botu
    prompt_bot = db.query(AIAgent).filter(AIAgent.kimlik == 'sys_agent_prompt_001').first()
    if not prompt_bot:
        prompt_bot = AIAgent(
            kimlik='sys_agent_prompt_001',
            agent_kind='worker',
            ad='İstem Revize Botu',
            aktif_mi=True,
            persona='Prompt Mühendisi',
            prompt='Sana verilen eksik veya kısa promptları (istemleri) daha kaliteli, detaylı ve yapay zeka modelleri için optimize edilmiş profesyonel bir promta çevir. Asla kendi başına metin üretme, sadece kullanıcının girdiği amacı alıp mükemmel bir talimat setine çevir.',
            negative_prompt='Örnek cevap yazma, konuşmaya çalışma.',
            provider='openai',
            model='gpt-4o',
            temperature=0.3,
            max_tokens=1024,
            strict_fact_check=True,
            chat_history_length=0,
            can_ask_follow_up=False,
            error_message="İstem revize edilemedi.",
            avatar_emoji='✍️',
            widget_color='#eab308'
        )
        db.add(prompt_bot)

    # 2. Mesaj Revize Botu
    msg_bot = db.query(AIAgent).filter(AIAgent.kimlik == 'sys_agent_msg_001').first()
    if not msg_bot:
        msg_bot = AIAgent(
            kimlik='sys_agent_msg_001',
            agent_kind='worker',
            ad='Mesaj Revize Botu',
            aktif_mi=True,
            persona='Kurumsal İletişim Uzmanı',
            prompt='Sana verilen kuralsız, hatalı veya kaba yazılmış mesajları al ve profesyonel, nazik, net ve kurumsal bir e-posta veya mesaj formatına dönüştür. Anlamı değiştirme, sadece üslubu profesyonelleştir.',
            negative_prompt='Mesajın ana fikrini değiştirme, bilgi ekleme.',
            provider='anthropic',
            model='claude-3-haiku',
            temperature=0.4,
            max_tokens=1024,
            strict_fact_check=True,
            chat_history_length=0,
            can_ask_follow_up=False,
            error_message="Mesaj revize edilemedi.",
            avatar_emoji='✉️',
            widget_color='#3b82f6'
        )
        db.add(msg_bot)

    # 3. İşlem Botu (Aksiyon Yönlendiricisi)
    action_bot = db.query(AIAgent).filter(AIAgent.kimlik == 'sys_agent_action_001').first()
    if not action_bot:
        action_bot = AIAgent(
            kimlik='sys_agent_action_001',
            agent_kind='router',
            ad='İşlem Botu',
            aktif_mi=True,
            persona='Aksiyon Yönlendiricisi',
            prompt="""Sen bir aksiyon karar motorusun. Kullanıcının mesajını analiz ederek aşağıdaki kararlardan birini ver ve SADECE JSON döndür:

1. Eğer kullanıcı bir n8n otomasyonu tetiklemek istiyorsa:
{"action": "n8n", "webhook": "<webhook_adi>", "payload": {}}

2. Eğer kullanıcı arayüzde bir sekme veya sayfa açmak istiyorsa:
{"action": "ui_navigate", "target": "<sekme_kimlik>"}

3. Eğer hiçbir aksiyon gerekmiyorsa:
{"action": "none"}

Mevcut n8n webhook'ları: toplantı_kaydet, rapor_gonder, gorev_olustur, bildirim_gonder
Mevcut UI sekmeleri: archive, database, meetings, ai_center, n8n, monitor

Kullanıcı mesajı: {{user_message}}""",
            negative_prompt='JSON dışında hiçbir şey yazma. Açıklama yapma.',
            provider='openai',
            model='gpt-4o',
            temperature=0.0,
            max_tokens=256,
            strict_fact_check=False,
            chat_history_length=0,
            can_ask_follow_up=False,
            error_message="Aksiyon belirlenemedi.",
            avatar_emoji='⚡',
            widget_color='#8b5cf6'
        )
        db.add(action_bot)

    db.commit()
    db.close()
    print("Botlar başarıyla veritabanına eklendi.")

if __name__ == "__main__":
    seed_agents()
