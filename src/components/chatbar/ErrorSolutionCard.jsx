import React, { useState, useRef, useCallback } from 'react';
import {
    AlertTriangle, ListChecks, Paperclip, GitBranch, ChevronDown, ChevronUp,
    BookmarkPlus, FileText, HelpCircle, Send, Loader2, Image, X,
    CheckCircle2, SkipForward, Upload,
} from 'lucide-react';
import { mutate } from '../../api/client';

const SEVERITY_STYLES = {
    low:      { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Düşük' },
    medium:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   label: 'Orta' },
    high:     { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  label: 'Yüksek' },
    critical: { bg: 'bg-red-50',     text: 'text-[#DC2626]',   border: 'border-red-200',     label: 'Kritik' },
};

const SeverityPill = ({ level }) => {
    const s = SEVERITY_STYLES[level] || SEVERITY_STYLES.medium;
    return (
        <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.bg} ${s.text} ${s.border}`}>
            {s.label}
        </span>
    );
};

const SectionToggle = ({ icon, iconWrap, title, count, open, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-stone-50/80 transition text-left"
    >
        <span className={`w-5 h-5 inline-flex items-center justify-center rounded-md ${iconWrap}`}>
            {icon}
        </span>
        <span className="flex-1 text-[11.5px] font-semibold text-stone-700 tracking-wide">
            {title}
        </span>
        {count != null && (
            <span className="text-[10px] text-stone-400 font-mono">{count}</span>
        )}
        {open
            ? <ChevronUp size={13} className="text-stone-400" />
            : <ChevronDown size={13} className="text-stone-400" />}
    </button>
);

/* ── Önceki tur özeti (collapsed) ─────────────────────────────────── */
const PreviousRoundSummary = ({ round, qaItems }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="border-b border-amber-50">
            <button
                type="button"
                onClick={() => setOpen(p => !p)}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-amber-50/30 transition text-left"
            >
                <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                <span className="flex-1 text-[11px] font-medium text-stone-600">
                    Tur {round} cevapları ({qaItems.length} soru)
                </span>
                {open
                    ? <ChevronUp size={11} className="text-stone-400" />
                    : <ChevronDown size={11} className="text-stone-400" />}
            </button>
            {open && (
                <div className="px-5 pb-3 space-y-1.5">
                    {qaItems.map((qa, i) => (
                        <div key={i} className="text-[11px]">
                            <span className="text-stone-500">{qa.question || `Soru ${i + 1}`}: </span>
                            <span className="text-stone-700 font-medium">{qa.answer || '—'}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ── Screenshot dropzone ───────────────────────────────────────────── */
const ScreenshotZone = ({ screenshot, onScreenshot, onClear, disabled, inline = false }) => {
    const [isDrag, setIsDrag] = useState(false);
    const inputRef = useRef(null);

    const readFile = useCallback((file) => {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => onScreenshot(e.target.result.split(',')[1], file.type);
        reader.readAsDataURL(file);
    }, [onScreenshot]);

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDrag(false);
        const file = e.dataTransfer.files?.[0];
        if (file) readFile(file);
    };

    // inline=true → soru içinde kullanılıyor, kart-içi marginleri aç
    const wrapClass = inline ? '' : 'mx-5 mb-3';

    if (screenshot) {
        return (
            <div className={`${wrapClass} flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2`}>
                <Image size={13} className="text-emerald-600 shrink-0" />
                <span className="flex-1 text-[11px] text-emerald-700 font-medium truncate">
                    Ekran görüntüsü eklendi
                </span>
                <button
                    type="button"
                    disabled={disabled}
                    onClick={onClear}
                    className="text-stone-400 hover:text-stone-600 disabled:opacity-40"
                >
                    <X size={12} />
                </button>
            </div>
        );
    }

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setIsDrag(true); }}
            onDragLeave={() => setIsDrag(false)}
            onDrop={handleDrop}
            onClick={() => !disabled && inputRef.current?.click()}
            className={`${wrapClass} flex items-center gap-2 rounded-lg px-3 py-2 border border-dashed cursor-pointer transition
                ${isDrag
                    ? 'bg-amber-50 border-amber-400'
                    : 'bg-stone-50/60 border-stone-200 hover:border-amber-300 hover:bg-amber-50/30'}
                ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
            <Upload size={12} className="text-stone-400 shrink-0" />
            <span className="text-[10.5px] text-stone-400">
                {inline
                    ? 'Sürükle bırak veya tıklayarak görsel ekle'
                    : <>Ekran görüntüsü ekle <span className="text-stone-300">(opsiyonel — sürükle veya tıkla)</span></>}
            </span>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={disabled}
                onChange={(e) => readFile(e.target.files?.[0])}
            />
        </div>
    );
};

