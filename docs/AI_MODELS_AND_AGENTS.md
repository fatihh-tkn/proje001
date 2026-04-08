# Yapay Zeka Modelleri ve Ajanlar (Agents)

Sistem, gelen istekleri karşılamak için tek bir yapı yerine, uzmanlaşmış "Ajan" (Agent) yapısını kullanır.

## Ajan Türleri

### 1. İşlem Botu (Action Router)
* **API:** OpenAI (GPT-4o) veya Anthropic (Claude-3)
* **Görevi:** Gelen kullanıcı metninin niyetini (intent) okuyarak bir otomasyon mu yoksa arayüzde bir sayfa mı açılacağına karar verir.
* **Format:** Sadece JSON formatında çıktı verir.
* **Örnek Çıktı:** `{"action": "ui_navigate", "target": "database"}`

### 2. İstem Revize Botu (Prompt Engineer)
* **API:** OpenAI (GPT-4o)
* **Görevi:** Kullanıcıların girdiği basit veya eksik istemleri, LLM'lerden en verimli dönüşü alabilmek adına optimize edilmiş, detaylı istemlere (prompt) dönüştürür.

### 3. Mesaj Revize Botu (Kurumsal İletişim Uzmanı)
* **API:** Anthropic (Claude-3 Haiku)
* **Görevi:** Kaba veya düzensiz yazılmış yazıları, kurumsal e-posta veya profesyonel iletişim standartlarına uyarlar.

## Sistem İşleyişi
Orkestratör (Orchestrator) sistemi bir kullanıcı mesajı aldığında, önce Action Router'ı devreye sokarak teknik bir istek olup olmadığını denetler. Eğer bu mesaj bir dosya revizyonu istiyorsa, görevi uzman olan Ajan'a atar. Bütün bu ajanların tanımı SQLite veritabanındaki `ai_agents` tablosunda dinamik olarak tutulmaktadır.
