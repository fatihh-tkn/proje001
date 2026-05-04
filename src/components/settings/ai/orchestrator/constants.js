// --- DATA CONSTANTS ---
export const PROVIDERS = [
    { id: 'openai', name: 'OpenAI (GPT-4)' },
    { id: 'anthropic', name: 'Anthropic (Claude)' },
    { id: 'gemini', name: 'Google (Gemini)' },
    { id: 'ollama', name: 'Ollama (Local)' },
];

export const MODELS_BY_PROVIDER = {
    'openai': ['gpt-4o', 'gpt-4-turbo'],
    'anthropic': ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    'gemini': ['gemini-1.5-pro', 'gemini-1.5-flash'],
    'ollama': ['llama3', 'mistral', 'qwen']
};

export const READ_MODES = [
    { id: 'raw', name: 'Saf Metin (Raw Extraction)' },
    { id: 'structured', name: 'Yapısal Şablon (Structured Markdown)' },
    { id: 'chunked', name: 'Parça Odaklı Analiz (Chunk-by-Chunk)' }
];

export const OUTPUT_FORMATS = [
    { id: 'markdown', name: 'Standart Markdown' },
    { id: 'json', name: 'Kati JSON Verisi' },
    { id: 'plain', name: 'Düz Metin (Plain Text)' },
    { id: 'table', name: 'Tablo Ağırlıklı (Grid)' }
];

export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 80;

export const DEFAULT_CHATBOT = {
    id: 'sys_agent_chatbot_001',
    type: 'agent',
    agentKind: 'chatbot',
    name: 'Genel Sohbet Asistanı',
    active: true,
    persona: 'Şirket içi bilgi asistanı',
    tone: 'professional',
    prompt: 'Kullanıcının sorularını şirket belgelerine ve veri tabanına dayanarak yanıtla. Kısa, net ve profesyonel ol.',
    negativePrompt: 'Fiyat, indirim veya kişisel tavsiye verme. Politika ve din konularına girme.',
    provider: 'openai',
    model: 'gpt-4o',
    temp: 0.5,
    maxTokens: 2048,
    outputFormat: 'markdown',
    logicCondition: '',
    allowedRags: ['rag_1'],
    readMode: 'structured',
    strictFactCheck: true,
    excludedFiles: [],
    welcomeMessage: 'Merhaba! Size nasıl yardımcı olabilirim?',
    chatHistoryLength: 10,
    canAskFollowUp: true,
    followUpCount: 2,
    avatarEmoji: '🤖',
    widgetColor: '#1D9E75',
    offlineMessage: '',
    errorMessage: 'Şu anda bilgiye ulaşamıyorum, lütfen daha sonra tekrar deneyin.'
};

export const DEFAULT_PROMPT_BOT = {
    id: 'sys_agent_prompt_001',
    type: 'agent',
    agentKind: 'worker',
    name: 'İstem Revize Botu',
    active: true,
    persona: 'Prompt Mühendisi',
    tone: 'professional',
    prompt: 'Sana verilen eksik veya kısa promptları (istemleri) daha kaliteli, detaylı ve yapay zeka modelleri için optimize edilmiş profesyonel bir promta çevir. Asla kendi başına metin üretme, sadece kullanıcının girdiği amacı alıp mükemmel bir talimat setine çevir.',
    negativePrompt: 'Örnek cevap yazma, konuşmaya çalışma.',
    provider: 'openai',
    model: 'gpt-4o',
    temp: 0.3,
    maxTokens: 1024,
    outputFormat: 'plain',
    logicCondition: '',
    allowedRags: [],
    readMode: 'raw',
    strictFactCheck: true,
    excludedFiles: [],
    welcomeMessage: '',
    chatHistoryLength: 0,
    canAskFollowUp: false,
    followUpCount: 0,
    avatarEmoji: '✍️',
    widgetColor: '#EF9F27',
    offlineMessage: '',
    errorMessage: 'İstem revize edilemedi.'
};

