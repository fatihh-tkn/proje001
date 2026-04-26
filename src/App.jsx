import React, { useEffect } from 'react';
import Sidebar from './components/sidebar/Sidebar';
import Workspace from './components/workspace/Workspace';
import ChatInput from './components/chatbar/ChatBar';
import { BootLogs } from './components/workspace/BootLogs';
import { useWorkspaceStore } from './store/workspaceStore';
import Login from './components/auth/Login';
import OnboardingWizard from './components/auth/OnboardingWizard';

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
    handleCloseAllTabs, isN8nBooting, setIsN8nBooting
  } = useWorkspaceStore();

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
  const tabs = activeWorkspace?.tabs || [];
  const activeTabId = activeWorkspace?.activeTabId || null;
  const maximizedTabId = activeWorkspace?.maximizedTabId || null;

  // PC Heartbeat — login olunca PC'yi sisteme kaydet, 60 sn'de bir güncelle
  useEffect(() => {
    if (!isLoggedIn) return;

    const getPcId = () => {
      let fp = localStorage.getItem('_pc_fp');
      if (!fp) { fp = 'pc_' + Math.random().toString(36).substr(2, 12); localStorage.setItem('_pc_fp', fp); }
      return fp;
    };
    const getTabId = () => {
      let tok = sessionStorage.getItem('_tab_tok');
      if (!tok) { tok = 'tab_' + Math.random().toString(36).substr(2, 12); sessionStorage.setItem('_tab_tok', tok); }
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
      }).catch(() => {});
    };

    sendHeartbeat();
    const timer = setInterval(sendHeartbeat, 60_000);
    return () => clearInterval(timer);
  }, [isLoggedIn, currentUser?.id]);

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
      }).catch(() => { });
    }
  }, [activeTabId, currentUser]);

  // Global N8n Boot Logic (Tıklama sonrası)
  useEffect(() => {
    let pollInterval = null;

    const handleOpenWorkspace = async () => {
      // 1. Zaten çalışıyorsa anında aç
      try {
        const res = await fetch('/api/n8n/status');
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'running') {
            handleOpenFile({ id: 'n8n-viewer', title: 'Otomasyon', type: 'n8n', forceMaximize: true });
            return;
          }
        }
      } catch { }

      // 2. Çalışmıyorsa sidebarda logoyu döndürmeye başla
      setIsN8nBooting(true);

      try { await fetch('/api/n8n/start', { method: 'POST' }); } catch { }

      // 3. Çalışana kadar bekle
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch('/api/n8n/status');
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'running') {
              clearInterval(pollInterval);
              setIsN8nBooting(false);
              handleOpenFile({ id: 'n8n-viewer', title: 'Otomasyon', type: 'n8n', forceMaximize: true });
            }
          }
        } catch { }
      }, 2000);
    };

    window.addEventListener('open-n8n-workspace', handleOpenWorkspace);
    return () => {
      window.removeEventListener('open-n8n-workspace', handleOpenWorkspace);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [handleOpenFile, setIsN8nBooting]);

  if (!isLoggedIn) {
    return <Login onLogin={(user) => {
      setIsLoggedIn(true);
      setCurrentUser(user);
    }} />;
  }

  return (
    <div className="flex h-screen w-full bg-[#f8f9fa] overflow-hidden font-sans text-slate-800">

      {/* 1. SÜTUN: SOL MENÜ */}
      <Sidebar
        onOpenFile={handleOpenFile}
        tabs={tabs}
        isCollapsed={isLeftCollapsed}
        setIsCollapsed={setIsLeftCollapsed}
        // Workspace Yönetimi props'ları
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSwitchWorkspace={handleSwitchWorkspace}
        onAddWorkspace={handleAddWorkspace}
        onCloseWorkspace={handleCloseWorkspace}
        recentlyClosed={recentlyClosed}
        onReopenTab={handleReopenTab}
      />

      {/* 2. SÜTUN: ORTA ANA ÇALIŞMA ALANI */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden z-10">
        <div className="flex flex-col h-full z-10 relative">
          <BootLogs />

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
        </div>
      </main>

      {/* 3. SÜTUN: SAĞ YAPAY ZEKA ASİSTANI */}
      <ChatInput
        onOpenFile={handleOpenFile}
        isSideOpen={isRightOpen}
        setIsSideOpen={setIsRightOpen}
      />

      {isLoggedIn && !currentUser?.meta?.onboarding_completed && (
        <OnboardingWizard
          user={currentUser}
          onComplete={(newMeta) => {
            setCurrentUser({ ...currentUser, meta: newMeta });
          }}
        />
      )}

    </div>
  );
}

export default App;