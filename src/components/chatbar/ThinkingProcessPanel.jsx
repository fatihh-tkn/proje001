import React, { useState, useMemo } from 'react';
import {
    BrainCircuit, ChevronDown, ChevronUp, Check, FileText, Database,
    Search, Sparkles, MessageSquare, Network, Image as ImageIcon, Square, Paperclip, Cpu, Clock, Zap,
    GitBranch, Wand2, Wrench, Webhook, AlertTriangle
} from 'lucide-react';

// LangGraph node adı → ikon + insan-okur etiket
const GRAPH_NODE_META = {
    supervisor:   { icon: GitBranch,  label: 'Plan üretildi',         accent: '#7c3aed' },
    rag_search:   { icon: Search,     label: 'Bilgi tabanı tarandı',  accent: '#0ea5e9' },
    error_solver: { icon: Wrench,     label: 'Hata çözümleyicisi',    accent: '#dc2626' },
    zli_finder:   { icon: Database,   label: "Z'li rapor sorgusu",    accent: '#0891b2' },
    n8n_trigger:  { icon: Webhook,    label: 'Otomasyon karar motoru', accent: '#16a34a' },
    aggregator:   { icon: Sparkles,   label: 'Cevap üretildi',        accent: '#2563eb' },
    msg_polish:   { icon: Wand2,      label: 'Mesaj revize edildi',   accent: '#a855f7' },
};

const INTENT_LABEL = {
    general:     'Genel sohbet',
    hata_cozumu: 'Hata çözümü',
    rapor_arama: "Z'li rapor arama",
    n8n:         'n8n otomasyon',
    dosya_qa:    'Dosya QA',
};

/**
 * Düşünme Süreci paneli — bir AI mesajının altında, logonun yanında küçük bir
 * chip olarak görünür. Tıklanınca aşağıya doğru zaman çizelgesi açılır:
 * süreç adımları, kullanılan kaynaklar, süre vb.
 *
 * Backend'den gelen gerçek verilerle beslenecek şekilde güncellendi:
 * model, provider, promptTokens, completionTokens, backendDurationMs
 */