export const DEFAULT_MSG_BOT = {
    id: 'sys_agent_msg_001',
    type: 'agent',
    agentKind: 'worker',
    name: 'Mesaj Revize Botu',
    active: true,
    persona: 'Kurumsal İletişim Uzmanı',
    tone: 'professional',
    prompt: 'Sana verilen kuralsız, hataly or kaba yazılmış mesajları al ve profesyonel, nazik, net ve kurumsal bir e-posta veya mesaj formatına dönüştür. Anlamı değiştirme, sadece üslubu profesyonelleştir.',
    negativePrompt: 'Mesajın ana fikrini değiştirme, bilgi ekleme.',
    provider: 'anthropic',
    model: 'claude-3-haiku',
    temp: 0.4,
    maxTokens: 1024,
    outputFormat: 'plain',
    logicCondition: '',
    allowedRags: [],
    readMode: 'raw',
    strictFactCheck: true,
    excludedFiles: [],
    welcomeMessage: '',
    chatHistoryLength: 0,
    canAskFollowUp: false,
    followUpCount: 0,
    avatarEmoji: '✉️',
    widgetColor: '#378ADD',
    offlineMessage: '',
    errorMessage: 'Mesaj revize edilemedi.'
};

export const DEFAULT_ACTION_BOT = {
    id: 'sys_agent_action_001',
    type: 'agent',
    agentKind: 'router',
    name: 'İşlem Botu',
    active: true,
    persona: 'Aksiyon Yönlendiricisi',
    tone: 'professional',
    prompt: `Sen bir aksiyon karar motorusun. Kullanıcının mesajını analiz ederek aşağıdaki kararlardan birini ver ve SADECE JSON döndür:

1. Eğer kullanıcı bir n8n otomasyonu tetiklemek istiyorsa:
{"action": "n8n", "webhook": "<webhook_adi>", "payload": {}}

2. Eğer kullanıcı arayüzde bir sekme veya sayfa açmak istiyorsa:
{"action": "ui_navigate", "target": "<sekme_kimlik>"}

3. Eğer hiçbir aksiyon gerekmiyorsa:
{"action": "none"}

Mevcut n8n webhook’ları: toplantı_kaydet, rapor_gonder, gorev_olustur, bildirim_gonder
Mevcut UI sekmeleri: archive, database, meetings, ai_center, n8n, monitor

Kullanıcı mesajı: {{user_message}}`,
    negativePrompt: 'JSON dışında hiçbir şey yazma. Açıklama yapma.',
    provider: 'openai',
    model: 'gpt-4o',
    temp: 0.0,
    maxTokens: 256,
    outputFormat: 'json',
    logicCondition: 'Her kullanıcı mesajından önce çalıştır. Yalnızca aksiyon gereken durumlarda tetikle.',
    allowedRags: [],
    allowedWorkflows: [],
    readMode: 'raw',
    strictFactCheck: false,
    excludedFiles: [],
    welcomeMessage: '',
    chatHistoryLength: 0,
    canAskFollowUp: false,
    followUpCount: 0,
    avatarEmoji: '⚡',
    widgetColor: '#4E4EBA',
    offlineMessage: '',
    errorMessage: 'Aksiyon belirlenemedi.'
};

// ─── LG.7: Graph Node Ajanları ──────────────────────────────────────────────
// Bu 7 kart `agentKind: 'graph_node'` ile işaretlenir; UI'da default olarak
// gösterilir, eski 3 legacy ajan (chatbot/msg_bot/action_bot) `aktif_mi=false`
// ile soft-delete edilmiş şekilde DB'de kalır ve grid filtresinde gizlenir.

export const DEFAULT_NODE_SUPERVISOR = {
    id: 'sys_node_supervisor',
    type: 'agent',
    agentKind: 'graph_node',
    name: 'Supervisor (Intent Sınıflandırıcı)',
    active: true,
    persona: 'LangGraph orkestrasyon beyni',
    tone: 'professional',
    prompt: 'Sen bir intent sınıflandırıcısın. Kullanıcı mesajını okur ve general / hata_cozumu / rapor_arama / n8n / dosya_qa kategorilerinden birini seçersin. SADECE JSON döndür.',
    negativePrompt: 'JSON dışında metin yazma. Açıklama yapma.',
    provider: 'openai',
    model: 'gpt-4o',
    temp: 0.0,
    maxTokens: 256,
    outputFormat: 'json',
    logicCondition: 'Her kullanıcı mesajından önce çalışır.',
    allowedRags: [],
    readMode: 'raw',
    strictFactCheck: false,
    excludedFiles: [],
    welcomeMessage: '',
    chatHistoryLength: 0,
    canAskFollowUp: false,
    followUpCount: 0,
    avatarEmoji: '🧭',
    widgetColor: '#7C3AED',
    offlineMessage: '',
    errorMessage: 'Intent sınıflandırılamadı.',
    nodeConfig: { use_llm_classifier: true, fallback_to_rules: true },
};

