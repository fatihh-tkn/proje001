import React from 'react';
import Sidebar from './components/sidebar/Sidebar';
import Workspace from './components/workspace/Workspace';
import ChatInput from './components/chatbar/ChatBar';
import { BootLogs } from './components/workspace/BootLogs';
import { useWorkspaceStore } from './store/workspaceStore';

function App() {
  const {
    isLeftCollapsed, setIsLeftCollapsed,
    isRightOpen, setIsRightOpen,
    handleBackgroundDoubleClick,
    workspaces, activeWorkspaceId, recentlyClosed,
    handleOpenFile, handleCloseTab, handleMaximizeTab,
    handleFocusTab, handleMinimize, handleAddWorkspace,
    handleCloseWorkspace, handleSwitchWorkspace, handleReopenTab,
    handleCloseAllTabs
  } = useWorkspaceStore();

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
  const tabs = activeWorkspace?.tabs || [];
  const activeTabId = activeWorkspace?.activeTabId || null;
  const maximizedTabId = activeWorkspace?.maximizedTabId || null;

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

    </div>
  );
}

export default App;