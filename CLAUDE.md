# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Geliştirme Komutları

### Tüm Sistemi Başlat (Frontend + Backend birlikte)
```bash
npm run dev
```
Vite (port 5173) + FastAPI (port 8000) aynı anda başlar, Chrome app modunda otomatik açılır. Backend değişikliklerini nodemon izler.

### Ayrı Ayrı Başlatma
```bash
npm run dev:frontend   # Sadece Vite (React)
npm run dev:backend    # Sadece FastAPI (nodemon ile auto-reload)
```

### Backend (Windows)
```bash
cd backend
venv\Scripts\python.exe main.py
# veya doğrudan uvicorn:
venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Build
```bash
npm run build    # dist/ klasörüne üretim build'i
npm run preview  # Build sonrası preview
```

### Veritabanı Migrasyonu
```bash
cd backend
venv\Scripts\alembic.exe revision --autogenerate -m "açıklama"
venv\Scripts\alembic.exe upgrade head
```
`init_db.py` çalıştığında `_run_schema_migrations()` da eksik kolonları idempotent olarak ekler; salt `ALTER TABLE IF NOT EXISTS` kullandığından production'da güvenle çalışır.

---

## Proje Mimarisi

### Genel Yapı

```
React (Vite) ←→ FastAPI ←→ PostgreSQL + pgvector
                    ↓
               LangGraph (Ajanlar)
                    ↓
           AI Providers (Gemini, OpenAI, Anthropic, Groq)
```

- **Frontend** → `src/` — Vite/React 18, Zustand state management, Tailwind CSS
- **Backend** → `backend/` — FastAPI, SQLAlchemy 2.x, LangGraph
- **Vite proxy**: `/api` isteklerini `http://127.0.0.1:8000` adresine yönlendirir; production build'de bu Nginx üstlenir
- **Language**: Proje Türkçe — değişken adları, model alanları, UI metinleri büyük ölçüde Türkçedir

---

## Backend Mimarisi

### Başlangıç Akışı (`main.py`)

`lifespan` async context manager ile üç şey arka planda paralel başlar:
1. `init_db()` — tablo oluşturma + schema migration
2. `_graph_ready_hint()` — bilgi grafiği kenar sayısı logu
3. `_init_langgraph_checkpointer()` — PostgresSaver bağlantısı; başarısız olursa graph in-memory ile çalışır, uygulama asla çökmez

`app.state.checkpointer` tüm request'lere ortak paylaşılır.

### LangGraph Ajan Grafiği (`backend/services/agent_graph/`)

Ana yapay zeka motoru. Topoloji:

```
START → supervisor → [rag_search | error_solver | zli_finder | n8n_trigger] (paralel)
                                    ↓ (fan-in)
                              aggregator → (needs_polish?) → msg_polish → END
```

- **supervisor**: Niyeti (`intent`) belirler, çalıştırılacak node'ların planını (`plan`) üretir
- **Specialist'ler**: Supervisor'ın Send API ile paralel dağıttığı worker node'lar
- **aggregator**: Tüm specialist çıktılarını tek `final_reply`'a dönüştürür
- **msg_polish**: `needs_polish=True` ise yanıtı üslup/imla açısından revize eder
- **Graph cache**: `_GRAPH_CACHE` dict'i — aynı checkpointer instance için compile işlemi tekrar yapılmaz

**Kritik davranış**: `msg_polish_node`, `get_assigned_agent` fallback zinciri yerine önce `sys_node_msg_polish` agent'ının `aktif_mi` alanını direkt kontrol eder. Agent pasifleştirilmişse fallback'e düşmeden atlar.

### SSE Streaming Protokolü (`runner.py` → `chatService.js`)

Backend `stream_mode=["updates","custom"]` ile graph'ı akışa alır. Frontend şu event türlerini işler:

| Tip | Açıklama |
|-----|---------|
| `chunk` | Token-level metin parçası; frontend buffer'a ekler |
| `replace` | Tüm baloncuk metnini değiştirir (msg_polish, JSON kartlar) |
| `progress` | Node tamamlandı bildirimi (ThinkingProcessPanel için) |
| `sources` | RAG kaynakları |
| `ui_action` | PDF aç, dosya referansı vb. |
| `n8n_action` | N8n otomasyon sonucu |
| `node_error` | Node bazlı hata (graph çalışmayı sürdürür) |
| `done` | Tamamlandı; token sayıları, süre, intent içerir |
| `error` | Fatal hata |

