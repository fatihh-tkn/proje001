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
    widgetColor: '#10b981',
    offlineMessage: '',
    errorMessage: 'Şu anda bilgiye ulaşamıyorum, lütfen daha sonra tekrar deneyin.'
};