export const DEFAULT_NODE_RAG_SEARCH = {
    id: 'sys_node_rag_search',
    type: 'agent',
    agentKind: 'graph_node',
    name: 'RAG Arama (Hibrit)',
    active: true,
    persona: 'Bilgi tabanı arama uzmanı',
    tone: 'professional',
    prompt: '(LLM çağrısı yapmaz; bu kayıt yalnızca node-specific ayarları tutar.)',
    negativePrompt: '',
    provider: 'openai',
    model: 'n/a',
    temp: 0.0,
    maxTokens: 0,
    outputFormat: 'plain',
    logicCondition: 'Genel sohbet ve dosya QA dahil çoğu intent\'te paralel çağrılır.',
    allowedRags: ['rag_1', 'rag_2'],
    readMode: 'structured',
    strictFactCheck: false,
    excludedFiles: [],
    welcomeMessage: '',
    chatHistoryLength: 0,
    canAskFollowUp: false,
    followUpCount: 0,
    avatarEmoji: '🔎',
    widgetColor: '#0EA5E9',
    offlineMessage: '',
    errorMessage: 'Bilgi tabanı arama başarısız oldu.',
    nodeConfig: { top_k: 10, score_threshold: 0.05, expand_chunk_graph: true },
};

export const DEFAULT_NODE_ERROR_SOLVER = {
    id: 'sys_node_error_solver',
    type: 'agent',
    agentKind: 'graph_node',
    name: 'Hata Çözücü (SAP/Sistem)',
    active: true,
    persona: 'SAP destek uzmanı',
    tone: 'professional',
    prompt: 'Sen bir SAP & kurumsal sistem destek uzmanısın. Kullanıcının hatasını analiz et ve yapılandırılmış JSON (type:error_solution) döndür.',
    negativePrompt: 'Tahmin yapma; bilmediğin alanı boş bırak. JSON dışı metin yazma.',
    provider: 'openai',
    model: 'gpt-4o',
    temp: 0.2,
    maxTokens: 1500,
    outputFormat: 'json',
    logicCondition: 'intent=hata_cozumu olduğunda paralel çalışır.',
    allowedRags: [],
    readMode: 'raw',
    strictFactCheck: true,
    excludedFiles: [],
    welcomeMessage: '',
    chatHistoryLength: 0,
    canAskFollowUp: false,
    followUpCount: 0,
    avatarEmoji: '🩺',
    widgetColor: '#DC2626',
    offlineMessage: '',
    errorMessage: 'Hata çözüm önerisi üretilemedi.',
    nodeConfig: { use_rag_context: true, output_schema_version: 1 },
};

export const DEFAULT_NODE_ZLI_FINDER = {
    id: 'sys_node_zli_finder',
    type: 'agent',
    agentKind: 'graph_node',
    name: 'Z\'li Rapor Bulucu',
    active: true,
    persona: 'ABAP rapor uzmanı',
    tone: 'professional',
    prompt: 'Z\'li rapor uzmanı. SQL\'den gelen aday raporlar arasından best_match + alternatives seçer. Eşleşme yoksa best_match=null. SADECE JSON.',
    negativePrompt: 'JSON dışı metin yazma.',
    provider: 'openai',
    model: 'gpt-4o',
    temp: 0.0,
    maxTokens: 800,
    outputFormat: 'json',
    logicCondition: 'intent=rapor_arama olduğunda çalışır.',
    allowedRags: [],
    readMode: 'raw',
    strictFactCheck: true,
    excludedFiles: [],
    welcomeMessage: '',
    chatHistoryLength: 0,
    canAskFollowUp: false,
    followUpCount: 0,
    avatarEmoji: '📊',
    widgetColor: '#0891B2',
    offlineMessage: '',
    errorMessage: 'Rapor önerisi üretilemedi.',
    nodeConfig: { sql_match_limit: 5, min_score: 0.0 },
};

export const DEFAULT_NODE_N8N_TRIGGER = {
    id: 'sys_node_n8n_trigger',
    type: 'agent',
    agentKind: 'graph_node',
    name: 'n8n Tetikleyici (İşlem Botu)',
    active: true,
    persona: 'Aksiyon karar motoru',
    tone: 'professional',
    prompt: 'Sen bir aksiyon karar motorusun. Kullanıcı mesajını analiz ederek n8n / ui_navigate / none kararlarından birini ver, SADECE JSON döndür.',
    negativePrompt: 'JSON dışı metin yazma. Açıklama yapma.',
    provider: 'openai',
    model: 'gpt-4o',
    temp: 0.0,
    maxTokens: 256,
    outputFormat: 'json',
    logicCondition: 'intent=n8n olduğunda paralel çalışır.',
    allowedRags: [],
    allowedWorkflows: [],
    readMode: 'raw',
    strictFactCheck: false,
    excludedFiles: [],
    welcomeMessage: '',
    chatHistoryLength: 0,
    canAskFollowUp: false,
    followUpCount: 0,
    avatarEmoji: '⚡',
    widgetColor: '#4E4EBA',
    offlineMessage: '',
    errorMessage: 'Aksiyon belirlenemedi.',
    nodeConfig: { require_explicit_intent: true },
};

