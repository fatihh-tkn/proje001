import React, { useEffect } from 'react';
import Sidebar from './components/sidebar/Sidebar';
import Workspace from './components/workspace/Workspace';
import ChatInput from './components/chatbar/ChatBar';
import { BootLogs } from './components/workspace/BootLogs';
import { useWorkspaceStore } from './store/workspaceStore';
import { useErrorStore } from './store/errorStore';
import Login from './components/auth/Login';
import OnboardingWizard from './components/auth/OnboardingWizard';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/ui/Toast';

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

  const addToast = useErrorStore((s) => s.addToast);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
  const tabs = activeWorkspace?.tabs || [];
  const activeTabId = activeWorkspace?.activeTabId || null;
  const maximizedTabId = activeWorkspace?.maximizedTabId || null;

  // 401 → otomatik logout
  useEffect(() => {
    const handleAuthLogout = () => {
      setIsLoggedIn(false);
      setCurrentUser(null);
    };
    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, [setIsLoggedIn, setCurrentUser]);

  // Audit: Sekme Görüntüleme Loglayıcı — hata sessizce yutulur (kritik değil)
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
      } catch (e) {
        console.warn('[N8n] Durum kontrol hatası:', e.message);
      }

      // 2. Çalışmıyorsa logoyu döndür ve başlatmayı dene
      setIsN8nBooting(true);

      try {
        await fetch('/api/n8n/start', { method: 'POST' });
      } catch (e) {
        console.warn('[N8n] Başlatma hatası:', e.message);
        addToast({ type: 'error', message: 'Otomasyon motoru başlatılamadı.' });
        setIsN8nBooting(false);
        return;
      }

      // 3. Çalışana kadar SSE ile bekle (polling yerine sunucu itişi)
      evtSource = new EventSource('/api/n8n/status/stream');
      evtSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status === 'running') {
            evtSource.close();
            evtSource = null;
            setIsN8nBooting(false);
            handleOpenFile({ id: 'n8n-viewer', title: 'Otomasyon', type: 'n8n', forceMaximize: true });
          } else if (data.status === 'timeout' || data.status === 'stopped') {
            evtSource.close();
            evtSource = null;
            setIsN8nBooting(false);
            addToast({ type: 'error', message: 'Otomasyon motoru başlatılamadı.' });
          }
        } catch (e) {
          console.warn('[N8n] SSE mesaj ayrıştırma hatası:', e.message);
        }
      };
      evtSource.onerror = () => {
        if (evtSource) { evtSource.close(); evtSource = null; }
        setIsN8nBooting(false);
        addToast({ type: 'error', message: 'Otomasyon durumu alınamadı.' });
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
        />

        {/* 2. SÜTUN: ORTA ANA ÇALIŞMA ALANI */}
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

        {/* 3. SÜTUN: SAĞ YAPAY ZEKA ASİSTANI */}
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
