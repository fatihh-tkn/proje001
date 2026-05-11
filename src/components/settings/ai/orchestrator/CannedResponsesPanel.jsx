import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, Plus, Trash2, Check, X, ChevronDown, GripVertical, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';

const API = '/api/settings/canned-responses';

const uid = () => Math.random().toString(36).slice(2, 10);

export default function CannedResponsesPanel() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [draft, setDraft] = useState({ triggers: '', response: '', active: true });
    const [dropdownPos, setDropdownPos] = useState({ bottom: 0, left: 0 });
    const panelRef = useRef(null);
    const btnRef = useRef(null);

    // Panel dışına tıklandığında kapat
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(API);
            const data = await res.json();
            setItems(data.items || []);
        } catch { /* sessiz hata */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { if (open) load(); }, [open, load]);

    const save = async (next) => {
        setSaving(true);
        try {
            await fetch(API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: next }),
            });
            setItems(next);
        } finally { setSaving(false); }
    };

    const startEdit = (item) => {
        setEditingId(item.id);
        setDraft({
            triggers: (item.triggers || []).join(', '),
            response: item.response || '',
            active: item.active !== false,
        });
    };

    const commitEdit = async () => {
        const triggers = draft.triggers.split(',').map(s => s.trim()).filter(Boolean);
        if (!triggers.length || !draft.response.trim()) return;
        const next = items.map(it =>
            it.id === editingId
                ? { ...it, triggers, response: draft.response.trim(), active: draft.active }
                : it
        );
        setEditingId(null);
        await save(next);
    };

    const addNew = () => {
        const newItem = { id: uid(), triggers: [], response: '', active: true };
        const next = [...items, newItem];
        setItems(next);
        startEdit(newItem);
    };

    const remove = async (id) => {
        if (editingId === id) setEditingId(null);
        await save(items.filter(it => it.id !== id));
    };

    const toggle = async (id) => {
        const next = items.map(it => it.id === id ? { ...it, active: !it.active } : it);
        await save(next);
    };

    return (
        <div ref={panelRef} className="relative w-full">
            {/* Sol panel butonu */}
            <button
                ref={btnRef}
                onClick={() => {
                    if (!open) {
                        const r = btnRef.current?.getBoundingClientRect();
                        if (r) setDropdownPos({ bottom: window.innerHeight - r.top + 4, left: r.left });
                    }
                    setOpen(o => !o);
                }}
                className={`flex items-center gap-1.5 w-full px-3 py-2.5 text-[11px] font-semibold transition-all select-none
                    ${open
                        ? 'text-[#AA1416] bg-[#fef2f2]'
                        : 'text-stone-500 hover:text-[#AA1416] hover:bg-stone-50'
                    }`}
                title="Hazır cevapları yönet"
            >
                <MessageCircle size={13} strokeWidth={2.2} />
                <span className="flex-1 text-left">Hazır Cevaplar</span>
                <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown — portal ile body'e mount edilir, overflow kırpmasını önler */}
            {open && createPortal(
                <div
                    className="fixed z-[9999] w-[440px] bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden"
                    style={{ bottom: dropdownPos.bottom, left: dropdownPos.left }}
                >
                    {/* Başlık */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100 bg-stone-50">
                        <span className="text-[11px] font-semibold text-stone-600 uppercase tracking-wide">
                            Hazır Cevaplar
                        </span>
                        <div className="flex items-center gap-2">
                            {saving && <Loader2 size={12} className="animate-spin text-stone-400" />}
                            <button
                                onClick={addNew}
                                className="flex items-center gap-1 text-[11px] font-semibold text-[#AA1416] hover:bg-red-50 px-2 py-1 rounded-md transition-all"
                            >
                                <Plus size={12} /> Yeni Ekle
                            </button>
                        </div>
                    </div>

                    {/* Liste */}
                    <div className="overflow-y-auto max-h-[360px] divide-y divide-stone-100">
                        {loading && (
                            <div className="flex items-center justify-center py-8 text-stone-400">
                                <Loader2 size={16} className="animate-spin" />
                            </div>
                        )}

                        {!loading && items.length === 0 && (
                            <div className="py-8 text-center text-[12px] text-stone-400">
                                Henüz hazır cevap yok.
                            </div>
                        )}

                        {!loading && items.map(item => (
                            <div key={item.id} className={`px-4 py-3 ${!item.active ? 'opacity-50' : ''}`}>
                                {editingId === item.id ? (
                                    /* ── Düzenleme modu ── */
                                    <div className="space-y-2">
                                        <div>
                                            <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-1 block">
                                                Tetikleyiciler <span className="font-normal normal-case">(virgülle ayır)</span>
                                            </label>
                                            <input
                                                autoFocus
                                                value={draft.triggers}
                                                onChange={e => setDraft(d => ({ ...d, triggers: e.target.value }))}
                                                placeholder="selam, merhaba, mrb"
                                                className="w-full text-[12px] border border-stone-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#AA1416]/40 focus:ring-1 focus:ring-[#AA1416]/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-1 block">
                                                Cevap
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={draft.response}
                                                onChange={e => setDraft(d => ({ ...d, response: e.target.value }))}
                                                placeholder="Merhaba! Nasıl yardımcı olabilirim?"
                                                className="w-full text-[12px] border border-stone-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#AA1416]/40 focus:ring-1 focus:ring-[#AA1416]/20 resize-none"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between pt-0.5">
                                            <label className="flex items-center gap-1.5 text-[11px] text-stone-500 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={draft.active}
                                                    onChange={e => setDraft(d => ({ ...d, active: e.target.checked }))}
                                                    className="accent-[#AA1416]"
                                                />
                                                Aktif
                                            </label>
                                            <div className="flex gap-1.5">
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50 transition-all"
                                                >
                                                    <X size={11} /> İptal
                                                </button>
                                                <button
                                                    onClick={commitEdit}
                                                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-[#AA1416] text-white hover:bg-[#8b1012] transition-all"
                                                >
                                                    <Check size={11} /> Kaydet
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* ── Görüntüleme modu ── */
                                    <div
                                        className="flex items-start gap-2 cursor-pointer group"
                                        onClick={() => startEdit(item)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            {/* Trigger chip'leri */}
                                            <div className="flex flex-wrap gap-1 mb-1.5">
                                                {(item.triggers || []).map((t, i) => (
                                                    <span
                                                        key={i}
                                                        className="inline-block text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-md font-mono"
                                                    >
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                            {/* Cevap */}
                                            <p className="text-[12px] text-stone-600 leading-snug line-clamp-2">
                                                {item.response}
                                            </p>
                                        </div>
                                        {/* Aksiyonlar */}
                                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={e => { e.stopPropagation(); toggle(item.id); }}
                                                title={item.active ? 'Pasifleştir' : 'Aktifleştir'}
                                                className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-all"
                                            >
                                                {item.active
                                                    ? <ToggleRight size={14} className="text-emerald-500" />
                                                    : <ToggleLeft size={14} />
                                                }
                                            </button>
                                            <button
                                                onClick={e => { e.stopPropagation(); remove(item.id); }}
                                                title="Sil"
                                                className="p-1 rounded hover:bg-red-50 text-stone-400 hover:text-red-500 transition-all"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 border-t border-stone-100 bg-stone-50">
                        <p className="text-[10px] text-stone-400">
                            Tetikleyici tam eşleşme ile çalışır · Büyük/küçük harf duyarsız · LLM çağrısı yapılmaz
                        </p>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
