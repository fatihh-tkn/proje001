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

export const DEFAULT_AGENTS = [DEFAULT_CHATBOT, DEFAULT_PROMPT_BOT, DEFAULT_MSG_BOT, DEFAULT_ACTION_BOT];
