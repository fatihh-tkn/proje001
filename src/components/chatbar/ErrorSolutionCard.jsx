import React, { useState } from 'react';
import {
    AlertTriangle, ListChecks, Paperclip, GitBranch, ChevronDown, ChevronUp,
    BookmarkPlus, FileText
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

const ErrorSolutionCard = ({ data, userId, sessionId }) => {
    const [openSection, setOpenSection] = useState('steps');
    const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
    const toggle = (k) => setOpenSection(openSection === k ? null : k);

    const {
        id, title, module, severity, frequency, summary, cause,
        steps = [], docs = [], similar = [],
    } = data || {};

    const handleSave = async () => {
        if (!userId) {
            alert('Bu çözümü kaydetmek için giriş yapmalısınız.');
            return;
        }
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

    return (
        <div
            className="w-full max-w-[760px] bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden"
            style={{ fontFamily: 'Söhne, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, Cantarell, "Noto Sans", sans-serif' }}
        >
            {/* Üst şerit */}
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
                    <span className="text-[10px] text-stone-400">
                        {frequency} kez
                    </span>
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
    const match = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/(\{[\s\S]*"type"\s*:\s*"error_solution"[\s\S]*\})/);
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
