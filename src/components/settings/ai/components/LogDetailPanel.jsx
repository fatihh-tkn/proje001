import React from 'react';
import { X, Clock, Monitor, Box, Tag, AlertCircle, CheckCircle2, ChevronRight, Activity, Zap, Hash, Globe, Cpu, User, DollarSign } from 'lucide-react';
import { formatDate, fmtCost, getModelColor } from '../utils';

/* ── Helpers ── */
function fmtDuration(ms) {
    if (ms == null) return '—';
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
}

function TokenBar({ prompt = 0, completion = 0 }) {
    const total = prompt + completion;
    if (total === 0) return null;
    const pct = Math.round((prompt / total) * 100);
    return (
        <div className="mt-2">
            <div className="w-full h-1.5 rounded-full bg-stone-100 overflow-hidden">
                <div
                    className="h-full rounded-full bg-[#378ADD]"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <div className="flex justify-between mt-1">
                <span className="text-[9px] font-bold text-[#378ADD]">{pct}% giriş</span>
                <span className="text-[9px] font-bold text-stone-400">{100 - pct}% çıktı</span>
            </div>
        </div>
    );
}

/* ── Info row (ARow style from agent settings) ── */
function ARow({ icon: Icon, label, children }) {
    return (
        <div className="flex items-start gap-4 py-2.5 border-b border-stone-100 last:border-0">
            <div className="flex items-center gap-1.5 shrink-0 w-[42%]">
                <Icon size={11} className="text-stone-400 shrink-0" />
                <span className="text-[10px] font-semibold text-stone-500">{label}</span>
            </div>
            <div className="flex-1 min-w-0 text-[12px] font-semibold text-stone-700">
                {children}
            </div>
        </div>
    );
}

/* ── Section Header ── */
function ASection({ label }) {
    return (
        <div className="flex items-center gap-3 mb-2 mt-4 first:mt-0">
            <span className="text-[9px] font-black tracking-[0.18em] text-stone-400 uppercase whitespace-nowrap">
                {label}
            </span>
            <div className="flex-1 border-t border-stone-100" />
        </div>
    );
}

/* ── Model Badge ── */
function ModelBadge({ model }) {
    const color = getModelColor(model);
    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border"
            style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}
        >
            <Box size={9} /> {model || '—'}
        </span>
    );
}

/* ── Code block ── */
function CodeBlock({ content, maxHeight = 280, accent = false }) {
    return (
        <div
            className={`rounded-xl p-4 text-[11px] text-stone-700 whitespace-pre-wrap font-mono overflow-x-auto border leading-relaxed ${
                accent
                    ? 'bg-[#378ADD]/5 border-[#378ADD]/20'
                    : 'bg-stone-50 border-stone-100'
            }`}
            style={{ maxHeight, overflowY: 'auto' }}
        >
            {content || <span className="text-stone-300 italic">—</span>}
        </div>
    );
}

