import React, { useState, useEffect, useContext, useCallback, createContext } from 'react';
import { ShieldCheck, CheckCircle2, Loader2, ChevronDown, ChevronUp, FileText, RefreshCw, AlertCircle, Lock, Unlock } from 'lucide-react';
import { API_BASE, fetchWithTimeout } from '../utils';
import { ALL_SUGGESTIONS, getDisabledIds, setDisabledIds } from '../../../chatbar/suggestionCards';

/* ── NodeConfigPanel primitifleri — MODÜL DÜZEYINDE (render'da yeniden tanımlanmaz) ── */
const _NCCtx = createContext({ cfg: {}, setKey: () => {} });

const Section = ({ title }) => (
    <div className="flex items-center gap-3 pt-5 pb-1.5">
        <span className="text-[9px] font-black tracking-[0.18em] text-stone-400 uppercase whitespace-nowrap">{title}</span>
        <div className="flex-1 h-px bg-stone-100" />
    </div>
);

const Row = ({ label, desc, children, noBorder }) => (
    <div className={`flex items-center gap-4 py-3 ${noBorder ? '' : 'border-b border-stone-100'}`}>
        <div className="flex-shrink-0" style={{ width: '44%' }}>
            <div className="text-[12px] font-semibold text-stone-700 leading-snug">{label}</div>
            {desc && <div className="text-[10px] text-stone-400 mt-0.5 leading-snug">{desc}</div>}
        </div>
        <div className="flex-1 min-w-0">{children}</div>
    </div>
);

const Pill = ({ k, defaultVal = false }) => {
    const { cfg, setKey } = useContext(_NCCtx);
    const on = cfg[k] !== undefined ? !!cfg[k] : defaultVal;
    return (
        <div className="flex justify-end">
            <button
                type="button"
                onClick={() => setKey(k, !on)}
                className={`relative w-[38px] h-[20px] rounded-full transition-colors focus:outline-none ${on ? 'bg-[#D44B4B]' : 'bg-stone-200'}`}
            >
                <span className={`absolute top-[2px] w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-150 ${on ? 'left-[20px]' : 'left-[2px]'}`} />
            </button>
        </div>
    );
};

