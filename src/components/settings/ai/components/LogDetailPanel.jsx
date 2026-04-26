import React from 'react';
import { X, Clock, Monitor, Box, Tag, Key, AlertCircle, CheckCircle2, ChevronRight, Activity } from 'lucide-react';
import { formatDate, fmtCost, getModelColor } from '../utils';

export const LogDetailPanel = ({ log, onClose }) => {
    if (!log) return null;

    const isError = log.status !== 'success';
    const statusColor = isError ? 'text-red-600 bg-red-50 border-red-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200';
    const StatusIcon = isError ? AlertCircle : CheckCircle2;

    return (
        <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl border-l border-slate-200 flex flex-col z-50 animate-in slide-in-from-right duration-300 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg border ${statusColor}`}>
                        <StatusIcon size={20} />
                    </div>
                    <div>
                        <h3 className="text-[14px] font-bold text-slate-800">İstek Detayı</h3>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{log.id}</p>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors"
                >
                    <X size={18} />
                </button>
            </div>

            {/* İçerik */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Temel Bilgiler Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <InfoBox icon={Clock} label="Tarih" value={formatDate(log.timestamp)} />
                    <InfoBox icon={Activity} label="Süre" value={`${log.duration || 0} ms`} />
                    <InfoBox icon={Box} label="Model" value={log.model} color={getModelColor(log.model)} />
                    <InfoBox icon={Tag} label="Maliyet" value={fmtCost(log.cost)} valueClass="text-[#b91d2c] font-black" />
                    <InfoBox icon={Monitor} label="IP Adresi" value={log.ip} mono />
                    <InfoBox icon={Monitor} label="MAC Adresi" value={log.mac} mono />
                </div>

                {isError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[12px]">
                        <p className="font-bold mb-1 flex items-center gap-2"><AlertCircle size={14} /> Hata Oluştu</p>
                        <p className="font-mono bg-white/50 p-2 rounded border border-red-100 mt-2">{log.error || 'Bilinmeyen Hata'}</p>
                    </div>
                )}

                {/* İstek Formatı */}
                <div>
                    <h4 className="text-[12px] font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <ChevronRight size={14} className="text-slate-400" /> 
                        Kullanıcı İsteci (Prompt)
                    </h4>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-[12px] text-slate-800 whitespace-pre-wrap font-mono overflow-x-auto max-h-[300px]">
                        {log.request || '—'}
                    </div>
                    <div className="mt-1 flex justify-end">
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded">
                            {log.promptTokens || 0} token
                        </span>
                    </div>
                </div>

                {/* Yanıt Formatı */}
                <div>
                    <h4 className="text-[12px] font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <ChevronRight size={14} className="text-slate-400" /> 
                        Yapay Zeka Yanıtı
                    </h4>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-[12px] text-slate-800 whitespace-pre-wrap font-mono overflow-x-auto max-h-[400px]">
                        {log.response || '—'}
                    </div>
                    <div className="mt-1 flex justify-end gap-2">
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded">
                            {log.completionTokens || 0} token
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold bg-slate-200 px-2 py-0.5 rounded">
                            Toplam: {log.totalTokens || 0}
                        </span>
                    </div>
                </div>

            </div>
        </div>
    );
};

function InfoBox({ icon: Icon, label, value, mono, color, valueClass }) {
    return (
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Icon size={12} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
            </div>
            <div 
                className={`text-[12px] font-semibold truncate ${mono ? 'font-mono' : ''} ${valueClass || 'text-slate-700'}`}
                style={color ? { color } : undefined}
                title={value}
            >
                {value || '—'}
            </div>
        </div>
    );
}