export const DEFAULT_NODE_AGGREGATOR = {
    id: 'sys_node_aggregator',
    type: 'agent',
    agentKind: 'graph_node',
    name: 'Aggregator (Kullanıcı Yüzü)',
    active: true,
    persona: 'Şirket içi yapay zeka asistanı',
    tone: 'professional',
    prompt: 'Sen şirket içi yapay zeka asistanısın. Kullanıcının sorusuna açık, kısa ve doğru cevap ver. RAG bağlamı varsa onu temel al.',
    negativePrompt: 'Politika ve din konularına girme. Kişisel tavsiye verme.',
    provider: 'openai',
    model: 'gpt-4o',
    temp: 0.5,
    maxTokens: 2048,
    outputFormat: 'markdown',
    logicCondition: 'Tüm specialist çıktıları toplandıktan sonra kullanıcıya cevabı kurar.',
    allowedRags: ['rag_1', 'rag_2'],
    readMode: 'structured',
    strictFactCheck: false,
    excludedFiles: [],
    welcomeMessage: 'Merhaba! Size nasıl yardımcı olabilirim?',
    chatHistoryLength: 10,
    canAskFollowUp: true,
    followUpCount: 2,
    avatarEmoji: '🤖',
    widgetColor: '#1D9E75',
    offlineMessage: '',
    errorMessage: 'Şu anda bilgiye ulaşamıyorum, lütfen daha sonra tekrar deneyin.',
    nodeConfig: { include_chat_memory: true, include_history: true, trim_low_score_rag: false },
};

export const DEFAULT_NODE_MSG_POLISH = {
    id: 'sys_node_msg_polish',
    type: 'agent',
    agentKind: 'graph_node',
    name: 'Mesaj Revize (Post-process)',
    active: true,
    persona: 'Kurumsal iletişim uzmanı',
    tone: 'professional',
    prompt: 'Sana gelen metni imla, üslup ve profesyonellik açısından iyileştir. Listeleri okunabilir yap. Sadece revize edilmiş metni döndür.',
    negativePrompt: 'Mesajın ana fikrini değiştirme. Bilgi ekleme.',
    provider: 'openai',
    model: 'gpt-4o',
    temp: 0.4,
    maxTokens: 1024,
    outputFormat: 'plain',
    logicCondition: 'needs_polish=true olduğunda aggregator sonrası tetiklenir.',
    allowedRags: [],
    readMode: 'raw',
    strictFactCheck: false,
    excludedFiles: [],
    welcomeMessage: '',
    chatHistoryLength: 0,
    canAskFollowUp: false,
    followUpCount: 0,
    avatarEmoji: '✉️',
    widgetColor: '#378ADD',
    offlineMessage: '',
    errorMessage: 'Mesaj revize edilemedi.',
    nodeConfig: { skip_if_already_clean: true, min_chars_to_revise: 50 },
};

// İstem Revize Botu (sys_agent_prompt_001) graph dışı /revise-prompt endpoint'i
// için aktif kalır; bu yüzden DEFAULT_AGENTS'ta tutulur.
export const DEFAULT_AGENTS = [
    DEFAULT_NODE_SUPERVISOR,
    DEFAULT_NODE_RAG_SEARCH,
    DEFAULT_NODE_ERROR_SOLVER,
    DEFAULT_NODE_ZLI_FINDER,
    DEFAULT_NODE_N8N_TRIGGER,
    DEFAULT_NODE_AGGREGATOR,
    DEFAULT_NODE_MSG_POLISH,
    DEFAULT_PROMPT_BOT,
];

// UI grid filtresi: legacy ajanları (chatbot/msg_bot/action_bot) gizle.
// Bunlar DB'de soft-delete (aktif_mi=false) edilmiş olarak duruyor.
export const HIDDEN_LEGACY_AGENT_IDS = new Set([
    'sys_agent_chatbot_001',
    'sys_agent_msg_001',
    'sys_agent_action_001',
]);

export const isAgentVisibleInGrid = (agent) => {
    if (!agent) return false;
    if (HIDDEN_LEGACY_AGENT_IDS.has(agent.id)) return false;
    return true;
};