const SSlider = ({ k, min, max, step, fmt, defaultVal }) => {
    const { cfg, setKey } = useContext(_NCCtx);
    const raw = cfg[k];
    const val = raw !== undefined && raw !== null && !isNaN(Number(raw)) ? Number(raw) : (defaultVal ?? min);
    const display = fmt ? fmt(val) : val;
    return (
        <div className="flex items-center gap-3">
            <span className="text-[13px] font-black text-[#378ADD] font-mono tabular-nums" style={{ minWidth: 42, textAlign: 'right' }}>{display}</span>
            <div className="flex-1">
                <input
                    type="range" min={min} max={max} step={step}
                    value={val}
                    onChange={(e) => setKey(k, step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
                    className="w-full h-[3px] bg-stone-200 rounded-full appearance-none cursor-pointer accent-[#D44B4B]"
                />
                <div className="flex justify-between mt-0.5">
                    <span className="text-[9px] text-stone-300 font-mono">{min}</span>
                    <span className="text-[9px] text-stone-300 font-mono">{max}</span>
                </div>
            </div>
        </div>
    );
};

const SNumInput = ({ k, min }) => {
    const { cfg, setKey } = useContext(_NCCtx);
    return (
        <input
            type="number" min={min}
            value={cfg[k] ?? ''}
            onChange={e => setKey(k, e.target.value === '' ? null : parseInt(e.target.value))}
            className="w-full bg-white border border-stone-200 text-stone-700 text-[12px] font-black rounded-lg px-3 py-2 outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 transition-all font-mono text-right"
        />
    );
};

/* ── Öneri Kartları Yönetimi ──────────────────────────────────────── */
function SuggestionCardsConfig() {
    const [disabled, setDisabled] = useState(() => new Set(getDisabledIds()));

    const toggle = (id) => {
        setDisabled(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            setDisabledIds([...next]);
            return next;
        });
    };

    const activeCount = ALL_SUGGESTIONS.length - disabled.size;

    return (
        <div className="pt-1">
            <div className="text-[10px] text-stone-400 mb-2">
                Her yeni sohbette {activeCount} etkin karttan rastgele 4 tanesi gösterilir.
            </div>
            <div className="flex flex-col gap-1">
                {ALL_SUGGESTIONS.map(({ id, icon: Icon, label, text }) => {
                    const isOn = !disabled.has(id);
                    return (
                        <div
                            key={id}
                            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-all ${isOn ? 'bg-white border-stone-200' : 'bg-stone-50 border-stone-100 opacity-40'}`}
                        >
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${isOn ? 'bg-red-50' : 'bg-stone-100'}`}>
                                <Icon size={12} className={isOn ? 'text-[#DC2626]' : 'text-stone-400'} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-[9.5px] font-bold text-stone-400 uppercase tracking-wide mr-1.5">{label}</span>
                                <span className="text-[11px] text-stone-600 leading-snug">{text}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => toggle(id)}
                                className={`relative w-[34px] h-[18px] rounded-full transition-colors shrink-0 focus:outline-none ${isOn ? 'bg-[#D44B4B]' : 'bg-stone-200'}`}
                            >
                                <span className={`absolute top-[2px] w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-all duration-150 ${isOn ? 'left-[18px]' : 'left-[2px]'}`} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ── Takip Soruları Ayarları ──────────────────────────────────────── */
const FU_LS_KEY = 'chat_followup_settings';
const loadFuCfg = () => { try { return JSON.parse(localStorage.getItem(FU_LS_KEY) || '{}'); } catch { return {}; } };
const saveFuCfg = (obj) => { try { localStorage.setItem(FU_LS_KEY, JSON.stringify(obj)); } catch {} };

function FollowupSection() {
    const [cfg, setCfg] = useState(loadFuCfg);
    const enabled = cfg.enabled !== false;
    const maxCount = cfg.max_count ?? 2;
    const set = (k, v) => setCfg(prev => { const next = { ...prev, [k]: v }; saveFuCfg(next); return next; });

    return (
        <div>
            <Row label="Takip Soruları" desc="Yanıt sonrası önerilen sorular gösterilir">
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => set('enabled', !enabled)}
                        className={`relative w-[38px] h-[20px] rounded-full transition-colors focus:outline-none ${enabled ? 'bg-[#D44B4B]' : 'bg-stone-200'}`}
                    >
                        <span className={`absolute top-[2px] w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-150 ${enabled ? 'left-[20px]' : 'left-[2px]'}`} />
                    </button>
                </div>
            </Row>
            <Row label="Soru Sayısı" desc="Her yanıt sonrası kaç takip sorusu önerilsin" noBorder>
                <div className={`flex items-center gap-3 transition-opacity ${enabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                    <span className="text-[13px] font-black text-[#378ADD] font-mono tabular-nums" style={{ minWidth: 42, textAlign: 'right' }}>{maxCount}</span>
                    <div className="flex-1">
                        <input
                            type="range" min={1} max={5} step={1}
                            value={maxCount}
                            onChange={e => set('max_count', parseInt(e.target.value))}
                            className="w-full h-[3px] bg-stone-200 rounded-full appearance-none cursor-pointer accent-[#D44B4B]"
                        />
                        <div className="flex justify-between mt-0.5">
                            <span className="text-[9px] text-stone-300 font-mono">1</span>
                            <span className="text-[9px] text-stone-300 font-mono">5</span>
                        </div>
                    </div>
                </div>
            </Row>
        </div>
    );
}

/* ── LG.7: Graph Node Ajanları için node_config Editörü ──────────────── */
function NodeConfigPanel({ selectedItem, updateAgent }) {
    const cfg = selectedItem.nodeConfig || {};
    const setKey = useCallback(
        (k, v) => updateAgent('nodeConfig', { ...(selectedItem.nodeConfig || {}), [k]: v }),
        [updateAgent, selectedItem.nodeConfig]
    );
    const id = selectedItem.id;

    // ── Node'a özel gövde ─────────────────────────────────────────────────

    let body = null;

    if (id === 'sys_node_rag_search') {
        body = (
            <div className="">
                <Section title="Kaynak Havuzu" />
                <Row label="Top-K" desc="Kaç kaynak döndürülsün">
                    <SSlider k="top_k" min={3} max={30} step={1} defaultVal={10} />
                </Row>
                <Row label="Min. Skor Eşiği" desc="Bunun altındaki sonuçlar elenir">
                    <SSlider k="score_threshold" min={0} max={1} step={0.01} defaultVal={0.05} fmt={v => v.toFixed(2)} />
                </Row>
                <Row label="Aday Havuzu" desc="Her arama kolundan kaç aday çekilir">
                    <SNumInput k="candidate_pool_size" min={10} />
                </Row>
                <Row label="Belgede Max Chunk" desc="Aynı belgeden max parça sayısı">
                    <SNumInput k="max_per_doc" min={1} />
                </Row>

                <Section title="Sorgu Genişletme" />
                <Row label="Max Sorgu Varianti" desc="Kaç farklı ifadeyle aranacak">
                    <SSlider k="max_query_variants" min={1} max={5} step={1} defaultVal={4} />
                </Row>
                <Row label="Kural Tabanlı Genişletme" desc="Türkçe soru eklerini (nedir, nasıl…) kaldırır">
                    <Pill k="use_rule_expansion" defaultVal={true} />
                </Row>
                <Row label="LLM Sorgu Genişletme" desc="2 alternatif ifade üretir; gecikme ekler">
                    <Pill k="use_query_expansion" />
                </Row>

                <Section title="Bağlam" />
                <Row label="Bağlam Bütçesi" desc="LLM'e gönderilecek max karakter">
                    <SSlider k="context_max_chars" min={4000} max={64000} step={4000} defaultVal={24000} fmt={v => `${Math.round(v / 1000)}K`} />
                </Row>
                <Row label="Duplikat Eşiği" desc="Bu benzerliğin üstündeki chunk'lar atlanır">
                    <SSlider k="near_dup_threshold" min={0.5} max={0.95} step={0.05} defaultVal={0.65} fmt={v => v.toFixed(2)} />
                </Row>
                <Row label="Komşu Chunk Genişletme" desc="Graf komşularını (önceki/sonraki paragraf) dahil et">
                    <Pill k="expand_chunk_graph" defaultVal={true} />
                </Row>
                <Row label="Adaptif Skor Filtresi" desc="Eşik sonrası top skorun %25 altındakileri at">
                    <Pill k="adaptive_score_filter" defaultVal={true} />
                </Row>

                <Section title="Performans" />
                <Row label="Cross-Encoder Re-Ranker" desc="Çok dilli AI ile yeniden sırala; kapatmak hızlandırır" noBorder>
                    <Pill k="use_reranker" defaultVal={true} />
                </Row>
            </div>
        );
    } else if (id === 'sys_node_error_solver') {
        body = (
            <div className="">
                <Section title="Ayarlar" />
                <Row label="RAG Bağlamını Kullan" desc="Bilgi tabanı varsa çözüme dahil et">
                    <Pill k="use_rag_context" defaultVal={true} />
                </Row>
                <Row label="Çıktı Şema Versiyonu" desc="JSON kart şema sürümü" noBorder>
                    <SNumInput k="output_schema_version" min={1} />
                </Row>
            </div>
        );
    } else if (id === 'sys_node_aggregator') {
        body = (
            <div className="">
                <Section title="Hafıza" />
                <Row label="Sohbet Hafızası" desc="Önceki sohbetlerden alakalı kesitler eklenir">
                    <Pill k="include_chat_memory" defaultVal={true} />
                </Row>
                <Row label="Tur Geçmişi" desc="Aynı oturumdaki son turlar prompt'a eklenir">
                    <Pill k="include_history" defaultVal={true} />
                </Row>
                <Section title="Kalite" />
                <Row label="Düşük Skorlu RAG'ları Filtrele" desc="rag_search score_threshold'una uymayanları at" noBorder>
                    <Pill k="trim_low_score_rag" />
                </Row>
                <Section title="Öneri Kartları" />
                <SuggestionCardsConfig />
                <Section title="Takip Soruları" />
                <FollowupSection />
            </div>
        );
    } else if (id === 'sys_node_supervisor') {
        body = (
            <div className="">
                <Section title="Sınıflandırma" />
                <Row label="LLM Sınıflandırıcı" desc="Kapalıysa sadece kural tabanlı sınıflandırma çalışır">
                    <Pill k="use_llm_classifier" defaultVal={true} />
                </Row>
                <Row label="Kural Tabanlı Yedek" desc="LLM erişilemezse regex/anahtar kelimelere düş" noBorder>
                    <Pill k="fallback_to_rules" defaultVal={true} />
                </Row>
            </div>
        );
    } else if (id === 'sys_node_zli_finder') {
        body = (
            <div className="">
                <Section title="Arama" />
                <Row label="SQL Aday Limiti" desc="Veritabanından kaç aday çekilsin">
                    <SNumInput k="sql_match_limit" min={1} />
                </Row>
                <Row label="Minimum Skor" desc="Bu skorun altındaki eşleşmeler atlanır" noBorder>
                    <SSlider k="min_score" min={0} max={1} step={0.05} defaultVal={0.3} fmt={v => v.toFixed(2)} />
                </Row>
            </div>
        );
    } else if (id === 'sys_node_n8n_trigger') {
        body = (
            <div className="">
                <Section title="Tetikleme" />
                <Row label="Açık Niyet Şartı" desc="Sadece supervisor intent='n8n' verdiğinde tetikle" noBorder>
                    <Pill k="require_explicit_intent" defaultVal={true} />
                </Row>
            </div>
        );
    } else if (id === 'sys_node_msg_polish') {
        body = (
            <div className="">
                <Section title="Revizyon" />
                <Row label="Temizse Atla" desc="Zaten profesyonel görünen metni revize etme">
                    <Pill k="skip_if_already_clean" defaultVal={true} />
                </Row>
                <Row label="Min Karakter Eşiği" desc="Bu uzunluğun altındaki yanıtlar revize edilmez" noBorder>
                    <SNumInput k="min_chars_to_revise" min={0} />
                </Row>
            </div>
        );
    } else if (id === 'sys_node_critic') {
        body = (
            <div className="">
                <Section title="Denetim" />
                <Row label="JSON Kartları Otomatik Onayla" desc="error_solver / zli_finder JSON kartlarını denetimsiz geçir" noBorder>
                    <Pill k="auto_approve_json" defaultVal={true} />
                </Row>
            </div>
        );
    } else {
        const text = JSON.stringify(cfg, null, 2);
        body = (
            <div className="pt-1">
                <label className="block text-[9px] font-black text-stone-400 mb-2 uppercase tracking-widest">Ham JSON</label>
                <textarea
                    defaultValue={text}
                    onBlur={(e) => {
                        try {
                            const parsed = JSON.parse(e.target.value || '{}');
                            updateAgent('nodeConfig', parsed);
                        } catch { /* sessizce yoksay */ }
                    }}
                    className="w-full bg-stone-50 border border-stone-200 text-stone-700 text-xs font-mono rounded-lg px-3 py-2 min-h-[140px] outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 resize-none"
                />
                <p className="text-[10px] text-stone-400 mt-1.5">Geçersiz JSON yok sayılır.</p>
            </div>
        );
    }

    return (
        <_NCCtx.Provider value={{ cfg, setKey }}>
            {body}
        </_NCCtx.Provider>
    );
}

/* ── İşlem Botu için n8n Workflow Seçici ─────────────────────────── */
function RouterWorkflowPanel({ selectedItem, updateAgent }) {
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchWorkflows = async () => {
        setLoading(true);
        setError(false);
        try {
            const savedKey = localStorage.getItem('n8n_api_key') || '';
            const headers = savedKey ? { 'x-n8n-api-key': savedKey } : {};
            const res = await fetch('/api/n8n/workflows', { headers });
            const data = await res.json();
            if (data.success && data.workflows) {
                setWorkflows(data.workflows);
            } else {
                setError(true);
            }
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchWorkflows(); }, []);

    const allowedWorkflows = selectedItem.allowedWorkflows || [];

    const toggleWorkflow = (wf) => {
        const isSelected = allowedWorkflows.includes(wf.name);
        const newList = isSelected
            ? allowedWorkflows.filter(n => n !== wf.name)
            : [...allowedWorkflows, wf.name];

        updateAgent('allowedWorkflows', newList);

        // Prompt içindeki webhook listesini otomatik güncelle
        const webhookLine = newList.length > 0
            ? `Mevcut n8n webhook'ları: ${newList.join(', ')}`
            : `Mevcut n8n webhook'ları: (henüz seçilmedi)`;
        const updatedPrompt = (selectedItem.prompt || '').replace(
            /Mevcut n8n webhook'ları:.*$/m,
            webhookLine
        );
        updateAgent('prompt', updatedPrompt);
    };

    return (
        <>
            <div className="flex items-center gap-3 pt-5 pb-1.5">
                <span className="text-[9px] font-black tracking-[0.18em] text-stone-400 uppercase whitespace-nowrap">N8N Tetikleyiciler</span>
                <div className="flex-1 h-px bg-stone-100" />
                <button onClick={fetchWorkflows} className="p-1 rounded text-stone-300 hover:text-stone-500 transition-colors">
                    <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
            <div className="pb-1 border-b border-stone-100">
                {loading ? (
                    <div className="flex items-center gap-2 text-stone-400 text-[11px] py-3">
                        <Loader2 size={13} className="animate-spin" /> Workflow'lar yükleniyor…
                    </div>
                ) : error ? (
                    <div className="flex items-center gap-2 text-[#854F0B] text-[11px] bg-[#FAEEDA]/60 rounded-lg px-3 py-2 mt-1">
                        <AlertCircle size={12} /> n8n sunucusuna bağlanılamadı. API anahtarını kontrol edin.
                    </div>
                ) : workflows.length === 0 ? (
                    <p className="text-[11px] text-stone-400 py-3">n8n'de aktif workflow bulunamadı.</p>
                ) : (
                    <div className="space-y-1.5 py-2">
                        {workflows.map(wf => {
                            const isSelected = allowedWorkflows.includes(wf.name);
                            return (
                                <div
                                    key={wf.id}
                                    onClick={() => toggleWorkflow(wf)}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-all ${isSelected
                                        ? 'bg-white border-[#378ADD]/25 text-stone-700 font-bold shadow-sm'
                                        : 'bg-stone-50 border-stone-100 text-stone-500 font-medium hover:bg-stone-100'
                                    }`}
                                >
                                    {isSelected
                                        ? <CheckCircle2 size={14} className="text-[#378ADD] shrink-0" strokeWidth={2.5} />
                                        : <div className="w-3.5 h-3.5 rounded-full border-2 border-stone-300 shrink-0" />
                                    }
                                    <span className="flex-1">{wf.name}</span>
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${wf.active ? 'bg-[#1D9E75]' : 'bg-stone-300'}`} />
                                </div>
                            );
                        })}
                    </div>
                )}
                {allowedWorkflows.length > 0 && (
                    <p className="text-[10px] text-stone-400 pb-2 tracking-tight">
                        <span className="font-bold text-[#378ADD]">{allowedWorkflows.length}</span> workflow seçili — prompt otomatik güncellendi.
                    </p>
                )}
            </div>
        </>
    );
}

const AgentConfigPanel = ({ selectedItem, rags, updateAgent, toggleRagAccess }) => {
    const [fetchedModels, setFetchedModels] = React.useState([]);
    const [loadingModels, setLoadingModels] = React.useState(false);
    const [aliases, setAliases] = React.useState({});
    const [expandedRags, setExpandedRags] = useState({});
    const toggleRagAccordion = (e, ragId) => {
        e.stopPropagation();
        setExpandedRags(prev => ({
            ...prev,
            [ragId]: !prev[ragId]
        }));
    };

    const toggleFileAccess = (e, fileId) => {
        e.stopPropagation();
        const disabledKey = `!${fileId}`;
        const current = Array.isArray(selectedItem.allowedRags) ? selectedItem.allowedRags : [];
        const newAllowedRags = current.includes(disabledKey)
            ? current.filter(id => id !== disabledKey)
            : [...current, disabledKey];
        updateAgent('allowedRags', newAllowedRags);
    };

    React.useEffect(() => {
        setLoadingModels(true);
        // localStorage'dan takma adları (alias) çek
        try {
            const savedAliases = JSON.parse(localStorage.getItem('model_aliases') || '{}');
            setAliases(savedAliases);
        } catch (e) { }

        fetchWithTimeout(`${API_BASE}/catalog`)
            .then(r => r.json())
            .then(data => {
                if (data?.models) {
                    setFetchedModels(data.models);
                }
            })
            .catch(err => console.error("Modeller alınamadı:", err))
            .finally(() => setLoadingModels(false));
    }, []);

    const groupedModels = React.useMemo(() => {
        const groups = {};
        fetchedModels.forEach(m => {
            const p = m.provider || 'Custom';
            if (!groups[p]) groups[p] = [];
            groups[p].push(m);
        });
        return groups;
    }, [fetchedModels]);

    if (!selectedItem) return null;

    // ── Settings-tema primitifleri (ajan düzeyi alanlar için) ─────────────
    const ASection = ({ title }) => (
        <div className="flex items-center gap-3 pt-5 pb-1.5">
            <span className="text-[9px] font-black tracking-[0.18em] text-stone-400 uppercase whitespace-nowrap">{title}</span>
            <div className="flex-1 h-px bg-stone-100" />
        </div>
    );

    const ARow = ({ label, desc, children, noBorder }) => (
        <div className={`flex items-center gap-4 py-3 ${noBorder ? '' : 'border-b border-stone-100'}`}>
            <div className="flex-shrink-0" style={{ width: '42%' }}>
                <div className="text-[12px] font-semibold text-stone-700 leading-snug">{label}</div>
                {desc && <div className="text-[10px] text-stone-400 mt-0.5 leading-snug">{desc}</div>}
            </div>
            <div className="flex-1 min-w-0">{children}</div>
        </div>
    );

    const APill = ({ field }) => {
        const on = !!selectedItem[field];
        return (
            <div className="flex justify-end">
                <button type="button" onClick={() => updateAgent(field, !on)}
                    className={`relative w-[38px] h-[20px] rounded-full transition-colors focus:outline-none ${on ? 'bg-[#D44B4B]' : 'bg-stone-200'}`}>
                    <span className={`absolute top-[2px] w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-150 ${on ? 'left-[20px]' : 'left-[2px]'}`} />
                </button>
            </div>
        );
    };

    const ASlider = ({ field, min, max, step, fmt, defaultVal }) => {
        const raw = selectedItem[field];
        const val = (raw !== undefined && raw !== null && !isNaN(Number(raw))) ? Number(raw) : (defaultVal ?? min);
        return (
            <div className="flex items-center gap-3">
                <span className="text-[13px] font-black text-[#378ADD] font-mono tabular-nums" style={{ minWidth: 40, textAlign: 'right' }}>
                    {fmt ? fmt(val) : val}
                </span>
                <div className="flex-1">
                    <input type="range" min={min} max={max} step={step} value={val}
                        onChange={(e) => updateAgent(field, step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
                        className="w-full h-[3px] bg-stone-200 rounded-full appearance-none cursor-pointer accent-[#D44B4B]" />
                    <div className="flex justify-between mt-0.5">
                        <span className="text-[9px] text-stone-300 font-mono">{min}</span>
                        <span className="text-[9px] text-stone-300 font-mono">{max}</span>
                    </div>
                </div>
            </div>
        );
    };

    const AInput = ({ field, type = 'text', min, max, placeholder, mono }) => (
        <input type={type} min={min} max={max} placeholder={placeholder}
            value={selectedItem[field] ?? ''}
            onChange={e => updateAgent(field, type === 'number' ? parseInt(e.target.value) : e.target.value)}
            className={`w-full bg-white border border-stone-200 text-stone-700 text-[12px] rounded-lg px-3 py-2 outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 transition-all placeholder:text-stone-300 ${mono ? 'font-mono font-black text-right' : 'font-semibold'}`}
        />
    );

    return (
        <div className="px-5 pb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* ── DAVRANMIŞ ── */}
            <ASection title="Davranış" />
            <ARow label="Rol / Yeteneği" desc="Bu ajanın uzmanlık tanımı">
                <AInput field="persona" placeholder="Örn: Finansal Asistan, Müşteri Temsilcisi" />
            </ARow>
            <ARow label="Zekâ Modeli" desc="Yapay zeka motoru">
                <div className="flex items-center gap-1.5">
                    <select
                        value={fetchedModels.find(m => m.name === selectedItem.model) ? selectedItem.model : ''}
                        onChange={(e) => updateAgent('model', e.target.value)}
                        className="flex-1 min-w-0 bg-white border border-stone-200 text-stone-700 text-[12px] font-semibold rounded-lg px-3 py-2 outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 cursor-pointer transition-all"
                    >
                        {loadingModels
                            ? <option value="">Yükleniyor…</option>
                            : fetchedModels.length === 0
                                ? <option value="">— Model bulunamadı —</option>
                                : <>
                                    <option value="">Seçin…</option>
                                    {Object.entries(groupedModels).map(([prov, mList]) => (
                                        <optgroup key={prov} label={prov}>
                                            {mList.map(m => (
                                                <option key={m.id} value={m.name}>
                                                    {aliases[m.id] ? `${aliases[m.id]} (${m.name})` : m.name}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </>
                        }
                    </select>
                    <button type="button"
                        onClick={() => updateAgent('modelLocked', !selectedItem.modelLocked)}
                        title={selectedItem.modelLocked ? 'Kilitli — kilidi kaldırmak için tıkla' : 'Kilitsiz — kilitlemek için tıkla'}
                        className={`shrink-0 p-2 rounded-lg border transition-all focus:outline-none ${selectedItem.modelLocked
                            ? 'bg-[#FEF2F2] border-[#DC2626]/30 text-[#DC2626]'
                            : 'bg-white border-stone-200 text-stone-300 hover:text-[#DC2626] hover:border-[#DC2626]/30'}`}>
                        {selectedItem.modelLocked ? <Lock size={13} strokeWidth={2.5} /> : <Unlock size={13} strokeWidth={2} />}
                    </button>
                </div>
                {selectedItem.modelLocked && (
                    <p className="text-[10px] text-[#DC2626]/60 mt-1 flex items-center gap-1">
                        <Lock size={9} strokeWidth={2.5} /> ChatBar model değişikliğinden etkilenmez
                    </p>
                )}
            </ARow>
            {selectedItem.agentKind === 'chatbot' && (
                <ARow label="Konuşma Hafızası" desc="Son kaç mesajı hatırlasın">
                    <AInput field="chatHistoryLength" type="number" min={1} max={50} mono />
                </ARow>
            )}
            <ARow label="Yaratıcılık" desc="0 = analitik · 1 = dengeli · 2 = serbest">
                <ASlider field="temp" min={0} max={2} step={0.1} defaultVal={0.7} fmt={v => v.toFixed(1)} />
            </ARow>
            <ARow label="Maks. Çıktı (Token)" desc="Daha kısa = daha düşük maliyet">
                <AInput field="maxTokens" type="number" min={1} mono />
            </ARow>

            {/* ── GÖREV TANIMI ── */}
            <ASection title="Görev Tanımı & Talimatlar" />
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-stone-100">
                <div>
                    <div className="text-[9px] font-black tracking-[0.15em] text-stone-400 uppercase mb-2 flex items-center gap-1.5">
                        <CheckCircle2 size={10} className="text-stone-300" /> Pozitif Görevler
                    </div>
                    <textarea value={selectedItem.prompt} onChange={(e) => updateAgent('prompt', e.target.value)}
                        className="w-full bg-white border border-stone-200 text-stone-700 text-[12px] font-medium rounded-lg px-3 py-2.5 outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 min-h-[130px] resize-none leading-relaxed transition-all placeholder:text-stone-300"
                        placeholder="Görevi ve beklentileri girin…" />
                </div>
                <div>
                    <div className="text-[9px] font-black tracking-[0.15em] text-stone-400 uppercase mb-2 flex items-center gap-1.5">
                        <ShieldCheck size={10} className="text-stone-300" /> Kısıtlamalar
                    </div>
                    <textarea value={selectedItem.negativePrompt} onChange={(e) => updateAgent('negativePrompt', e.target.value)}
                        className="w-full bg-white border border-stone-200 text-stone-700 text-[12px] font-medium rounded-lg px-3 py-2.5 outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 min-h-[130px] resize-none leading-relaxed transition-all placeholder:text-stone-300"
                        placeholder="Örn: Fiyat verme, siyaset konuşma…" />
                </div>
            </div>

            {/* ── BİLGİ KAYNAĞI ── */}
            {(selectedItem.agentKind === 'chatbot' ||
              selectedItem.id === 'sys_node_rag_search') && (
                <>
                    <ASection title="Bilgi Kaynağı (Vektör Havuzları)" />
                    {rags.map((rag, ri) => {
                        const arr = Array.isArray(selectedItem.allowedRags) ? selectedItem.allowedRags : [];
                        const hasAccess = arr.includes(rag.id);
                        const isExpanded = expandedRags[rag.id];
                        const isLast = ri === rags.length - 1 && !isExpanded;
                        return (
                            <div key={rag.id}>
                                {/* Havuz satırı */}
                                <div className={`flex items-center gap-4 py-3 ${isLast ? '' : 'border-b border-stone-100'}`}>
                                    <div className="flex-shrink-0 cursor-pointer select-none" style={{ width: '42%' }}
                                        onClick={() => toggleRagAccess(selectedItem.id, rag.id)}>
                                        <div className={`text-[12px] font-semibold leading-snug transition-colors ${hasAccess ? 'text-stone-700' : 'text-stone-400'}`}>
                                            {rag.name}
                                        </div>
                                        {rag.files?.length > 0 && (
                                            <div className="text-[10px] text-stone-400 mt-0.5">
                                                {rag.files.length} dosya
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 flex items-center justify-end gap-3">
                                        {/* Pill — havuz erişimi */}
                                        <button type="button"
                                            onClick={() => toggleRagAccess(selectedItem.id, rag.id)}
                                            className={`relative w-[38px] h-[20px] rounded-full transition-colors focus:outline-none flex-shrink-0 ${hasAccess ? 'bg-[#D44B4B]' : 'bg-stone-200'}`}>
                                            <span className={`absolute top-[2px] w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-150 ${hasAccess ? 'left-[20px]' : 'left-[2px]'}`} />
                                        </button>
                                        {/* Akordeon aç/kapat */}
                                        {rag.files?.length > 0 && (
                                            <button type="button"
                                                onClick={(e) => toggleRagAccordion(e, rag.id)}
                                                className="text-stone-300 hover:text-stone-500 transition-colors focus:outline-none">
                                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Dosya alt-satırları */}
                                {isExpanded && rag.files && (
                                    <div className="pl-4 border-b border-stone-100 animate-in slide-in-from-top-1 fade-in duration-150">
                                        {rag.files.map((file, fi) => {
                                            const isDisabled = arr.includes(`!${file.id}`);
                                            const isLastFile = fi === rag.files.length - 1;
                                            return (
                                                <div key={file.id}
                                                    className={`flex items-center gap-4 py-2.5 cursor-pointer ${isLastFile ? '' : 'border-b border-stone-50'}`}
                                                    onClick={(e) => toggleFileAccess(e, file.id)}>
                                                    <div className="flex-shrink-0 flex items-center gap-2 min-w-0" style={{ width: '42%' }}>
                                                        <FileText size={11} className={`shrink-0 ${isDisabled ? 'text-stone-300' : 'text-stone-400'}`} />
                                                        <span className={`text-[11px] font-medium truncate leading-snug ${isDisabled ? 'text-stone-300 line-through' : 'text-stone-600'}`}>
                                                            {file.filename}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 flex justify-end">
                                                        <button type="button"
                                                            onClick={(e) => toggleFileAccess(e, file.id)}
                                                            className={`relative w-[34px] h-[18px] rounded-full transition-colors focus:outline-none ${!isDisabled ? 'bg-[#D44B4B]' : 'bg-stone-200'}`}>
                                                            <span className={`absolute top-[2px] w-[14px] h-[14px] bg-white rounded-full shadow-sm transition-all duration-150 ${!isDisabled ? 'left-[18px]' : 'left-[2px]'}`} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <div className="border-b border-stone-100" />
                </>
            )}

            {/* ── N8N TETİKLEYİCİLER ── */}
            {(selectedItem.agentKind === 'router' || selectedItem.id === 'sys_node_n8n_trigger') && (
                <RouterWorkflowPanel selectedItem={selectedItem} updateAgent={updateAgent} />
            )}

            {/* ── NODE YAPILANDIRMASI ── */}
            {selectedItem.agentKind === 'graph_node' && (
                <NodeConfigPanel selectedItem={selectedItem} updateAgent={updateAgent} />
            )}

            {/* ── AKILLI DENETİM (chatbot) ── */}
            {selectedItem.agentKind === 'chatbot' && (
                <>
                    <ASection title="Akıllı Denetim" />
                    <ARow label="Sıkı Doğruluk" desc="RAG dışına çıkılmasını yasaklar">
                        <APill field="strictFactCheck" />
                    </ARow>
                    <ARow label="Takip Sorusu Önerisi" desc="Cevap bitince akıllı öneriler çıkar" noBorder>
                        <APill field="canAskFollowUp" />
                    </ARow>
                    <ASection title="Takip Soruları" />
                    <FollowupSection />
                    <div className="pt-3">
                        <div className="text-[9px] font-black tracking-[0.15em] text-stone-400 uppercase mb-2">Hata Durumu Yanıtı</div>
                        <textarea value={selectedItem.errorMessage} onChange={e => updateAgent('errorMessage', e.target.value)}
                            className="w-full bg-white border border-stone-200 text-stone-700 text-[12px] font-medium rounded-lg px-3 py-2.5 outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]/20 resize-none min-h-[80px] placeholder:text-stone-300 transition-all"
                            placeholder="Bilgi bulamazsa kullanıcıya ne desin?" />
                    </div>
                </>
            )}
        </div>
    );
};

export default AgentConfigPanel;
