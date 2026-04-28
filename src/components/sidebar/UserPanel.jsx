import React, { useState, useEffect, useRef } from 'react';
import {
    X, Edit2, Check, FileText, Clock,
    Shield, LogOut, ChevronRight, BarChart2, ClipboardList,
    HardDrive, File, MessageSquare, ChevronDown, Plus
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useErrorStore } from '../../store/errorStore';
import AdminEgitimForm from './AdminEgitimForm';
import UserEgitimDashboard from './UserEgitimDashboard';
import UserVeriGirisi from './UserVeriGirisi';
import TalepGonderModal from './TalepGonderModal';

/* ── Dairesel Depolama Grafiği ── */
function StorageDonut({ usedMb, totalMb, usedFiles, totalFiles }) {
    const r = 40;
    const cx = 56;
    const cy = 56;
    const circ = 2 * Math.PI * r;
    const pct = totalMb > 0 ? Math.min(usedMb / totalMb, 1) : 0;
    const dash = pct * circ;
    const gap = circ - dash;
    const color = pct >= 0.9 ? '#ef4444' : pct >= 0.7 ? '#f59e0b' : '#A01B1B';
    const fmt = (mb) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;

    return (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
            <svg width={112} height={112}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={8} />
                <circle
                    cx={cx} cy={cy} r={r} fill="none"
                    stroke={color} strokeWidth={8}
                    strokeDasharray={`${dash} ${gap}`}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${cx} ${cy})`}
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                />
                <text x={cx} y={cy - 8} textAnchor="middle" fill="#f1f5f9" fontSize={12} fontWeight={700}>
                    {fmt(usedMb)}
                </text>
                <text x={cx} y={cy + 6} textAnchor="middle" fill="#64748b" fontSize={9}>
                    {usedFiles} dosya
                </text>
                {totalMb > 0 && (
                    <text x={cx} y={cy + 18} textAnchor="middle" fill="#334155" fontSize={8}>
                        / {fmt(totalMb)}
                    </text>
                )}
            </svg>
        </div>
    );
}

const UserPanel = ({ open, onClose, onLogout, isCollapsed }) => {
    const currentUser = useWorkspaceStore(state => state.currentUser);
    const setCurrentUser = useWorkspaceStore(state => state.setCurrentUser);
    const addToast = useErrorStore((s) => s.addToast);

    const [userData, setUserData] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [quota, setQuota] = useState(null);
    const [userDocs, setUserDocs] = useState([]);
    const [nameEditing, setNameEditing] = useState(false);
    const [nameValue, setNameValue] = useState('');
    const [nameSaving, setNameSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('profil'); // 'profil', 'egitim', 'talepler'
    const [egitimSubTab, setEgitimSubTab] = useState('dashboard'); // 'dashboard' | 'veriGirisi'
    const [expandedTalepIndex, setExpandedTalepIndex] = useState(null);
    const [talepler, setTalepler] = useState([]);
    const [talepModalOpen, setTalepModalOpen] = useState(false);
    const panelRef = useRef(null);

    const refreshTalepler = React.useCallback(() => {
        if (!currentUser?.id) return;
        fetch(`/api/talepler/benim?kullanici_kimlik=${currentUser.id}`)
            .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
            .then(data => setTalepler(Array.isArray(data) ? data : []))
            .catch((e) => console.warn('[UserPanel] Talepler alınamadı:', e.message));
    }, [currentUser?.id]);

    // Kullanıcı verisi + dashboard — panel açıldığında çek
    useEffect(() => {
        if (!open || !currentUser?.id) return;
        setNameValue(currentUser.tam_ad || '');

        fetch('/api/auth/users')
            .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
            .then(users => {
                const u = users.find(x => x.id === currentUser.id);
                if (u) setUserData(u);
            })
            .catch((e) => console.warn('[UserPanel] Kullanıcı listesi alınamadı:', e.message));

        fetch(`/api/auth/users/${currentUser.id}/dashboard`)
            .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
            .then(data => setDashboard(data))
            .catch((e) => console.warn('[UserPanel] Dashboard alınamadı:', e.message));

        fetch(`/api/archive/quota/${currentUser.id}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setQuota(data); })
            .catch((e) => console.warn('[UserPanel] Kota bilgisi alınamadı:', e.message));

        fetch(`/api/archive/my-documents/${currentUser.id}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data?.items) setUserDocs(data.items); })
            .catch((e) => console.warn('[UserPanel] Kullanıcı belgeleri alınamadı:', e.message));

        refreshTalepler();
    }, [open, currentUser?.id, refreshTalepler]);

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
                addToast({ type: 'success', message: 'Profil güncellendi.' });
            } else {
                addToast({ type: 'error', message: 'Profil güncellenemedi.' });
            }
        } catch (e) {
            console.error('[UserPanel] Profil kayıt hatası:', e);
            addToast({ type: 'error', message: 'Sunucuya bağlanılamadı.' });
        }
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
    const isExpanded = activeTab === 'egitim' || activeTab === 'admin';
    const panelWidthStr = isExpanded ? '600px' : '300px';
    const panelWidthNum = isExpanded ? 600 : 300;

    // ── Stil sabitleri (inline — Tailwind sınıfları sidebar karanlık temasıyla çakışıyor)
    const S = {
        panel: {
            position: 'fixed',
            top: 0,
            left: open ? sidebarW : sidebarW - (panelWidthNum + 20),
            width: panelWidthStr,
            height: '100vh',
            zIndex: 45,
            transition: 'left 0.25s cubic-bezier(0.16, 1, 0.3, 1), width 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s',
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
        rowKey: { fontSize: '11px', color: '#475569' },
        rowVal: { fontSize: '11px', color: '#94a3b8', fontWeight: '500' },
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

            {/* ── TABS ── */}
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #2a2a2d', padding: '0 16px' }}>
                <button
                    onClick={() => setActiveTab('profil')}
                    style={{
                        padding: '10px 12px', fontSize: 11, fontWeight: 600, background: 'transparent',
                        color: activeTab === 'profil' ? '#f1f5f9' : '#64748b', border: 'none', cursor: 'pointer',
                        borderBottom: activeTab === 'profil' ? '2px solid #A01B1B' : '2px solid transparent'
                    }}
                >
                    Profil
                </button>
                <button
                    onClick={() => { setActiveTab('egitim'); setEgitimSubTab('dashboard'); }}
                    style={{
                        padding: '10px 12px', fontSize: 11, fontWeight: 600, background: 'transparent',
                        color: activeTab === 'egitim' ? '#f1f5f9' : '#64748b', border: 'none', cursor: 'pointer',
                        borderBottom: activeTab === 'egitim' && egitimSubTab === 'dashboard' ? '2px solid #378ADD' : '2px solid transparent'
                    }}
                >
                    Eğitimlerim
                </button>
                <button
                    onClick={() => setActiveTab('talepler')}
                    style={{
                        padding: '10px 12px', fontSize: 11, fontWeight: 600, background: 'transparent',
                        color: activeTab === 'talepler' ? '#f1f5f9' : '#64748b', border: 'none', cursor: 'pointer',
                        borderBottom: activeTab === 'talepler' ? '2px solid #10b981' : '2px solid transparent'
                    }}
                >
                    Taleplerim
                </button>

                {/* Bilgi Girişi butonu — sadece eğitim sekmesi açıkken görünür */}
                {activeTab === 'egitim' && (
                    <button
                        onClick={() => setEgitimSubTab(egitimSubTab === 'veriGirisi' ? 'dashboard' : 'veriGirisi')}
                        style={{
                            marginLeft: 'auto',
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '5px 10px', fontSize: 10, fontWeight: 600,
                            borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
                            border: '1px solid',
                            background: egitimSubTab === 'veriGirisi' ? 'rgba(55,138,221,0.15)' : 'transparent',
                            color: egitimSubTab === 'veriGirisi' ? '#60a5fa' : '#64748b',
                            borderColor: egitimSubTab === 'veriGirisi' ? 'rgba(55,138,221,0.4)' : '#334155',
                        }}
                    >
                        <ClipboardList size={11} />
                        Bilgi Girişi
                    </button>
                )}
            </div>

            {/* ── BODY ── */}
            <div style={{ flex: 1, padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {activeTab === 'profil' && (
                    <>
                        {/* Hesap Bilgileri */}
                        <section>
                            <div style={S.sectionTitle}>
                                <Clock size={11} /> Hesap Bilgileri
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {[
                                    ['Durum', userData?.status || 'Aktif'],
                                    ['Rol', userData?.role || (currentUser.super ? 'Sistem Yöneticisi' : 'Standart Kullanıcı')],
                                    ['Son Giriş', userData?.lastLogin && userData.lastLogin !== 'Bilinmiyor'
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

                        {/* Depolama Kotası */}
                        <section>
                            <div style={S.sectionTitle}>
                                <HardDrive size={11} /> Depolama Kotası
                            </div>
                            <StorageDonut
                                usedMb={quota?.kullanilan_mb ?? 0}
                                totalMb={quota?.depolama_limiti_mb ?? 0}
                                usedFiles={quota?.kullanilan_dosya ?? 0}
                                totalFiles={quota?.dosya_limiti ?? 0}
                            />
                            {quota?.dolu_mu && (
                                <div style={{
                                    marginTop: 8, fontSize: 10, color: '#ef4444',
                                    textAlign: 'center',
                                }}>
                                    Kota doldu — yeni dosya yükleyemezsiniz.
                                </div>
                            )}
                        </section>

                        {/* Yüklenen Dosyalar */}
                        <section>
                            <div style={S.sectionTitle}>
                                <File size={11} /> Yüklediğim Dosyalar
                                {userDocs.length > 0 && (
                                    <span style={{
                                        marginLeft: 'auto', fontSize: 9, fontWeight: 600,
                                        color: '#475569', background: '#1e293b',
                                        padding: '1px 7px', borderRadius: 999,
                                    }}>
                                        {userDocs.length}
                                    </span>
                                )}
                            </div>
                            {userDocs.length === 0 ? (
                                <div style={{
                                    fontSize: 11, color: '#475569', textAlign: 'center',
                                    padding: '16px 0',
                                }}>
                                    Henüz dosya yüklemediniz.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    {userDocs.map((doc) => {
                                        const bytes = doc.file_size ?? 0;
                                        const sizeStr = bytes >= 1024 * 1024
                                            ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
                                            : `${(bytes / 1024).toFixed(0)} KB`;
                                        const ext = (doc.file_type || '').replace('.', '') || '?';
                                        return (
                                            <div key={doc.id} style={{
                                                display: 'flex', alignItems: 'center', gap: 8,
                                                background: '#0f172a', borderRadius: 8,
                                                padding: '8px 10px', border: '1px solid #1e293b',
                                            }}>
                                                <span style={{
                                                    fontSize: 9, fontWeight: 700, color: '#64748b',
                                                    background: '#1e293b', padding: '2px 6px',
                                                    borderRadius: 4, flexShrink: 0, letterSpacing: '0.05em',
                                                    textTransform: 'uppercase',
                                                }}>
                                                    {ext}
                                                </span>
                                                <span style={{
                                                    fontSize: 11, color: '#94a3b8', flex: 1,
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {doc.filename}
                                                </span>
                                                <span style={{ fontSize: 10, color: '#475569', flexShrink: 0 }}>
                                                    {sizeStr}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </>
                )}

                {activeTab === 'egitim' && (
                    <>
                        {egitimSubTab === 'dashboard' && <UserEgitimDashboard currentUser={currentUser} />}
                        {egitimSubTab === 'veriGirisi' && <UserVeriGirisi currentUser={currentUser} />}
                    </>
                )}

                {activeTab === 'talepler' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={S.sectionTitle}>
                                <MessageSquare size={11} /> Sisteme İletilen Talepler
                            </div>
                            <button
                                onClick={() => setTalepModalOpen(true)}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    padding: '5px 10px', fontSize: 10, fontWeight: 700,
                                    background: 'rgba(16,185,129,0.12)',
                                    color: '#10b981',
                                    border: '1px solid rgba(16,185,129,0.35)',
                                    borderRadius: 6, cursor: 'pointer',
                                }}
                            >
                                <Plus size={11} /> Yeni Talep
                            </button>
                        </div>
                        {talepler.length === 0 ? (
                            <div style={{ fontSize: 11, color: '#475569', textAlign: 'center', padding: '16px 0' }}>
                                Henüz bir talep oluşturmadınız.
                            </div>
                        ) : (
                            talepler.map((talep, i) => {
                                const isExpanded = expandedTalepIndex === i;
                                const renkHaritasi = {
                                    emerald: { c: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                                    amber:   { c: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                                    red:     { c: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
                                    sky:     { c: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
                                    slate:   { c: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
                                };
                                const palet = renkHaritasi[talep.renk] || renkHaritasi.slate;

                                return (
                                    <div key={talep.id || i} style={{
                                        background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8,
                                        overflow: 'hidden', transition: 'all 0.2s'
                                    }}>
                                        <div
                                            onClick={() => setExpandedTalepIndex(isExpanded ? null : i)}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '12px 14px', cursor: 'pointer', background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    width: 8, height: 8, borderRadius: '50%', background: palet.c, flexShrink: 0
                                                }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {talep.baslik || 'İsimsiz Talep'}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
                                                        {talep.tarih}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                                <span style={{
                                                    fontSize: 9, fontWeight: 700, color: palet.c, background: palet.bg,
                                                    padding: '2px 8px', borderRadius: 999, letterSpacing: '0.05em', textTransform: 'uppercase'
                                                }}>
                                                    {talep.durum_etiket || talep.durum}
                                                </span>
                                                <ChevronDown size={14} style={{ color: '#475569', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }} />
                                            </div>
                                        </div>
                                        {isExpanded && (
                                            <div style={{
                                                padding: '10px 14px 14px 32px', fontSize: 11, color: '#94a3b8', lineHeight: 1.5,
                                                borderTop: '1px solid rgba(255,255,255,0.05)'
                                            }}>
                                                <div>{talep.mesaj}</div>
                                                {talep.yonetici_notu && (
                                                    <div style={{
                                                        marginTop: 8, padding: '8px 10px',
                                                        background: 'rgba(245,158,11,0.06)',
                                                        border: '1px solid rgba(245,158,11,0.2)',
                                                        borderRadius: 6, color: '#fcd34d',
                                                    }}>
                                                        <div style={{ fontSize: 9, fontWeight: 700, marginBottom: 3, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                                            Yönetici Notu
                                                        </div>
                                                        {talep.yonetici_notu}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
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

            <TalepGonderModal
                open={talepModalOpen}
                onClose={() => setTalepModalOpen(false)}
                currentUser={currentUser}
                onSubmitted={() => refreshTalepler()}
            />
        </div>
    );
};

export default UserPanel;