const fmtDuration = (ms) => {
    if (!ms || ms < 0) return '';
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(1)} sn`;
};

const ThinkingProcessPanel = ({ message }) => {
    const [open, setOpen] = useState(false);

    const steps = useMemo(() => {
        const arr = [];
        const userQuery = (message.userQuery || '').trim();
        const graphNodes = Array.isArray(message.graphNodes) ? message.graphNodes : [];
        const graphErrors = Array.isArray(message.graphErrors) ? message.graphErrors : [];
        const isGraph = graphNodes.length > 0;

        // 1) Soru analizi
        arr.push({
            icon: MessageSquare,
            label: 'Mesaj alındı ve yorumlandı',
            detail: userQuery
                ? (userQuery.length > 80 ? `"${userQuery.slice(0, 78)}…"` : `"${userQuery}"`)
                : null,
        });

        // ── LangGraph yolu: per-node timeline ─────────────────────────
        if (isGraph) {
            // Plan/intent başlık adımı (supervisor sonrası)
            if (message.graphIntent || message.graphPlan?.length) {
                const intentLbl = INTENT_LABEL[message.graphIntent] || message.graphIntent;
                const planTxt = (message.graphPlan || []).join(' · ');
                arr.push({
                    icon: GitBranch,
                    label: intentLbl ? `Akış planlandı: ${intentLbl}` : 'Akış planlandı',
                    detail: planTxt
                        ? `Paralel ajanlar → ${planTxt}`
                        : (message.graphReasoning || null),
                    accent: '#7c3aed',
                });
            }

            // Her tamamlanan node için bir adım — supervisor zaten yukarıda.
            // Aynı node birden fazla event yayabilir; ilk tamamlanmayı al.
            const seen = new Set(['supervisor']);
            for (const ev of graphNodes) {
                if (!ev || ev.phase !== 'completed') continue;
                if (seen.has(ev.node)) continue;
                seen.add(ev.node);
                const meta = GRAPH_NODE_META[ev.node] || {
                    icon: Cpu, label: ev.node, accent: '#64748b',
                };
                arr.push({
                    icon: meta.icon,
                    label: meta.label,
                    detail: typeof ev.elapsedMs === 'number' ? fmtDuration(ev.elapsedMs) : null,
                    accent: meta.accent,
                });
            }

            // Hata olduysa kırmızı uyarı
            for (const err of graphErrors) {
                const meta = GRAPH_NODE_META[err.node] || { label: err.node };
                arr.push({
                    icon: AlertTriangle,
                    label: `Uyarı: ${meta.label}`,
                    detail: (err.text || '').slice(0, 120),
                    accent: '#d97706',
                });
            }
        }

        // 2) Hızlı aksiyon
        if (message.command) {
            arr.push({
                icon: Sparkles,
                label: `Hızlı aksiyon modu: ${message.command.label}`,
                detail: 'Bu modun şablonu sistem promptuna eklendi',
                accent: '#7c3aed',
            });
        }

        // 3) Ekli dosyalar
        if (Array.isArray(message.attachedFileNames) && message.attachedFileNames.length > 0) {
            arr.push({
                icon: Paperclip,
                label: `${message.attachedFileNames.length} dosya bağlamı kullanıldı`,
                detail: message.attachedFileNames.slice(0, 3).join(', ') +
                    (message.attachedFileNames.length > 3 ? ` (+${message.attachedFileNames.length - 3})` : ''),
            });
        }

        // 4) RAG araması — graph yolunda rag_search adımı zaten yukarıda; sadece
        // klasik akışta "tarandı" başlığını ekle, kaynak chip'lerini ise her iki
        // akışta da göster.
        if (message.ragUsed) {
            if (!isGraph) {
                arr.push({
                    icon: Search,
                    label: 'Bilgi tabanı tarandı',
                    detail: 'Hibrit arama (vektör + tam metin) çalıştırıldı',
                });
            }

            const sources = (message.ragSources || []).filter(s => s && typeof s === 'object');
            if (sources.length > 0) {
                const withScore = sources.filter(s => typeof s.score === 'number');
                let relevant = sources;
                if (withScore.length > 0) {
                    const sorted = [...withScore].sort((a, b) => (b.score || 0) - (a.score || 0));
                    const top = sorted[0]?.score || 0;
                    const cutoff = Math.max(top * 0.5, 0.05);
                    relevant = sorted.filter(s => (s.score || 0) >= cutoff).slice(0, 4);
                } else {
                    relevant = sources.slice(0, 3);
                }

                const fileSet = new Set(relevant.map(s => (s.file || '').match(/[^/\\]+$/)?.[0] || s.file).filter(Boolean));
                const types = new Set(relevant.map(s => {
                    const f = (s.file || '').toLowerCase();
                    if ((s.chunk_type || '').startsWith('bpmn') || f.endsWith('.bpmn')) return 'BPMN';
                    if (s.image_path) return 'Görsel';
                    if (f.endsWith('.pptx') || f.endsWith('.ppt')) return 'Slayt';
                    if (f.endsWith('.pdf')) return 'PDF';
                    return 'Belge';
                }));

                arr.push({
                    icon: Database,
                    label: `${relevant.length} alakalı kaynak seçildi`,
                    detail: `${fileSet.size} dosya · ${[...types].join(', ')}`,
                    sources: relevant,
                });
            }
        } else if (!isGraph) {
            arr.push({
                icon: BrainCircuit,
                label: 'Genel bilgi ile yanıtlandı',
                detail: 'Bilgi tabanından eşleşme bulunmadı; modelin kendi bilgisi kullanıldı',
            });
        }

        // 5) Model bilgisi (gerçek backend verisi)
        if (message.model) {
            const tokenInfo = [];
            if (message.promptTokens) tokenInfo.push(`giriş: ${message.promptTokens}`);
            if (message.completionTokens) tokenInfo.push(`çıkış: ${message.completionTokens}`);
            const tokenText = tokenInfo.length > 0 ? ` · ${tokenInfo.join(', ')} token` : '';

            arr.push({
                icon: Cpu,
                label: `${message.provider || 'AI'} — ${message.model}`,
                detail: tokenText ? tokenText.trim().replace(/^ · /, '') : null,
                accent: '#2563eb',
            });
        }

        // 6) Yanıt
        // Server-side süreyi gerçek veriden al, yoksa client-side'ı kullan
        const duration = message.backendDurationMs
            || ((message.completedAt && message.startedAt) ? message.completedAt - message.startedAt : null);

        if (message.isAborted) {
            arr.push({
                icon: Square,
                label: 'Kullanıcı tarafından durduruldu',
                detail: duration ? `${fmtDuration(duration)} sonra` : null,
                accent: '#6b7280',
            });
        } else {
            arr.push({
                icon: Check,
                label: 'Yanıt tamamlandı',
                detail: duration ? fmtDuration(duration) : null,
                accent: '#059669',
            });
        }

        return arr;
    }, [message]);

    // Gerçek backend süresi veya client-side süre
    const totalMs = message.backendDurationMs
        || ((message.completedAt && message.startedAt) ? message.completedAt - message.startedAt : null);

    return (
        <div className="no-toggle">
            {/* Trigger chip */}
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
                className={`inline-flex items-center gap-1.5 text-[10px] font-semibold rounded-full px-2 py-0.5 border transition-all
                    ${open
                        ? 'bg-[#FEF2F2]/70 border-[#DC2626]/30 text-[#DC2626]'
                        : 'bg-white/70 border-stone-200 text-stone-500 hover:border-[#DC2626]/30 hover:text-[#DC2626]'
                    }`}
                title="AI'ın bu yanıtı oluştururken izlediği akış"
            >
                <BrainCircuit size={11} className={open ? 'text-[#DC2626]' : 'text-stone-400'} />
                <span>Süreç</span>
                {totalMs != null && (
                    <span className="font-mono opacity-70">· {fmtDuration(totalMs)}</span>
                )}
                {open
                    ? <ChevronUp size={10} />
                    : <ChevronDown size={10} />
                }
            </button>

            {/* Timeline panel */}
            {open && (
                <div className="mt-1.5 bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden max-w-[560px]">
                    <div className="px-3.5 py-2 border-b border-stone-100 flex items-center gap-2 bg-gradient-to-r from-stone-50 to-white">
                        <BrainCircuit size={12} className="text-[#DC2626]/80" />
                        <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Düşünme Süreci</span>
                        <span className="ml-auto text-[10px] text-stone-400">{steps.length} adım</span>
                    </div>

                    <ol className="px-3.5 py-2.5 relative">
                        {/* Dikey bağlantı çizgisi */}
                        <span className="absolute left-[22px] top-3 bottom-3 w-px bg-stone-200/80" aria-hidden="true" />

                        {steps.map((s, i) => {
                            const Icon = s.icon || Check;
                            const accent = s.accent || '#DC2626';
                            return (
                                <li key={i} className="relative flex items-start gap-2.5 py-1.5">
                                    <span
                                        className="relative z-10 shrink-0 w-5 h-5 rounded-full inline-flex items-center justify-center"
                                        style={{
                                            color: accent,
                                            backgroundColor: accent + '14',
                                            borderColor: accent + '33',
                                            borderWidth: 1,
                                            borderStyle: 'solid',
                                        }}
                                    >
                                        <Icon size={10} />
                                    </span>
                                    <div className="flex-1 min-w-0 pt-px">
                                        <div className="text-[12px] font-semibold text-stone-800 leading-snug">
                                            {s.label}
                                        </div>
                                        {s.detail && (
                                            <div className="text-[11px] text-stone-500 leading-snug mt-0.5 [overflow-wrap:anywhere]">
                                                {s.detail}
                                            </div>
                                        )}
                                        {Array.isArray(s.sources) && s.sources.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {s.sources.map((src, j) => {
                                                    const fname = (src.file || '').match(/[^/\\]+$/)?.[0] || src.file || '?';
                                                    const isBpmn = (src.chunk_type || '').startsWith('bpmn') || fname.toLowerCase().endsWith('.bpmn');
                                                    const SrcIcon = isBpmn ? Network : src.image_path ? ImageIcon : FileText;
                                                    return (
                                                        <span
                                                            key={j}
                                                            className="inline-flex items-center gap-1 text-[10px] bg-stone-50 border border-stone-200 text-stone-600 rounded-md px-1.5 py-0.5 max-w-[180px]"
                                                            title={fname + (src.page ? ` · s.${src.page}` : '')}
                                                        >
                                                            <SrcIcon size={9} className="shrink-0 text-stone-400" />
                                                            <span className="truncate">{fname}</span>
                                                            {src.page && <span className="text-stone-300 shrink-0">s.{src.page}</span>}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            )}
        </div>
    );
};

export default ThinkingProcessPanel;
