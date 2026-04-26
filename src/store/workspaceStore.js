import { create } from 'zustand';

// Yeni çalışma alanı şablonu
const createWorkspace = (name) => ({
  id: `ws-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  name,
  tabs: [],
  activeTabId: null,
  maximizedTabId: null,
});

const initialWorkspace = createWorkspace('Alan 1');

export const useWorkspaceStore = create((set, get) => ({
  // --- STATE ---
  workspaces: [initialWorkspace],
  activeWorkspaceId: initialWorkspace.id,
  recentlyClosed: [],

  // Layout states for App.jsx
  isLeftCollapsed: false,
  isRightOpen: true,

  // Authentication State
  isLoggedIn: false,
  currentUser: null,

  // N8n Booting State
  isN8nBooting: false,

  // --- ACTIONS ---

  // Layout Actions
  setIsLeftCollapsed: (value) => set({ isLeftCollapsed: value }),
  setIsRightOpen: (value) => set({ isRightOpen: value }),
  setIsN8nBooting: (value) => set({ isN8nBooting: value }),
  setIsLoggedIn: (value) => set({ isLoggedIn: value }),
  setCurrentUser: (user) => set({ currentUser: user }),
  handleBackgroundDoubleClick: () => set((state) => {
    const isAnyOpen = !state.isLeftCollapsed || state.isRightOpen;
    return {
      isLeftCollapsed: isAnyOpen,
      isRightOpen: !isAnyOpen
    };
  }),

  // Workspace Getter Helper
  getActiveWorkspace: () => {
    const { workspaces, activeWorkspaceId } = get();
    return workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
  },

  // Ortak Workspace Güncelleyici
  updateActiveWorkspace: (updater) => set((state) => ({
    workspaces: state.workspaces.map(w =>
      w.id === state.activeWorkspaceId ? { ...w, ...updater(w) } : w
    )
  })),

  // Sekme İşlemleri
  handleOpenFile: (file) => get().updateActiveWorkspace((ws) => {
    const exists = ws.tabs.find(t => t.id === file.id);
    const newTabs = exists ? ws.tabs : [...ws.tabs, file];
    const newMaximized = ws.maximizedTabId || file.forceMaximize ? file.id : ws.maximizedTabId;
    return {
      tabs: newTabs,
      activeTabId: file.id,
      maximizedTabId: newMaximized,
    };
  }),

  handleCloseTab: (id, e, options = {}) => {
    if (e?.stopPropagation) e.stopPropagation();

    // Özel Davranış: N8n sekmesi kapanırken motoru da kapat
    if (id === 'n8n-viewer' && !options.keepAlive) {
      fetch('/api/n8n/stop', { method: 'POST' }).catch((e) =>
        console.warn('[N8n] Durdurma isteği başarısız:', e.message)
      );
    }

    // Son kapatılanlar listesine ekle
    const ws = get().getActiveWorkspace();
    const closingTab = ws.tabs.find(t => t.id === id);
    if (closingTab) {
      set((state) => ({
        recentlyClosed: [{ ...closingTab, closedAt: Date.now() }, ...state.recentlyClosed].slice(0, 20)
      }));
    }

    get().updateActiveWorkspace((wsLocal) => {
      const newTabs = wsLocal.tabs.filter(t => t.id !== id);
      const newActive = wsLocal.activeTabId === id
        ? (newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null)
        : wsLocal.activeTabId;
      return {
        tabs: newTabs,
        activeTabId: newActive,
        maximizedTabId: wsLocal.maximizedTabId === id ? null : wsLocal.maximizedTabId,
      };
    });
  },

  handleCloseAllTabs: () => {
    const ws = get().getActiveWorkspace();
    if (ws.tabs.length > 0) {
      set((state) => ({
        recentlyClosed: [
          ...ws.tabs.map(t => ({ ...t, closedAt: Date.now() })),
          ...state.recentlyClosed
        ].slice(0, 20)
      }));
    }

    get().updateActiveWorkspace(() => ({
      tabs: [],
      activeTabId: null,
      maximizedTabId: null,
    }));
  },

  handleMaximizeTab: (id) => get().updateActiveWorkspace((ws) => ({
    maximizedTabId: ws.maximizedTabId === id ? null : id,
    activeTabId: id,
  })),

  handleFocusTab: (id) => get().updateActiveWorkspace(() => ({
    activeTabId: id
  })),

  handleMinimize: () => get().updateActiveWorkspace(() => ({
    activeTabId: null
  })),

  // Çalışma Alanı İşlemleri
  handleAddWorkspace: () => set((state) => {
    const newWs = createWorkspace(`Alan ${state.workspaces.length + 1}`);
    return {
      workspaces: [...state.workspaces, newWs],
      activeWorkspaceId: newWs.id
    };
  }),

  handleCloseWorkspace: (id) => set((state) => {
    const targetWs = state.workspaces.find(w => w.id === id);
    let newRecentlyClosed = state.recentlyClosed;

    if (targetWs?.tabs?.length > 0) {
      newRecentlyClosed = [
        ...targetWs.tabs.map(t => ({ ...t, closedAt: Date.now() })),
        ...newRecentlyClosed
      ].slice(0, 20);
    }

    // Son alan kapatılıyorsa taze bir tane aç
    if (state.workspaces.length <= 1) {
      const freshWs = createWorkspace('Alan 1');
      return {
        workspaces: [freshWs],
        activeWorkspaceId: freshWs.id,
        recentlyClosed: newRecentlyClosed
      };
    }

    const remaining = state.workspaces.filter(w => w.id !== id);
    return {
      workspaces: remaining,
      activeWorkspaceId: state.activeWorkspaceId === id ? remaining[0].id : state.activeWorkspaceId,
      recentlyClosed: newRecentlyClosed
    };
  }),

  handleSwitchWorkspace: (id) => set({ activeWorkspaceId: id }),

  handleReopenTab: (tab) => {
    const { closedAt, ...cleanTab } = tab;
    get().handleOpenFile(cleanTab);
    set((state) => ({
      recentlyClosed: state.recentlyClosed.filter(t => !(t.id === tab.id && t.closedAt === tab.closedAt))
    }));
  }
}));