`replace` eventi sonrası `wasRevised=true` — frontend bu mesajı JSON kart ayrıştırması için işaretler. `looksStructured` kontrolü yalnızca `trimmed.startsWith('{')` veya `` `\`\`\`json` `` ile yapılır; `wasRevised` dahil edilmez (double-response bug önlemi).

### Ajan Konfigürasyon Mimarisi (`db_bridge.py`)

Her request başında `get_all_assigned_agents()` ile tüm node konfigürasyonları DB'den çekilip `state["agent_configs"]` cache'ine yazılır. Node'lar `get_agent_config(state, "rol_adı")` ile okur — bu fonksiyon `model_override` varsa ve agent `model_locked=False` ise modeli otomatik değiştirir.

`_DEFAULT_ROLE_AGENT_ID` → `sys_node_<rol>` formatında varsayılan agent ID'leri  
`_FALLBACK_KIND_BY_ROLE` → `graph_node` kind'ına fallback — ancak aktiflik kontrolü atlanamaz

### Veritabanı Katmanı

- **ORM**: SQLAlchemy 2.x, `mapped_column` syntax, tüm PK'lar UUID string
- **Vektörler**: `pgvector.sqlalchemy.Vector(1536)` — hibrit arama (semantic + tsvector full-text)
- **Session yönetimi**: `get_session()` context manager — `__exit__`'te otomatik commit YAPMAZ; açık `db.commit()` gereklidir
- **db_bridge.py**: Servisler için repository'leri saran uyumluluk katmanı; tüm veri erişimi buradan geçer
- **Şema migrasyonu**: `_run_schema_migrations()` — `ALTER TABLE IF NOT EXISTS` ile idempotent sütun ekleme; create_all() mevcut tabloları değiştirmez

---

## Frontend Mimarisi

### State Management (Zustand)

**`workspaceStore.js`** — Uygulamanın ana state hub'ı:
- Çoklu çalışma alanı + sekme yönetimi (tabs, maximize, recentlyClosed)
- Layout state: `isLeftCollapsed`, `isRightOpen`, `chatBarWidth` (localStorage kalıcı)
- Auth state: `isLoggedIn`, `currentUser`
- `chatBarWidth` senkronizasyonu: ChatBar'dan `setChatBarWidth()` çağrılır; `ToastContainer` bunu okuyarak genişliğini ayarlar

**`errorStore.js`** — Toast bildirim sistemi:
- Tekrar eden mesajlar 1.5s içinde deduplicate edilir, `count` artırılır
- `loading` tipinde toastlar X butonu göstermez

### Sohbet Akışı (`ChatBar.jsx` → `MessageList.jsx`)

```
ChatBar (state yönetimi) → MessageList (render) → ChatInputArea (input)
```

- `handleSendMessage`: `isTypingRef.current` ile çift gönderimi önler (ref synchronous; state async değil)
- Streaming sırasında `onChunk` → text append, `onReplace` → tüm text replace (`wasRevised=true` set eder)
- **Scroll davranışı**: Mesaj gönderilince `pendingScrollToUser=true` → user mesajı `scrollBy` ile container tepesine smooth scroll. 700ms sonra `scrollAnchoredRef=false` → streaming auto-scroll devreye girer. Container `data-chat-scroll="1"` attribute'u ile bulunur, `getBoundingClientRect` delta hesaplaması kullanılır.

### Mesaj Render Mantığı (`MessageList.jsx`)

AI mesajı için önce `canTryStructured` kontrolü (`!isStreaming || wasRevised`):
1. `parseZliReportQuery()` → `ZliReportSuggestionCard`
2. `parseErrorSolution()` → `ErrorSolutionCard`
3. `looksStructured && isStreaming` → `RippleLoader` (JSON akışı devam ediyor)
4. `isStreaming && text === ''` → `null` (logo animasyonu yeterli)
5. Varsayılan → `AiMarkdown` + streaming cursor

