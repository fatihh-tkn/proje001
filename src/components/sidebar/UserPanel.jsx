import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
    X, Edit2, Check, FileText, Clock,
    Shield, LogOut, ChevronRight, BarChart2, ClipboardList,
    HardDrive, File, MessageSquare, ChevronDown, Plus, AlertTriangle, Trash2,
    Search, Download
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useErrorStore } from '../../store/errorStore';
import AdminEgitimForm from './AdminEgitimForm';
import UserEgitimDashboard from './UserEgitimDashboard';
import UserVeriGirisi from './UserVeriGirisi';
import TalepGonderModal from './TalepGonderModal';
import MyRequestsViewer from '../settings/talepler/MyRequestsViewer';
import MyResolvedErrorsViewer from '../settings/errors/MyResolvedErrorsViewer';
import MyProfileViewer from './MyProfileViewer';

/* ── Dairesel Depolama Grafiği ── */
function StorageDonut({ usedMb, totalMb, usedFiles, totalFiles }) {
    const r = 40;
    const cx = 56;
    const cy = 56;
    const circ = 2 * Math.PI * r;
    const pct = totalMb > 0 ? Math.min(usedMb / totalMb, 1) : 0;
    const dash = pct * circ;
    const gap = circ - dash;
    const color = pct >= 0.9 ? '#ef4444' : pct >= 0.7 ? '#f59e0b' : '#DC2626';
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

const UserPanel = ({ open, onClose, onLogout, isCollapsed, initialTab = 'profil' }) => {
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
    const [activeTab, setActiveTab] = useState(initialTab); // 'profil', 'egitim', 'talepler'
    const [egitimSubTab, setEgitimSubTab] = useState('dashboard'); // 'dashboard' | 'veriGirisi'
    const [veriGirisiModalOpen, setVeriGirisiModalOpen] = useState(false);
    const [expandedTalepIndex, setExpandedTalepIndex] = useState(null);
    const [talepler, setTalepler] = useState([]);
    const [talepModalOpen, setTalepModalOpen] = useState(false);
    const [errorRecords, setErrorRecords] = useState([]);
    const [expandedErrorId, setExpandedErrorId] = useState(null);
    const [errorSearch, setErrorSearch] = useState('');
    const [errorSevFilter, setErrorSevFilter] = useState('all'); // all | high | medium | low
    const panelRef = useRef(null);

    const refreshTalepler = React.useCallback(() => {
        if (!currentUser?.id) return;
        fetch(`/api/talepler/benim?kullanici_kimlik=${currentUser.id}`)
            .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
            .then(data => setTalepler(Array.isArray(data) ? data : []))
            .catch((e) => console.warn('[UserPanel] Talepler alınamadı:', e.message));
    }, [currentUser?.id]);

    const refreshErrorRecords = React.useCallback(() => {
        if (!currentUser?.id) return;
        fetch(`/api/errors/user/${currentUser.id}`)
            .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
            .then(data => setErrorRecords(data?.records || []))
            .catch((e) => console.warn('[UserPanel] Hata kayıtları alınamadı:', e.message));
    }, [currentUser?.id]);

    useEffect(() => {
        if (open && activeTab === 'hatalar') refreshErrorRecords();
    }, [open, activeTab, refreshErrorRecords]);

    const handleDeleteErrorRecord = async (kimlik, e) => {
        e.stopPropagation();
        if (!window.confirm('Bu kayıt silinsin mi?')) return;
        const res = await fetch(`/api/errors/user-record/${kimlik}`, { method: 'DELETE' });
        if (res.ok) refreshErrorRecords();
    };

    // Panel her açıldığında, UserMenu'den seçilen sekmeye geç
    useEffect(() => {
        if (open) {
            setActiveTab(initialTab);
            if (initialTab === 'egitim') setEgitimSubTab('dashboard');
        }
    }, [open, initialTab]);

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

    // Sidebar genişliğine göre panel pozisyonu — panel daima sidebarın 3 katı (288 × 3)
    const sidebarW = isCollapsed ? 68 : 288;
    const panelWidthNum = 288 * 3; // 864px sabit
    const panelWidthStr = `${panelWidthNum}px`;

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
                    background: '#DC2626', display: 'flex',
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
                        borderBottom: activeTab === 'profil' ? '2px solid #DC2626' : '2px solid transparent'
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
                <button
                    onClick={() => setActiveTab('hatalar')}
                    style={{
                        padding: '10px 12px', fontSize: 11, fontWeight: 600, background: 'transparent',
                        color: activeTab === 'hatalar' ? '#f1f5f9' : '#64748b', border: 'none', cursor: 'pointer',
                        borderBottom: activeTab === 'hatalar' ? '2px solid #A01B1B' : '2px solid transparent'
                    }}
                >
                    Çözdüğüm Hatalar
                </button>
            </div>

            {/* ── BODY ── */}
            <div style={{ flex: 1, padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {activeTab === 'profil' && (
                    <div style={{
                        // UserPanel gövde padding'ini neutralize → MyProfileViewer
                        // kendi tasarımıyla yarım panele tam yerleşir.
                        margin: '-16px -16px',
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                    }}>
                        <MyProfileViewer currentUser={currentUser} onLogout={onLogout} />
                    </div>
                )}

                {activeTab === 'egitim' && (
                    <>
                        {/* Sayfa içi alt-sekme: Dashboard / Bilgi Girişi (modal olarak) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                                onClick={() => setEgitimSubTab('dashboard')}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '6px 12px', fontSize: 11, fontWeight: 600,
                                    borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
                                    border: '1px solid',
                                    background: egitimSubTab === 'dashboard' ? 'rgba(55,138,221,0.15)' : 'transparent',
                                    color: egitimSubTab === 'dashboard' ? '#60a5fa' : '#64748b',
                                    borderColor: egitimSubTab === 'dashboard' ? 'rgba(55,138,221,0.4)' : '#334155',
                                }}
                            >
                                <BarChart2 size={12} />
                                Dashboard
                            </button>
                            <button
                                onClick={() => setVeriGirisiModalOpen(true)}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '6px 12px', fontSize: 11, fontWeight: 600,
                                    borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
                                    border: '1px solid',
                                    background: veriGirisiModalOpen ? 'rgba(55,138,221,0.15)' : 'transparent',
                                    color: veriGirisiModalOpen ? '#60a5fa' : '#64748b',
                                    borderColor: veriGirisiModalOpen ? 'rgba(55,138,221,0.4)' : '#334155',
                                }}
                            >
                                <ClipboardList size={12} />
                                Bilgi Girişi
                            </button>
                        </div>
                        {egitimSubTab === 'dashboard' && <UserEgitimDashboard currentUser={currentUser} />}
                    </>
                )}

                {activeTab === 'talepler' && (
                    <div style={{
                        // Negative margin → UserPanel'in 16px gövde padding'ini neutralize
                        // et; viewer kendi iç padding'ini yönetir, panele tam yerleşir.
                        margin: '-16px -16px',
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                    }}>
                        <MyRequestsViewer currentUser={currentUser} />
                    </div>
                )}

                {activeTab === 'hatalar' && (
                    <div style={{
                        // UserPanel gövde padding'ini neutralize → viewer'i tam yerleştir
                        margin: '-16px -16px',
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                    }}>
                        <MyResolvedErrorsViewer currentUser={currentUser} />
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

            {/* ── Bilgi Girişi — Tam Ekran Ortada Modal ── */}
            {veriGirisiModalOpen && ReactDOM.createPortal(
                <div
                    onClick={() => setVeriGirisiModalOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: 'veriGirisiBackdropIn 0.2s ease',
                    }}
                >
                    <style>{`
                        @keyframes veriGirisiBackdropIn { from { opacity:0 } to { opacity:1 } }
                        @keyframes veriGirisiPanelIn { from { opacity:0; transform:scale(0.96) translateY(12px) } to { opacity:1; transform:scale(1) translateY(0) } }
                    `}</style>
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: '80%', maxWidth: 960, height: '85vh',
                            background: 'linear-gradient(180deg, #1e1e22 0%, #1a1a1c 100%)',
                            border: '1px solid #2a2a2d',
                            borderRadius: 14,
                            boxShadow: '0 32px 80px rgba(0,0,0,0.55)',
                            display: 'flex', flexDirection: 'column',
                            overflow: 'hidden',
                            animation: 'veriGirisiPanelIn 0.25s cubic-bezier(0.16,1,0.3,1)',
                        }}
                    >
                        {/* Modal Header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '16px 24px', borderBottom: '1px solid #2a2a2d',
                            background: 'rgba(255,255,255,0.02)', flexShrink: 0,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <ClipboardList size={16} style={{ color: '#60a5fa' }} />
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>Bilgi Girişi</span>
                                <span style={{
                                    fontSize: 9, padding: '2px 8px', borderRadius: 4,
                                    background: 'rgba(55,138,221,0.12)', color: '#60a5fa',
                                    border: '1px solid rgba(55,138,221,0.3)',
                                }}>Eğitim & Sertifika</span>
                            </div>
                            <button
                                onClick={() => setVeriGirisiModalOpen(false)}
                                style={{
                                    background: 'transparent', border: '1px solid #333',
                                    borderRadius: 8, cursor: 'pointer', padding: '6px 8px',
                                    color: '#64748b', display: 'flex', alignItems: 'center', gap: 6,
                                    fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#333'; }}
                            >
                                <X size={14} />
                                Kapat
                            </button>
                        </div>

                        {/* Modal Body — scrollable */}
                        <div style={{
                            flex: 1, overflowY: 'auto', padding: '20px 28px',
                            scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent',
                        }}>
                            <UserVeriGirisi currentUser={currentUser} />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default UserPanel;