/* ── Ana bileşen ───────────────────────────────────────────────────── */
const ErrorSolutionCard = ({ data, userId, sessionId, onSendFollowup, onClarificationContinue }) => {
    const [openSection, setOpenSection] = useState('steps');
    const [saveStatus, setSaveStatus] = useState('idle');
    const [answers, setAnswers] = useState({});
    const [screenshot, setScreenshot] = useState(null);   // { base64, mime }
    const [submitting, setSubmitting] = useState(false);
    const toggle = (k) => setOpenSection(openSection === k ? null : k);

    const {
        id, title, module, severity, frequency, summary, cause,
        needs_clarification = false,
        clarification_questions = [],
        round = 1,
        max_rounds = 3,
        original_error = '',
        qa_history = [],
    } = data || {};

    const steps   = Array.isArray(data?.steps)   ? data.steps   : [];
    const docs    = Array.isArray(data?.docs)     ? data.docs    : [];
    const similar = Array.isArray(data?.similar)  ? data.similar : [];

    /* Sorular normalize (string uyumu + input_type tespiti) */
    const normalizedQuestions = (clarification_questions || []).map((q, i) => {
        if (typeof q === 'string') {
            return { id: `q${i + 1}`, question: q, input_type: 'text', options: [], allow_other: true };
        }
        const opts = Array.isArray(q.options) ? q.options : [];
        // input_type LLM'den geldiyse ona güven; yoksa options sayısına göre tahmin et
        const inputType = q.input_type
            || (opts.length > 0 ? 'choice' : 'text');
        return {
            id: q.id || `q${i + 1}`,
            question: q.question || '',
            input_type: inputType,
            options: opts,
            allow_other: q.allow_other !== false,
        };
    });

    /* Herhangi bir soru screenshot istiyorsa, alt kısımdaki global dropzone gizlenir
       (cevap inline alandan veriliyor zaten). */
    const hasScreenshotQuestion = normalizedQuestions.some(q => q.input_type === 'screenshot');

    const setAnswer     = (qId, value, isOther = false) =>
        setAnswers(p => ({ ...p, [qId]: { value, isOther } }));
    const setOtherText  = (qId, text) =>
        setAnswers(p => ({ ...p, [qId]: { value: text, isOther: true } }));

    const answeredCount = normalizedQuestions.filter(q => {
        const a = answers[q.id];
        return a && (a.value || '').trim().length > 0;
    }).length;

    const canSubmit = answeredCount >= 1 && !submitting && !!onClarificationContinue;

    /* Cevapları Q&A history formatına çevir */
    const buildQaEntry = () =>
        normalizedQuestions
            .map(q => {
                const a = answers[q.id];
                const val = (a?.value || '').trim();
                if (!val) return null;
                return { question: q.question, answer: val, is_other: !!a?.isOther };
            })
            .filter(Boolean);

    const handleClarificationSubmit = (e) => {
        e?.preventDefault?.();
        if (!canSubmit) return;
        setSubmitting(true);

        const newEntries  = buildQaEntry();
        const fullHistory = [...(qa_history || []), ...newEntries];

        onClarificationContinue({
            originalError:   original_error || summary || '',
            qaHistory:       fullHistory,
            screenshotBase64: screenshot?.base64 || null,
            screenshotMime:  screenshot?.mime || 'image/jpeg',
            roundNumber:     round,
            forceSolve:      false,
        });
    };

    /* Vazgeç — elindeki bilgiyle çözüm iste */
    const handleSkip = () => {
        if (submitting || !onClarificationContinue) return;
        setSubmitting(true);
        const newEntries  = buildQaEntry();
        const fullHistory = [...(qa_history || []), ...newEntries];
        onClarificationContinue({
            originalError:   original_error || summary || '',
            qaHistory:       fullHistory,
            screenshotBase64: screenshot?.base64 || null,
            screenshotMime:  screenshot?.mime || 'image/jpeg',
            roundNumber:     round,
            forceSolve:      true,
        });
    };

    const handleSave = async () => {
        if (!userId) { alert('Bu çözümü kaydetmek için giriş yapmalısınız.'); return; }
        setSaveStatus('saving');
        try {
            await mutate.create('/api/errors/user-record', {
                kullanici_id: userId,
                hata_kodu: id || null,
                baslik: title || 'Adsız Hata',
                modul: module || null,
                severity: severity || null,
                ozet: summary || null,
                cevap_json: data,
                oturum_id: sessionId || null,
            }, { subject: 'Hata çözümü', detail: title || id });
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2500);
        } catch {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 2500);
        }
    };

    /* ── Clarification modu ──────────────────────────────────────────── */
    if (needs_clarification) {
        const isLastRound = round >= max_rounds;
        const isSingleRound = max_rounds <= 1;

        return (
            <div
                className="card-fade-in w-full max-w-[680px] bg-white border border-amber-200 rounded-2xl shadow-sm overflow-hidden"
                style={{ fontFamily: 'Söhne, ui-sans-serif, system-ui, sans-serif' }}
            >
                {/* Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-white border-b border-amber-100 flex items-center gap-3 flex-wrap">
                    <span className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 shrink-0">
                        <HelpCircle size={14} />
                    </span>
                    {id && (
                        <span className="font-mono text-[11px] text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md">
                            {id}
                        </span>
                    )}
                    <h2 className="text-[13px] font-semibold text-stone-800 flex-1 min-w-0 truncate">
                        {title || 'Hatayı netleştirelim'}
                    </h2>
                    {/* Tur göstergesi — yalnızca çoklu tur kalmışsa anlamlı */}
                    {!isSingleRound && (
                        <span className="text-[10px] font-mono text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                            Tur {round}/{max_rounds}
                        </span>
                    )}
                </div>

                {/* Önceki turların özeti */}
                {(qa_history || []).length > 0 && (() => {
                    // Turları grupla (her tur kendi collapsed bloğu)
                    // qa_history düz liste — turları sorgu sayısına göre bölmek
                    // yerine tümünü tek blokta göster (tur 1 cevapları)
                    return (
                        <PreviousRoundSummary
                            round={round - 1}
                            qaItems={qa_history}
                        />
                    );
                })()}

                {/* Özet */}
                {summary && (
                    <div className="px-5 py-3 border-b border-amber-50">
                        <p className="text-[12.5px] leading-relaxed text-stone-700">{summary}</p>
                    </div>
                )}

                {/* Sorular — input_type'a göre dinamik render */}
                {normalizedQuestions.length > 0 && (
                    <div className="divide-y divide-amber-50">
                        {normalizedQuestions.map((q, qi) => {
                            const a = answers[q.id];
                            const otherChosen = !!(a && a.isOther);
                            const isText       = q.input_type === 'text';
                            const isScreenshot = q.input_type === 'screenshot';
                            const isChoice     = !isText && !isScreenshot;

                            return (
                                <div key={q.id} className="px-5 py-3.5">
                                    <div className="flex items-start gap-2 mb-2.5">
                                        <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                                            {qi + 1}
                                        </span>
                                        <h4 className="text-[12.5px] font-semibold text-stone-800 leading-snug flex-1">
                                            {q.question}
                                        </h4>
                                        {isScreenshot && (
                                            <Image size={12} className="text-stone-400 shrink-0 mt-0.5" title="Görsel cevap" />
                                        )}
                                    </div>

                                    {/* CHOICE — şıklar */}
                                    {isChoice && q.options.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 ml-7">
                                            {q.options.map((opt, oi) => {
                                                const isOtherOpt = (opt || '').toLowerCase().startsWith('diğer');
                                                const selected = isOtherOpt
                                                    ? otherChosen
                                                    : a && !a.isOther && a.value === opt;
                                                return (
                                                    <button
                                                        key={oi}
                                                        type="button"
                                                        disabled={submitting}
                                                        onClick={() => {
                                                            if (isOtherOpt) setOtherText(q.id, '');
                                                            else setAnswer(q.id, opt, false);
                                                        }}
                                                        className={`text-[11.5px] px-2.5 py-1 rounded-full border transition disabled:opacity-50 ${
                                                            selected
                                                                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                                                : 'bg-white text-stone-700 border-stone-200 hover:border-amber-300 hover:bg-amber-50/40'
                                                        }`}
                                                    >
                                                        {opt}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* CHOICE → "Diğer" seçildiyse serbest metin */}
                                    {isChoice && q.allow_other && otherChosen && (
                                        <div className="ml-7 mt-2">
                                            <input
                                                type="text"
                                                value={a?.value || ''}
                                                onChange={(e) => setOtherText(q.id, e.target.value)}
                                                placeholder="Kendi cevabını yaz..."
                                                disabled={submitting}
                                                className="w-full text-[12px] bg-white border border-amber-200 rounded-md px-2.5 py-1.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-stone-100"
                                            />
                                        </div>
                                    )}

                                    {/* TEXT — açık uçlu, doğrudan textarea */}
                                    {isText && (
                                        <div className="ml-7">
                                            <textarea
                                                value={a?.value || ''}
                                                onChange={(e) => setOtherText(q.id, e.target.value)}
                                                placeholder="Cevabını yaz... (birkaç cümle olabilir)"
                                                disabled={submitting}
                                                rows={3}
                                                className="w-full text-[12px] bg-white border border-stone-200 rounded-md px-2.5 py-1.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-stone-100 resize-y leading-relaxed"
                                            />
                                        </div>
                                    )}

                                    {/* SCREENSHOT — inline dropzone */}
                                    {isScreenshot && (
                                        <div className="ml-7">
                                            <ScreenshotZone
                                                screenshot={screenshot}
                                                onScreenshot={(base64, mime) => {
                                                    setScreenshot({ base64, mime });
                                                    setAnswer(q.id, 'Ekran görüntüsü eklendi', false);
                                                }}
                                                onClear={() => {
                                                    setScreenshot(null);
                                                    setAnswers(p => {
                                                        const next = { ...p };
                                                        delete next[q.id];
                                                        return next;
                                                    });
                                                }}
                                                disabled={submitting}
                                                inline
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Global screenshot dropzone — yalnızca hiçbir soru screenshot
                    istemediğinde gösteriliyor (yoksa inline alan zaten var). */}
                {!hasScreenshotQuestion && (
                    <div className="pt-2">
                        <ScreenshotZone
                            screenshot={screenshot}
                            onScreenshot={(base64, mime) => setScreenshot({ base64, mime })}
                            onClear={() => setScreenshot(null)}
                            disabled={submitting}
                        />
                    </div>
                )}

                {/* Footer */}
                <div className="px-4 py-3 bg-stone-50/60 border-t border-amber-100 flex items-center justify-between gap-3">
                    <span className="text-[10px] text-stone-400">
                        {answeredCount}/{normalizedQuestions.length} cevaplandı
                        {answeredCount === 0 && ' — en az bir soru cevaplanmalı'}
                    </span>
                    <div className="flex items-center gap-2">
                        {!isLastRound && (
                            <button
                                type="button"
                                onClick={handleSkip}
                                disabled={submitting}
                                title="Mevcut bilgiyle çözüm üret"
                                className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 text-stone-500 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-40 transition"
                            >
                                <SkipForward size={11} />
                                Yeterli, çöz
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleClarificationSubmit}
                            disabled={!canSubmit}
                            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 bg-amber-500 text-white hover:bg-amber-600 disabled:bg-stone-200 disabled:text-stone-400 transition shadow-sm"
                        >
                            {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                            {submitting
                                ? 'Analiz ediliyor...'
                                : isSingleRound
                                    ? 'Çözüm üret'
                                    : isLastRound
                                        ? 'Son tur — çözüm iste'
                                        : 'Devam et'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Çözüm modu ──────────────────────────────────────────────────── */
    return (
        <div
            className="card-fade-in w-full max-w-[760px] bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden"
            style={{ fontFamily: 'Söhne, ui-sans-serif, system-ui, sans-serif' }}
        >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-stone-50 to-white border-b border-stone-100 flex items-center gap-3 flex-wrap">
                <span className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-[#DC2626]/10 text-[#DC2626] shrink-0">
                    <AlertTriangle size={14} />
                </span>
                {id && (
                    <span className="font-mono text-[11px] text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md">
                        {id}
                    </span>
                )}
                <h2 className="text-[13px] font-semibold text-stone-800 truncate flex-1 min-w-0">{title}</h2>
                {module && (
                    <span className="text-[10px] font-mono text-stone-600 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded-md">
                        {module}
                    </span>
                )}
                {severity && <SeverityPill level={severity} />}
                {frequency > 0 && (
                    <span className="text-[10px] text-stone-400">{frequency} kez</span>
                )}
            </div>

            {/* Özet */}
            {summary && (
                <div className="px-5 py-3.5 border-b border-stone-100">
                    <p className="text-[12.5px] leading-relaxed text-stone-700">{summary}</p>
                </div>
            )}

            {/* Sebep */}
            {cause && (
                <>
                    <SectionToggle
                        icon={<AlertTriangle size={11} />}
                        iconWrap="bg-amber-50 text-amber-600 border border-amber-100"
                        title="Sebep"
                        open={openSection === 'cause'}
                        onClick={() => toggle('cause')}
                    />
                    {openSection === 'cause' && (
                        <div className="px-5 py-3 border-b border-stone-100 bg-amber-50/30">
                            <p className="text-[12px] leading-relaxed text-stone-700">{cause}</p>
                        </div>
                    )}
                    <div className="border-b border-stone-100" />
                </>
            )}

            {/* Çözüm Adımları */}
            {steps.length > 0 && (
                <>
                    <SectionToggle
                        icon={<ListChecks size={11} />}
                        iconWrap="bg-emerald-50 text-emerald-600 border border-emerald-100"
                        title="Çözüm Adımları"
                        count={`${steps.length} adım`}
                        open={openSection === 'steps'}
                        onClick={() => toggle('steps')}
                    />
                    {openSection === 'steps' && (
                        <ol className="divide-y divide-stone-100 border-b border-stone-100">
                            {steps.map((s, i) => (
                                <li key={i} className="px-5 py-3 flex gap-3 hover:bg-stone-50/60 transition">
                                    <span className="shrink-0 w-6 h-6 inline-flex items-center justify-center bg-stone-800 text-white text-[11px] font-semibold rounded-md">
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h4 className="text-[12.5px] font-semibold text-stone-800">{s.title}</h4>
                                            {s.tcode && (
                                                <span className="font-mono text-[10px] text-[#DC2626] bg-[#DC2626]/10 border border-[#DC2626]/20 px-1.5 py-0.5 rounded-md">
                                                    {s.tcode}
                                                </span>
                                            )}
                                        </div>
                                        {s.detail && <p className="text-[11.5px] leading-relaxed text-stone-600">{s.detail}</p>}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                    {openSection !== 'steps' && <div className="border-b border-stone-100" />}
                </>
            )}

            {/* Dökümanlar */}
            {docs.length > 0 && (
                <>
                    <SectionToggle
                        icon={<Paperclip size={11} />}
                        iconWrap="bg-blue-50 text-blue-600 border border-blue-100"
                        title="İlişkili Dökümanlar"
                        count={docs.length}
                        open={openSection === 'docs'}
                        onClick={() => toggle('docs')}
                    />
                    {openSection === 'docs' && (
                        <div className="px-5 py-3 border-b border-stone-100 grid grid-cols-2 gap-1.5">
                            {docs.map((d, i) => (
                                <div key={i} className="flex items-center gap-2 text-[11px] text-stone-700 bg-stone-50 border border-stone-200 px-2 py-1.5 rounded-md">
                                    <FileText size={11} className="text-stone-400 shrink-0" />
                                    <span className="truncate flex-1" title={d.name}>{d.name}</span>
                                    {d.page != null && <span className="font-mono text-[9px] text-stone-400">s.{d.page}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                    {openSection !== 'docs' && <div className="border-b border-stone-100" />}
                </>
            )}

            {/* Benzer Hatalar */}
            {similar.length > 0 && (
                <>
                    <SectionToggle
                        icon={<GitBranch size={11} />}
                        iconWrap="bg-violet-50 text-violet-600 border border-violet-100"
                        title="Benzer Hatalar"
                        count={similar.length}
                        open={openSection === 'similar'}
                        onClick={() => toggle('similar')}
                    />
                    {openSection === 'similar' && (
                        <div className="px-5 py-2.5 space-y-1">
                            {similar.map((s, i) => (
                                <div key={i} className="w-full flex items-center gap-3 px-2 py-1.5 hover:bg-stone-50 transition rounded-md">
                                    <span className="font-mono text-[10px] font-medium text-stone-700 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded-md">{s.code}</span>
                                    <span className="flex-1 text-[11.5px] text-stone-700 truncate">{s.title}</span>
                                    {s.count > 0 && <span className="text-[10px] text-stone-400">{s.count} kez</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Aksiyonlar */}
            <div className="px-4 py-2.5 bg-stone-50/60 border-t border-stone-100 flex items-center gap-2">
                <button
                    onClick={handleSave}
                    disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                    className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition shadow-sm ${
                        saveStatus === 'saved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : saveStatus === 'error'
                                ? 'bg-red-50 text-[#DC2626] border border-red-200'
                                : 'bg-[#DC2626] text-white hover:bg-[#B91C1C] disabled:bg-stone-200 disabled:text-stone-400 border border-transparent'
                    }`}
                >
                    <BookmarkPlus size={12} />
                    {saveStatus === 'saving' ? 'Kaydediliyor...'
                        : saveStatus === 'saved' ? 'Kaydedildi'
                        : saveStatus === 'error' ? 'Hata' : 'Hatayı Kaydet'}
                </button>
                <span className="text-[10px] text-stone-400 ml-auto">
                    {steps.length > 0 && `${steps.length} adım`}
                </span>
            </div>
        </div>
    );
};

/**
 * AI cevabındaki ```json ... ``` bloğundan ErrorSolution verisini parse eder.
 * type === "error_solution" ise verir, değilse null.
 */
export const parseErrorSolution = (text) => {
    if (!text || typeof text !== 'string') return null;
    const match = text.match(/```json\s*([\s\S]*?)\s*```/i)
        || text.match(/(\{[\s\S]*"type"\s*:\s*"error_solution"[\s\S]*\})/);
    if (!match) return null;
    try {
        const data = JSON.parse(match[1]);
        if (data?.type === 'error_solution') return data;
    } catch {
        return null;
    }
    return null;
};

export default ErrorSolutionCard;