Logo animasyonu: `isStreaming` sırasında Framer Motion `AnimatePresence` ile `#AA1416` renkli dönen şekil, tamamlanınca `exit` ile dikdörtgene döner.

### API Katmanı (`src/api/`)

**`client.js`**: Tüm fetch'ler `request()` üzerinden geçer; 401 → logout event, 429 → rate limit toast.

**`chatService.js`**: Streaming endpoint `/api/chat/stream`. Her istek PC fingerprint (`localStorage`) + tab token (`sessionStorage`) gönderir — backend session limit kontrolü için.

---

## Önemli Desenler ve Kurallar

### Backend

- **Async/sync sınırı**: FastAPI route'ları `async`, DB işlemleri sync SQLAlchemy. Sync fonksiyonları `await run_in_threadpool(func, *args)` ile çağır.
- **API anahtarları**: `AIModeli` tablosunda Fernet ile şifreli saklanır (`crypto_service.py`). Plain text log'a yazılmaz.
- **Feature flag**: `is_agent_graph_enabled()` → `agent_graph_enabled` system setting. False ise `AIService.get_reply()` (legacy) çağrılır.
- **`get_session()` commit**: Context manager exit'te otomatik commit yoktur. `db.commit()` açıkça çağrılmalıdır.
- **LangGraph state**: `AgentState` `TypedDict`, `total=False`. List/dict alanları `Annotated` reducer'larla (`append_list`, `merge_dicts`) accumulate edilir — node'lar sadece kendi ürettiği alanları döner.

### Frontend

- **`no-toggle` class**: ChatBar'da tıklama olayı propagation kontrolü için kullanılır. Chat alanını collapse etmemesi gereken elementlere eklenir.
- **Tailwind + Styled Components**: Tailwind genel layout için, Styled Components yalnızca `RippleLoader.jsx` gibi CSS animasyon gerektiren bileşenlerde kullanılır.
- **`scroll-smooth` CSS klası**: MessageList'in scroll container'ında mevcuttur; programatik scroll için `behavior` parametresi CSS'i override eder.
- **Logo**: `logo-white-y.png` → Y harfi beyaz boyalı (chat'te kullanılır). `logo-kapali.png` → orijinal, değiştirilmemelidir.

---

## Veri Modelleri (Kritik Alanlar)

### `AIAgent` (ai_agents tablosu)
- `aktif_mi`: Node çalışıp çalışmayacağını belirler. `False` ise node atlanır — ancak sadece `get_ai_agent()` çağrısı (WHERE aktif_mi=True) ile kontrol edildiğinde geçerlidir. State cache üzerinden gelen config `aktif_mi` içermez.
- `model_locked`: True ise `model_override` uygulanmaz, agent kendi modelini kullanır.
- `node_config`: JSON — `min_chars_to_revise` gibi node-spesifik ayarlar.

### `SohbetMesaji` (mesajlar tablosu)
- `rol`: `"user"` veya `"assistant"`
- Konuşma geçmişi `session_id` bazında tutulur; hafıza `services/memory.py` üzerinden yönetilir.

### `VektorParcasi` (vektor_parcalari tablosu)
- `vektor`: `Vector(1536)` — pgvector alanı
- `icerik_tsvector`: Hibrit arama için full-text search vektörü
- `belge_id` → `Belge` FK, `ondelete="CASCADE"`

---

## Ortam Değişkenleri (`backend/.env`)

```
DATABASE_URL=postgresql://...
OPENAI_API_KEY=...
GEMINI_API_KEY=...
N8N_API_KEY=...
EMBEDDING_MODEL=paraphrase-multilingual-MiniLM-L12-v2
FRONTEND_URL=http://localhost:5173
FERNET_KEY=...   # API key şifreleme için
```

AI model API anahtarları ayrıca `AIModeli` tablosunda Fernet ile şifreli saklanabilir (UI üzerinden).

---

## Docker

```bash
docker-compose up --build   # PostgreSQL + Backend + Frontend
docker-compose down -v      # Volume dahil temizle
```

Frontend: Node/Alpine build → Nginx/Alpine serve  
Backend: Python image, uvicorn  
DB: PostgreSQL 16 + pgvector extension