/* ─────────────────────────────────────────────────────── */
export const LogDetailPanel = ({ log, onClose }) => {
    if (!log) return null;

    const isError  = log.status !== 'success';
    const prompt   = log.promptTokens     || 0;
    const complete = log.completionTokens || 0;
    const total    = log.totalTokens      || prompt + complete;

    return (
        <div className="fixed inset-y-0 right-0 w-[520px] bg-white shadow-2xl border-l border-stone-200 flex flex-col z-50 animate-in slide-in-from-right duration-300 font-sans">

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 bg-stone-50 shrink-0">
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg border ${isError ? 'bg-red-50 border-red-200 text-red-500' : 'bg-emerald-50 border-emerald-200 text-emerald-500'}`}>
                        {isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                    </div>
                    <div>
                        <h3 className="text-[13px] font-black text-stone-800">İstek Detayı</h3>
                        <p className="text-[10px] text-stone-400 font-mono mt-0.5 truncate max-w-[300px]">{log.id}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                >
                    <X size={16} />
                </button>
            </div>

            {/* ── İçerik ── */}
            <div className="flex-1 overflow-y-auto p-5 space-y-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-200 [&::-webkit-scrollbar-thumb]:rounded-full">

                {/* ── Metadata ── */}
                <ASection label="Genel Bilgiler" />
                <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 divide-y divide-stone-50">
                        <ARow icon={Clock} label="Tarih / Saat">
                            <span className="font-mono text-stone-600">{formatDate(log.timestamp)}</span>
                        </ARow>
                        <ARow icon={Cpu} label="Model">
                            <ModelBadge model={log.model} />
                        </ARow>
                        <ARow icon={Activity} label="Yanıt Süresi">
                            <span className={`font-mono font-black ${log.duration > 5000 ? 'text-red-500' : log.duration > 2000 ? 'text-amber-600' : 'text-[#378ADD]'}`}>
                                {fmtDuration(log.duration)}
                            </span>
                        </ARow>
                        <ARow icon={Tag} label="Maliyet">
                            <span className="font-mono font-black text-stone-600">
                                {fmtCost(log.cost)}
                            </span>
                        </ARow>
                        <ARow icon={Globe} label="IP Adresi">
                            <span className="font-mono text-stone-500">{log.ip || '—'}</span>
                        </ARow>
                        <ARow icon={Monitor} label="MAC Adresi">
                            <span className="font-mono text-stone-500">{log.mac || '—'}</span>
                        </ARow>
                    </div>
                </div>

                {/* ── Hata (varsa) ── */}
                {isError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                        <div className="flex items-center gap-2 mb-1.5">
                            <AlertCircle size={12} className="text-red-500" />
                            <span className="text-[9px] font-black tracking-[0.15em] text-red-500 uppercase">Hata Detayı</span>
                        </div>
                        <p className="text-[11px] text-red-600 font-mono bg-white/60 p-2.5 rounded-lg border border-red-100">
                            {log.error || 'Bilinmeyen Hata'}
                        </p>
                    </div>
                )}

                {/* ── Token Analizi ── */}
                <ASection label="Token Kullanımı" />
                <div className="bg-white border border-stone-200 rounded-xl shadow-sm px-4 py-3">
                    <div className="flex items-end justify-between mb-3">
                        <div>
                            <div className="text-[22px] font-black text-[#378ADD] leading-none">
                                {total.toLocaleString('tr-TR')}
                            </div>
                            <div className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider mt-1">Toplam Token</div>
                        </div>
                        <div className="flex items-center gap-3 text-right">
                            <div>
                                <div className="text-[13px] font-black text-stone-700">{prompt.toLocaleString('tr-TR')}</div>
                                <div className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider">Giriş</div>
                            </div>
                            <div className="w-px h-8 bg-stone-100" />
                            <div>
                                <div className="text-[13px] font-black text-stone-700">{complete.toLocaleString('tr-TR')}</div>
                                <div className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider">Çıktı</div>
                            </div>
                        </div>
                    </div>
                    <TokenBar prompt={prompt} completion={complete} />
                </div>

                {/* ── Kullanıcı İsteği ── */}
                <ASection label="Kullanıcı İsteği (Prompt)" />
                <div>
                    <CodeBlock content={log.request} maxHeight={280} />
                    <div className="mt-1 flex justify-end">
                        <span className="text-[9px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded">
                            {prompt.toLocaleString('tr-TR')} token
                        </span>
                    </div>
                </div>

                {/* ── Yapay Zeka Yanıtı ── */}
                {!isError && (
                    <>
                        <ASection label="Yapay Zeka Yanıtı" />
                        <div>
                            <CodeBlock content={log.response} maxHeight={400} accent />
                            <div className="mt-1 flex justify-end gap-1.5">
                                <span className="text-[9px] font-bold text-[#378ADD] bg-[#378ADD]/10 px-2 py-0.5 rounded">
                                    {complete.toLocaleString('tr-TR')} token çıktı
                                </span>
                            </div>
                        </div>
                    </>
                )}

                {/* bottom spacer */}
                <div className="h-4" />
            </div>
        </div>
    );
};
