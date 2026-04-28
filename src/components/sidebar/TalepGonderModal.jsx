import React, { useState, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { useErrorStore } from '../../store/errorStore';

const KATEGORILER = [
    { value: 'erisim', label: 'Erişim Talebi' },
    { value: 'kota', label: 'Kota Artırımı' },
    { value: 'egitim', label: 'Eğitim' },
    { value: 'hata', label: 'Hata Bildirimi' },
    { value: 'diger', label: 'Diğer' },
];

const ONCELIKLER = [
    { value: 'dusuk', label: 'Düşük' },
    { value: 'orta', label: 'Orta' },
    { value: 'yuksek', label: 'Yüksek' },
];

const TalepGonderModal = ({ open, onClose, currentUser, onSubmitted }) => {
    const addToast = useErrorStore((s) => s.addToast);
    const [baslik, setBaslik] = useState('');
    const [mesaj, setMesaj] = useState('');
    const [kategori, setKategori] = useState('diger');
    const [oncelik, setOncelik] = useState('orta');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setBaslik('');
            setMesaj('');
            setKategori('diger');
            setOncelik('orta');
        }
    }, [open]);

    if (!open) return null;

    const submit = async () => {
        const b = baslik.trim();
        const m = mesaj.trim();
        if (b.length < 3) {
            addToast({ type: 'error', message: 'Başlık en az 3 karakter olmalı.' });
            return;
        }
        if (m.length < 5) {
            addToast({ type: 'error', message: 'Mesaj en az 5 karakter olmalı.' });
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch('/api/talepler', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    kullanici_kimlik: currentUser.id,
                    baslik: b,
                    mesaj: m,
                    kategori,
                    oncelik,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `HTTP ${res.status}`);
            }
            const data = await res.json();
            addToast({ type: 'success', message: 'Talebiniz gönderildi.' });
            onSubmitted?.(data);
            onClose();
        } catch (e) {
            console.error('[TalepGonderModal] gönderim hatası:', e);
            addToast({ type: 'error', message: e.message || 'Talep gönderilemedi.' });
        } finally {
            setSubmitting(false);
        }
    };

    const inputStyle = {
        width: '100%',
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: 6,
        padding: '8px 10px',
        color: '#e2e8f0',
        fontSize: 12,
        outline: 'none',
        boxSizing: 'border-box',
    };

    const labelStyle = {
        fontSize: 10,
        fontWeight: 600,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 5,
        display: 'block',
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
                zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: 420, maxWidth: '92vw',
                    background: 'linear-gradient(180deg, #1e1e22 0%, #1a1a1c 100%)',
                    border: '1px solid #2a2a2d', borderRadius: 12,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                    display: 'flex', flexDirection: 'column',
                    fontFamily: 'sans-serif',
                }}
            >
                <div style={{
                    padding: '14px 18px', borderBottom: '1px solid #2a2a2d',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>
                        Yeni Talep Gönder
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#475569' }}
                    >
                        <X size={15} />
                    </button>
                </div>

                <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                        <label style={labelStyle}>Başlık</label>
                        <input
                            value={baslik}
                            onChange={(e) => setBaslik(e.target.value)}
                            maxLength={200}
                            placeholder="Kısa bir başlık yazın"
                            style={inputStyle}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Kategori</label>
                            <select
                                value={kategori}
                                onChange={(e) => setKategori(e.target.value)}
                                style={inputStyle}
                            >
                                {KATEGORILER.map(k => (
                                    <option key={k.value} value={k.value}>{k.label}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Öncelik</label>
                            <select
                                value={oncelik}
                                onChange={(e) => setOncelik(e.target.value)}
                                style={inputStyle}
                            >
                                {ONCELIKLER.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>Mesaj</label>
                        <textarea
                            value={mesaj}
                            onChange={(e) => setMesaj(e.target.value)}
                            maxLength={4000}
                            rows={6}
                            placeholder="Talebinizi detaylı yazın..."
                            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                        />
                        <div style={{ fontSize: 10, color: '#475569', textAlign: 'right', marginTop: 3 }}>
                            {mesaj.length}/4000
                        </div>
                    </div>
                </div>

                <div style={{
                    padding: '12px 18px', borderTop: '1px solid #2a2a2d',
                    display: 'flex', justifyContent: 'flex-end', gap: 8,
                }}>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        style={{
                            padding: '8px 14px', fontSize: 11, fontWeight: 600,
                            background: 'transparent', color: '#94a3b8',
                            border: '1px solid #334155', borderRadius: 6,
                            cursor: submitting ? 'not-allowed' : 'pointer',
                        }}
                    >
                        İptal
                    </button>
                    <button
                        onClick={submit}
                        disabled={submitting}
                        style={{
                            padding: '8px 14px', fontSize: 11, fontWeight: 700,
                            background: '#10b981', color: 'white',
                            border: 'none', borderRadius: 6,
                            cursor: submitting ? 'wait' : 'pointer',
                            opacity: submitting ? 0.7 : 1,
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}
                    >
                        <Send size={12} />
                        {submitting ? 'Gönderiliyor...' : 'Gönder'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TalepGonderModal;
