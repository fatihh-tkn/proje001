import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from './components/sidebar/Sidebar';
import AdminSidebar from './components/sidebar/AdminSidebar';
import Workspace from './components/workspace/Workspace';
import GlobalChatRoom from './components/workspace/GlobalChatRoom';
import ChatInput from './components/chatbar/ChatBar';
import { BootLogs } from './components/workspace/BootLogs';
import { useWorkspaceStore } from './store/workspaceStore';
import { useErrorStore } from './store/errorStore';
import Login from './components/auth/Login';
import OnboardingWizard from './components/auth/OnboardingWizard';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/ui/Toast';

const CHAT_PANEL_KEY = 'global_chat_panel_width';
const CHAT_PANEL_DEFAULT = 340;
const CHAT_PANEL_MIN = 180;
const CHAT_PANEL_CLOSE_THRESHOLD = 100; // bu genişliğin altına düşünce panel kapanır

function App() {
  const {
    isLeftCollapsed, setIsLeftCollapsed,
    isRightOpen, setIsRightOpen,
    isLoggedIn, setIsLoggedIn,
    currentUser, setCurrentUser,
    handleBackgroundDoubleClick,
    workspaces, activeWorkspaceId, recentlyClosed,
    handleOpenFile, handleCloseTab, handleMaximizeTab,
    handleFocusTab, handleMinimize, handleAddWorkspace,
    handleCloseWorkspace, handleSwitchWorkspace, handleReopenTab,
    handleCloseAllTabs: _handleCloseAllTabs, isN8nBooting: _isN8nBooting, setIsN8nBooting
  } = useWorkspaceStore();

  const addToast = useErrorStore((s) => s.addToast);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
  const tabs = activeWorkspace?.tabs || [];
  const activeTabId = activeWorkspace?.activeTabId || null;
  const maximizedTabId = activeWorkspace?.maximizedTabId || null;

  const [isAdminMode, setIsAdminMode] = useState(false);

  // ── Global Chat Panel ───────────────────────────────────────────────────
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [activeChannelId, setActiveChannelId] = useState('genel');
  const [chatPanelWidth, setChatPanelWidth] = useState(() => {
    try {
      const v = parseInt(localStorage.getItem(CHAT_PANEL_KEY) || '', 10);
      return Number.isFinite(v) && v >= CHAT_PANEL_MIN ? v : CHAT_PANEL_DEFAULT;
    } catch (_) { return CHAT_PANEL_DEFAULT; }
  });
  const [isResizing, setIsResizing] = useState(false);

  const startResize = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startW = chatPanelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (mv) => {
      const next = startW + mv.clientX - startX;
      if (next < CHAT_PANEL_CLOSE_THRESHOLD) {
        setChatPanelWidth(CHAT_PANEL_DEFAULT);
        setChatPanelOpen(false);
      } else {
        setChatPanelWidth(Math.min(next, 700));
      }
    };
    const onUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      try { localStorage.setItem(CHAT_PANEL_KEY, String(chatPanelWidth)); } catch (_) { }
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [chatPanelWidth]);

  // PC Heartbeat — login olunca PC'yi sisteme kaydet, 60 sn'de bir güncelle
  useEffect(() => {
    if (!isLoggedIn) return;

    const getPcId = () => {
      let fp = localStorage.getItem('_pc_fp');
      if (!fp) { fp = 'pc_' + Math.random().toString(36).substring(2, 14); localStorage.setItem('_pc_fp', fp); }
      return fp;
    };
    const getTabId = () => {
      let tok = sessionStorage.getItem('_tab_tok');
      if (!tok) { tok = 'tab_' + Math.random().toString(36).substring(2, 14); sessionStorage.setItem('_tab_tok', tok); }
      return tok;
    };

    const sendHeartbeat = () => {
      fetch('/api/monitor/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pc_id: getPcId(),
          tab_id: getTabId(),
          user_id: currentUser?.id || null,
        }),
      }).catch(() => { });
    };

    sendHeartbeat();
    const timer = setInterval(sendHeartbeat, 60_000);
    return () => clearInterval(timer);
  }, [isLoggedIn, currentUser?.id]);

  // 401 → otomatik logout
  useEffect(() => {
    const handleAuthLogout = () => {
      setIsLoggedIn(false);
      setCurrentUser(null);
    };
    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, [setIsLoggedIn, setCurrentUser]);

  // Audit: Sekme Görüntüleme Loglayıcı
  useEffect(() => {
    if (activeTabId && currentUser) {
      fetch('/api/auth/audit/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kullanici_kimlik: currentUser.id,
          islem_turu: 'TAB_VIEW',
          tablo_adi: String(activeTabId).substring(0, 100)
        })
      }).catch((e) => console.warn('[Audit]', e.message));
    }
  }, [activeTabId, currentUser]);

  // Global N8n Boot Logic
  useEffect(() => {
    let evtSource = null;

    const handleOpenWorkspace = async () => {
      // Tab'ı hemen aç — iframe n8n hazır olduğunda yüklenir
      handleOpenFile({ id: 'n8n-viewer', title: 'Otomasyon', type: 'n8n', forceMaximize: true });

      // n8n durumunu kontrol et, gerekirse arka planda başlat
      try {
        const res = await fetch('/api/n8n/status');
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'running' || data.status === 'installing') return;
        }
      } catch (e) {
        console.warn('[N8n] Durum kontrol hatası:', e.message);
        return; // Backend'e ulaşılamıyor, tab zaten açıldı
      }

      // Durdurulmuş — arka planda başlatmayı dene
      setIsN8nBooting(true);

      try {
        const startRes = await fetch('/api/n8n/start', { method: 'POST' });
        if (startRes.ok) {
          const startData = await startRes.json();
          if (startData.status === 'already_running') { setIsN8nBooting(false); return; }
          if (startData.status === 'error') {
            setIsN8nBooting(false);
            addToast({ type: 'warning', message: 'Otomasyon motoru başlatılamadı. n8n kurulu mu?' });
            return;
          }
        }
      } catch (e) {
        console.warn('[N8n] Başlatma hatası:', e.message);
        setIsN8nBooting(false);
        return;
      }

      // SSE ile başlatma tamamlanmasını bekle (sadece booting göstergesi için)
      evtSource = new EventSource('/api/n8n/status/stream');
      evtSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status === 'running') {
            evtSource.close(); evtSource = null;
            setIsN8nBooting(false);
          } else if (data.status === 'timeout' || data.status === 'stopped') {
            evtSource.close(); evtSource = null;
            setIsN8nBooting(false);
          }
        } catch (e) {
          console.warn('[N8n] SSE mesaj ayrıştırma hatası:', e.message);
        }
      };
      evtSource.onerror = () => {
        if (evtSource) { evtSource.close(); evtSource = null; }
        setIsN8nBooting(false);
      };
    };

    window.addEventListener('open-n8n-workspace', handleOpenWorkspace);
    return () => {
      window.removeEventListener('open-n8n-workspace', handleOpenWorkspace);
      if (evtSource) evtSource.close();
    };
  }, [handleOpenFile, setIsN8nBooting, addToast]);

  if (!isLoggedIn) {
    return <Login onLogin={(user) => {
      setIsLoggedIn(true);
      setCurrentUser(user);
    }} />;
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-full bg-[#f8f9fa] overflow-hidden font-sans text-slate-800">

        {/* 1. SÜTUN: SOL MENÜ */}
        {isAdminMode ? (
          <AdminSidebar
            onOpenFile={handleOpenFile}
            onExitAdmin={() => setIsAdminMode(false)}
          />
        ) : (
          <Sidebar
            onOpenFile={handleOpenFile}
            tabs={tabs}
            isCollapsed={isLeftCollapsed}
            setIsCollapsed={setIsLeftCollapsed}
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onSwitchWorkspace={handleSwitchWorkspace}
            onAddWorkspace={handleAddWorkspace}
            onCloseWorkspace={handleCloseWorkspace}
            recentlyClosed={recentlyClosed}
            onReopenTab={handleReopenTab}
            chatPanelOpen={chatPanelOpen}
            activeChannelId={activeChannelId}
            onSelectChannel={(id) => { setActiveChannelId(id); setChatPanelOpen(true); }}
            onToggleChatPanel={() => setChatPanelOpen(v => !v)}
            onEnterAdmin={() => setIsAdminMode(true)}
          />
        )}

        {/* 2. SÜTUN: MESAJ PANELİ (genişlik ayarlanabilir, kenara çekerek kapatılabilir) */}
        <div
          style={{
            width: chatPanelOpen ? chatPanelWidth : 0,
            minWidth: 0,
            flexShrink: 0,
            height: '100%',
            overflow: 'hidden',
            position: 'relative',
            transition: isResizing ? 'none' : 'width 0.22s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {/* İçerik sabit genişlikte — animasyon sırasında sıkışmasın */}
          <div style={{ width: chatPanelWidth, height: '100%', position: 'absolute', top: 0, left: 0 }}>
            <GlobalChatRoom
              activeChannelId={activeChannelId}
              setActiveChannelId={setActiveChannelId}
              onClose={() => setChatPanelOpen(false)}
            />
          </div>
          {/* Resize handle — sol tarafa sürükleyince panel kapanır */}
          {chatPanelOpen && (
            <div
              onMouseDown={startResize}
              className="absolute right-0 top-0 h-full w-[4px] z-50 cursor-col-resize bg-transparent hover:bg-white/10 active:bg-[#DC2626]/40 transition-colors"
              title="Sürükle: genişlet / daralt · Sola çek: kapat"
            />
          )}
        </div>

        {/* 3. SÜTUN: ORTA ANA ÇALIŞMA ALANI */}
        <main className="flex-1 flex flex-col h-full relative overflow-hidden z-10">
          <div className="flex flex-col h-full z-10 relative">
            <BootLogs />
            <ErrorBoundary compact>
              <Workspace
                activeTabId={activeTabId}
                tabs={tabs}
                maximizedTabId={maximizedTabId}
                onMinimize={handleMinimize}
                onCloseTab={handleCloseTab}
                onFocusTab={handleFocusTab}
                onMaximizeTab={handleMaximizeTab}
                onOpenFile={handleOpenFile}
                onBackgroundDoubleClick={handleBackgroundDoubleClick}
              />
            </ErrorBoundary>
          </div>
        </main>

        {/* 4. SÜTUN: SAĞ YAPAY ZEKA ASİSTANI */}
        <ErrorBoundary compact>
          <ChatInput
            onOpenFile={handleOpenFile}
            isSideOpen={isRightOpen}
            setIsSideOpen={setIsRightOpen}
          />
        </ErrorBoundary>

        {isLoggedIn && !currentUser?.meta?.onboarding_completed && (
          <OnboardingWizard
            user={currentUser}
            onComplete={(newMeta) => {
              setCurrentUser({ ...currentUser, meta: newMeta });
            }}
          />
        )}

        <ToastContainer />
      </div>
    </ErrorBoundary>
  );
}

export default App;
