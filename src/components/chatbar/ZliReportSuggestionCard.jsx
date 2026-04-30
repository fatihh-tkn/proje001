import React, { useState } from 'react';
import {
    FileSpreadsheet, Check, X, ChevronDown, ChevronUp, Send, Loader2,
    AlertCircle, BookmarkPlus
} from 'lucide-react';
import { useErrorStore } from '../../store/errorStore';
import { mutate } from '../../api/client';

const PRIORITY_OPTIONS = [
    { id: 'dusuk',   label: 'Düşük',   color: '#6b7280' },
    { id: 'orta',    label: 'Orta',    color: '#d97706' },
    { id: 'yuksek',  label: 'Yüksek',  color: '#DC2626' },
];

/**
 * Bir Z'li Rapor sorgusu için chat içine yerleşik dinamik kart.
 * - Eşleşen rapor varsa: best_match'i gösterir, "Evet işimi görür" / "Hayır,
 *   başka rapor lazım" butonları ile devam eder.
 * - "Hayır" seçildiğinde inline talep formu açılır → /api/talepler'e
 *   kategori='zli_rapor' ile POST atar → admin tarafına düşer.
 */
const ZliReportSuggestionCard = ({ data, userId }) => {
    const addToast = useErrorStore(s => s.addToast);

    const {
        query,
        best_match: bestMatch,
        alternatives = [],
        no_match_reason: noMatchReason,
    } = data || {};

    // Mod: 'idle' → kullanıcı henüz cevaplamadı
    //      'accepted' → "Evet, işimi görür" tıklandı
    //      'requesting' → "Hayır, başka rapor lazım" → talep formu açıldı
    //      'submitted' → talep oluşturuldu
    const [mode, setMode] = useState(bestMatch ? 'idle' : 'requesting');
    const [showAlts, setShowAlts] = useState(false);

    // Talep formu state
    const [form, setForm] = useState({
        baslik:   query ? `Z'li rapor talebi: ${query.slice(0, 80)}` : "Z'li rapor talebi",
        mesaj:    '',
        oncelik:  'orta',
    });
    const [submitState, setSubmitState] = useState('idle'); // idle | submitting | error
    const [submitError, setSubmitError] = useState('');

    const updateForm = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const handleAccept = () => {
        setMode('accepted');
        addToast({ type: 'success', message: `${bestMatch.kod} raporu seçildi.` });
    };

    const handleReject = () => {
        setMode('requesting');
        // Mevcut başlığa kullanıcının zaten girdiği bilgi varsa onu koru
        if (bestMatch && !form.mesaj) {
            updateForm('mesaj',
                `Mevcut "${bestMatch.kod} - ${bestMatch.ad}" raporu ihtiyacımı karşılamıyor.\n\n` +
                `İhtiyacım:\n`
            );
        }
    };

    const handleSubmitTalep = async () => {
        if (!userId) {
            setSubmitError('Talep göndermek için giriş yapmalısınız.');
            setSubmitState('error');
            return;
        }
        if (form.baslik.trim().length < 3 || form.mesaj.trim().length < 5) {
            setSubmitError('Başlık en az 3, açıklama en az 5 karakter olmalı.');
            setSubmitState('error');
            return;
        }

        setSubmitState('submitting');
        setSubmitError('');

        try {
            await mutate.create('/api/talepler', {
                kullanici_kimlik: userId,
                baslik:   form.baslik.trim(),
                mesaj:    form.mesaj.trim(),
                kategori: 'zli_rapor',
                oncelik:  form.oncelik,
            }, { subject: "Z'li rapor talebi", detail: form.baslik.trim() });
            setMode('submitted');
        } catch (e) {
            setSubmitError(e.message || 'Talep gönderilemedi.');
            setSubmitState('error');
        }
    };

    return (
        <div
            className="w-full max-w-[760px] bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden no-toggle"
            style={{ fontFamily: 'Söhne, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
        >
            {/* Üst şerit */}
            <div className="px-4 py-3 bg-gradient-to-r from-stone-50 to-white border-b border-stone-100 flex items-center gap-3">
                <span className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-violet-50 text-violet-600 shrink-0">
                    <FileSpreadsheet size={14} />
                </span>
                <h2 className="text-[13px] font-semibold text-stone-800 flex-1 min-w-0 truncate">
                    Z'li Rapor Sorgusu
                </h2>
                {query && (
                    <span className="text-[10px] text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md max-w-[280px] truncate" title={query}>
                        {query}
                    </span>
                )}
            </div>

            {/* ── Eşleşen rapor (idle) ───────────────────────────────────── */}
            {mode === 'idle' && bestMatch && (
                <>
                    <div className="px-5 py-4 border-b border-stone-100">
                        <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-2">
                            Önerilen Rapor
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-[12px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-md">
                                        {bestMatch.kod}
                                    </span>
                                    <h3 className="text-[13.5px] font-semibold text-stone-900">{bestMatch.ad}</h3>
                                    {bestMatch.modul && (
                                        <span className="text-[10px] font-mono bg-stone-100 text-stone-700 border border-stone-200 px-1.5 py-0.5 rounded-md">
                                            {bestMatch.modul}
                                        </span>
                                    )}
                                </div>
                                {bestMatch.aciklama && (
                                    <p className="text-[12px] leading-relaxed text-stone-700 mt-1">{bestMatch.aciklama}</p>
                                )}
                                {bestMatch.kullanim_alani && (
                                    <p className="text-[11.5px] leading-relaxed text-stone-500 mt-1">
                                        <span className="font-semibold">Kullanım: </span>
                                        {bestMatch.kullanim_alani}
                                    </p>
                                )}
                                {bestMatch.neden && (
                                    <p className="text-[11.5px] italic text-violet-700 mt-1.5 bg-violet-50/40 border-l-2 border-violet-200 pl-2 py-0.5">
                                        {bestMatch.neden}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Onay butonları */}
                    <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] text-stone-600 mr-1">Bu rapor işinizi görüyor mu?</span>
                        <button
                            onClick={handleAccept}
                            className="text-[12px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition"
                        >
                            <Check size={13} /> Evet, işimi görür
                        </button>
                        <button
                            onClick={handleReject}
                            className="text-[12px] font-semibold bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100 hover:text-[#DC2626] hover:border-[#DC2626]/30 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition"
                        >
                            <X size={13} /> Hayır, başka rapor lazım
                        </button>
                    </div>

                    {/* Alternatifler (kapanır panel) */}
                    {alternatives.length > 0 && (
                        <>
                            <button
                                onClick={() => setShowAlts(s => !s)}
                                className="w-full flex items-center gap-2 px-5 py-2.5 hover:bg-stone-50 transition text-left"
                            >
                                <span className="text-[11px] font-semibold text-stone-600 tracking-wide flex-1">
                                    Diğer Eşleşmeler
                                </span>
                                <span className="text-[10px] text-stone-400 font-mono">{alternatives.length}</span>
                                {showAlts ? <ChevronUp size={13} className="text-stone-400" /> : <ChevronDown size={13} className="text-stone-400" />}
                            </button>
                            {showAlts && (
                                <div className="px-5 pb-3 space-y-1.5">
                                    {alternatives.map((alt, i) => (
                                        <div key={i} className="flex items-start gap-2 bg-stone-50/60 border border-stone-100 rounded-md px-2.5 py-1.5">
                                            <span className="font-mono text-[10px] font-medium text-stone-700 bg-white border border-stone-200 px-1.5 py-0.5 rounded shrink-0">
                                                {alt.kod}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[11.5px] font-semibold text-stone-800 truncate">{alt.ad}</div>
                                                {alt.aciklama && (
                                                    <div className="text-[11px] text-stone-500 line-clamp-2">{alt.aciklama}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* ── Kabul edildi ──────────────────────────────────────────── */}
            {mode === 'accepted' && bestMatch && (
                <div className="px-5 py-4 border-b border-stone-100 flex items-start gap-3 bg-emerald-50/40">
                    <span className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                        <Check size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-semibold text-emerald-800">
                            Harika — <span className="font-mono">{bestMatch.kod}</span> kullanıma hazır.
                        </div>
                        <p className="text-[11.5px] text-stone-600 mt-0.5">
                            Bu raporu SAP'de açıp ihtiyacınız olan veriye ulaşabilirsiniz.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Talep formu (requesting) ──────────────────────────────── */}
            {mode === 'requesting' && (
                <div className="px-5 py-4 border-b border-stone-100 space-y-3">
                    {!bestMatch && noMatchReason && (
                        <div className="flex items-start gap-2 bg-amber-50/60 border border-amber-200 rounded-lg px-3 py-2">
                            <AlertCircle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-[11.5px] leading-relaxed text-stone-700">
                                {noMatchReason || 'Aramanıza uygun yüklü bir Z\'li rapor bulunamadı.'}
                            </p>
                        </div>
                    )}

                    <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
                        Yeni Z'li Rapor Talebi
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Başlık</label>
                        <input
                            value={form.baslik}
                            onChange={e => updateForm('baslik', e.target.value)}
                            maxLength={200}
                            className="w-full text-[12.5px] border border-stone-200 px-2.5 py-1.5 rounded-md focus:outline-none focus:border-[#DC2626]/40"
                            placeholder="Talep başlığı"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">İhtiyaç Açıklaması</label>
                        <textarea
                            value={form.mesaj}
                            onChange={e => updateForm('mesaj', e.target.value)}
                            rows={5}
                            maxLength={4000}
                            className="w-full text-[12.5px] border border-stone-200 px-2.5 py-1.5 rounded-md focus:outline-none focus:border-[#DC2626]/40 resize-none leading-relaxed"
                            placeholder="Hangi veriyi/raporlamayı görmek istiyorsunuz? Hangi modül, hangi tablolar, hangi filtreler? Beklenen çıktı?"
                        />
                        <div className="text-[10px] text-stone-400 text-right mt-0.5">{form.mesaj.length} / 4000</div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Öncelik</label>
                        <div className="flex gap-1.5">
                            {PRIORITY_OPTIONS.map(p => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => updateForm('oncelik', p.id)}
                                    className="text-[11px] font-semibold px-3 py-1 rounded-md border transition"
                                    style={{
                                        color:           form.oncelik === p.id ? '#fff' : p.color,
                                        backgroundColor: form.oncelik === p.id ? p.color : 'transparent',
                                        borderColor:     p.color + '40',
                                    }}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {submitState === 'error' && submitError && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            <AlertCircle size={13} className="text-[#DC2626] shrink-0 mt-0.5" />
                            <p className="text-[11.5px] text-[#DC2626]">{submitError}</p>
                        </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                        <button
                            onClick={handleSubmitTalep}
                            disabled={submitState === 'submitting'}
                            className="text-[12px] font-semibold bg-[#DC2626] text-white hover:bg-[#B91C1C] disabled:bg-stone-300 disabled:text-stone-500 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition shadow-sm"
                        >
                            {submitState === 'submitting'
                                ? <><Loader2 size={12} className="animate-spin" /> Gönderiliyor...</>
                                : <><Send size={12} /> Talebi Gönder</>}
                        </button>
                        {bestMatch && (
                            <button
                                onClick={() => setMode('idle')}
                                className="text-[11px] font-semibold text-stone-500 hover:text-stone-700 px-2 py-1.5 transition"
                            >
                                Vazgeç
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── Talep gönderildi ──────────────────────────────────────── */}
            {mode === 'submitted' && (
                <div className="px-5 py-4 border-b border-stone-100 flex items-start gap-3 bg-emerald-50/40">
                    <span className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                        <BookmarkPlus size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-semibold text-emerald-800">
                            Talep yöneticilere iletildi.
                        </div>
                        <p className="text-[11.5px] text-stone-600 mt-0.5">
                            Talep yönetimi panelinden durumunu takip edebilirsiniz.
                        </p>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="px-4 py-2 bg-stone-50/60 text-[10px] text-stone-400 flex items-center gap-1.5">
                <FileSpreadsheet size={10} className="text-violet-400" />
                Z'li raporlar — yüklü rapor havuzunda arama
            </div>
        </div>
    );
};

/**
 * AI cevabındaki ```json ... ``` bloğundan ZliReportQuery verisini parse eder.
 * type === "zli_report_query" ise verir, değilse null.
 */
export const parseZliReportQuery = (text) => {
    if (!text || typeof text !== 'string') return null;
    const match = text.match(/```json\s*([\s\S]*?)\s*```/i)
        || text.match(/(\{[\s\S]*"type"\s*:\s*"zli_report_query"[\s\S]*\})/);
    if (!match) return null;
    try {
        const data = JSON.parse(match[1]);
        if (data?.type === 'zli_report_query') return data;
    } catch {
        return null;
    }
    return null;
};

export default ZliReportSuggestionCard;
