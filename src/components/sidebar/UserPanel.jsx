import React, { useState, useEffect, useRef } from 'react';
import {
    X, Edit2, Check, FileText, Clock,
    Shield, LogOut, ChevronRight
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';

const UserPanel = ({ open, onClose, onLogout, isCollapsed }) => {
    const currentUser  = useWorkspaceStore(state => state.currentUser);
    const setCurrentUser = useWorkspaceStore(state => state.setCurrentUser);

    const [userData,     setUserData]     = useState(null);
    const [dashboard,    setDashboard]    = useState(null);
    const [nameEditing,  setNameEditing]  = useState(false);
    const [nameValue,    setNameValue]    = useState('');
    const [nameSaving,   setNameSaving]   = useState(false);
    const panelRef = useRef(null);

    // Kullanıcı verisi + dashboard — panel açıldığında çek
    useEffect(() => {
        if (!open || !currentUser?.id) return;
        setNameValue(currentUser.tam_ad || '');

        fetch('/api/auth/users')
            .then(r => r.json())
            .then(users => {
                const u = users.find(x => x.id === currentUser.id);
                if (u) setUserData(u);
            })
            .catch(() => {});

        fetch(`/api/auth/users/${currentUser.id}/dashboard`)
            .then(r => r.json())
            .then(data => setDashboard(data))
            .catch(() => {});
    }, [open, currentUser?.id]);

    // Panel dışına tıklayınca kapat
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                const trigger = document.querySelector('[data-user-panel-trigger]');
                if (trigger && trigger.contains(e.target)) return;
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open, onClose]);

    const saveName = async () => {
        const trimmed = nameValue.trim();
        if (!trimmed || trimmed === currentUser.tam_ad) {
            setNameEditing(false);
            setNameValue(currentUser.tam_ad || '');
            return;
        }
        setNameSaving(true);
        try {
            const res = await fetch(`/api/auth/users/${currentUser.id}/profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tam_ad: trimmed }),
            });
            if (res.ok) {
                setCurrentUser({ ...currentUser, tam_ad: trimmed });
                setUserData(prev => prev ? { ...prev, name: trimmed } : prev);
            }
        } catch (_) {}
        setNameSaving(false);
        setNameEditing(false);
    };

    if (!currentUser) return null;

    // Avatar baş harfleri
    const initials = (currentUser.tam_ad || 'U')
        .split(' ')
        .filter(Boolean)
        .map(p => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    // Sidebar genişliğine göre panel pozisyonu
    const sidebarW = isCollapsed ? 68 : 288;

    // ── Stil sabitleri (inline — Tailwind sınıfları sidebar karanlık temasıyla çakışıyor)
    const S = {
        panel: {
            position: 'fixed',
            top: 0,
            left: open ? sidebarW : sidebarW - 320,
            width: '300px',
            height: '100vh',
            zIndex: 45,
            transition: 'left 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s',
            opacity: open ? 1 : 0,
            pointerEvents: open ? 'auto' : 'none',
            background: 'linear-gradient(180deg, #1e1e22 0%, #1a1a1c 100%)',
            borderRight: '1px solid #2a2a2d',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'sans-serif',
            boxShadow: open ? '6px 0 32px rgba(0,0,0,0.5)' : 'none',
            overflowY: 'auto',
        },
        sectionTitle: {
            fontSize: '10px',
            fontWeight: '600',
            color: '#475569',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
        },
        row: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '7px 0',
            borderBottom: '1px solid #1e293b',
        },
        rowKey:   { fontSize: '11px', color: '#475569' },
        rowVal:   { fontSize: '11px', color: '#94a3b8', fontWeight: '500' },
    };

    return (
        <div ref={panelRef} style={S.panel}>

            {/* ── HEADER ── */}
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #2a2a2d', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                {/* Avatar */}
                <div style={{
                    width: 48, height: 48, borderRadius: 10,
                    background: '#A01B1B', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: 16, fontWeight: 700,
                    color: 'white', border: '2px solid rgba(160,27,27,0.35)',
                    letterSpacing: '0.05em',
                }}>
                    {initials}
                </div>

                {/* İsim + email + rol */}
                <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {currentUser.tam_ad}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {userData?.email || '—'}
                    </div>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        marginTop: 6, fontSize: 10, fontWeight: 600,
                        color: currentUser.super ? '#f59e0b' : '#94a3b8',
                        background: currentUser.super ? 'rgba(245,158,11,0.1)' : 'rgba(148,163,184,0.08)',
                        border: `1px solid ${currentUser.super ? 'rgba(245,158,11,0.3)' : 'rgba(148,163,184,0.15)'}`,
                        padding: '2px 8px', borderRadius: 999,
                    }}>
                        <Shield size={9} />
                        {currentUser.super ? 'Süper Yönetici' : 'Standart Kullanıcı'}
                    </div>
                </div>

                {/* Kapat */}
                <button
                    onClick={onClose}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: '#475569', flexShrink: 0 }}
                >
                    <X size={15} />
                </button>
            </div>

            {/* ── BODY ── */}
            <div style={{ flex: 1, padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Hesap Bilgileri */}
                <section>
                    <div style={S.sectionTitle}>
                        <Clock size={11} /> Hesap Bilgileri
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {[
                            ['Durum',       userData?.status || 'Aktif'],
                            ['Rol',         userData?.role   || (currentUser.super ? 'Sistem Yöneticisi' : 'Standart Kullanıcı')],
                            ['Son Giriş',   userData?.lastLogin && userData.lastLogin !== 'Bilinmiyor'
                                                ? new Date(userData.lastLogin).toLocaleString('tr', { dateStyle: 'medium', timeStyle: 'short' })
                                                : '—'],
                        ].map(([k, v]) => (
                            <div key={k} style={S.row}>
                                <span style={S.rowKey}>{k}</span>
                                <span style={{ ...S.rowVal, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {k === 'Durum' && (
                                        <span style={{
                                            width: 6, height: 6, borderRadius: '50%',
                                            background: v === 'Aktif' ? '#10b981' : '#ef4444',
                                            display: 'inline-block',
                                        }} />
                                    )}
                                    {v}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Profil Düzenle */}
                <section>
                    <div style={S.sectionTitle}>
                        <Edit2 size={11} /> Profil Düzenle
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 11, color: '#64748b' }}>Ad Soyad</label>
                        {nameEditing ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                                <input
                                    autoFocus
                                    value={nameValue}
                                    onChange={e => setNameValue(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') saveName();
                                        if (e.key === 'Escape') { setNameEditing(false); setNameValue(currentUser.tam_ad || ''); }
                                    }}
                                    style={{
                                        flex: 1, background: '#0f172a',
                                        border: '1px solid #A01B1B', borderRadius: 6,
                                        padding: '7px 10px', color: '#f1f5f9',
                                        fontSize: 12, outline: 'none',
                                    }}
                                />
                                <button
                                    onClick={saveName}
                                    disabled={nameSaving}
                                    style={{
                                        background: '#A01B1B', color: 'white',
                                        border: 'none', borderRadius: 6,
                                        padding: '7px 12px', cursor: nameSaving ? 'wait' : 'pointer',
                                        opacity: nameSaving ? 0.7 : 1, display: 'flex', alignItems: 'center',
                                    }}
                                >
                                    {nameSaving ? <span style={{ fontSize: 11 }}>...</span> : <Check size={13} />}
                                </button>
                            </div>
                        ) : (
                            <div
                                onClick={() => setNameEditing(true)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6,
                                    padding: '8px 10px', cursor: 'text',
                                }}
                            >
                                <span style={{ fontSize: 12, color: '#e2e8f0' }}>{currentUser.tam_ad}</span>
                                <Edit2 size={11} style={{ color: '#475569' }} />
                            </div>
                        )}
                    </div>
                </section>

                {/* Son Belgeler */}
                {dashboard?.belgeler?.length > 0 && (
                    <section>
                        <div style={S.sectionTitle}>
                            <FileText size={11} /> Son Yüklenen Belgeler
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {dashboard.belgeler.map((b, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    background: '#0f172a', borderRadius: 8,
                                    padding: '8px 10px', border: '1px solid #1e293b',
                                }}>
                                    <span style={{
                                        fontSize: 9, fontWeight: 700, color: '#64748b',
                                        background: '#1e293b', padding: '2px 6px',
                                        borderRadius: 4, flexShrink: 0, letterSpacing: '0.05em',
                                    }}>
                                        {b.type}
                                    </span>
                                    <span style={{
                                        fontSize: 11, color: '#94a3b8', flex: 1,
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {b.name}
                                    </span>
                                    <span style={{ fontSize: 10, color: '#475569', flexShrink: 0 }}>{b.date}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* ── FOOTER — Çıkış ── */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #2a2a2d' }}>
                <button
                    onClick={onLogout}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 8, padding: '10px 16px',
                        background: 'rgba(160,27,27,0.08)', border: '1px solid rgba(160,27,27,0.25)',
                        borderRadius: 8, color: '#ef4444', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,27,27,0.18)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(160,27,27,0.08)'; }}
                >
                    <LogOut size={14} />
                    Oturumu Kapat
                </button>
            </div>
        </div>
    );
};

export default UserPanel;
