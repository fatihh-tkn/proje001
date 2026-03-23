import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Clock, FileText, ChevronRight, Settings, Database, Bot, Activity } from 'lucide-react';

// Sekme tipine göre icon döndür
const getTabIcon = (tab, size = 10) => {
    switch (tab.type) {
        case 'api-usage': return <Bot size={size} className="text-purple-400 shrink-0" />;
        case 'database': return <Database size={size} className="text-blue-400 shrink-0" />;
        case 'settings': return <Settings size={size} className="text-slate-400 shrink-0" />;
        case 'pdf': return <FileText size={size} className="text-red-400 shrink-0" />;
        default: return <FileText size={size} className="text-emerald-400 shrink-0" />;
    }
};

// Renk paleti oluştur (Alan adlarına veya id'lerine göre rastgele kalıcı renk atamak için)
const wsColors = ['#A01B1B', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

// Tek bir çalışma alanı dikdörtgen akordeonu
const WorkspaceCard = ({ workspace, isActive, onClick, onClose, index }) => {
    const tabs = workspace.tabs || [];
    const [isHovered, setIsHovered] = useState(false);

    // Id veya index'e göre bir tema rengi seç
    const wsColor = workspace.color || wsColors[(index || 0) % wsColors.length];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.05}
            whileDrag={{ scale: 1.05, boxShadow: `0 15px 30px rgba(0,0,0,0.5)`, zIndex: 50 }}
            transition={{ duration: 0.2 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                borderLeft: `4px solid ${wsColor}`,
                boxShadow: isActive ? `0 4px 20px ${wsColor}20` : 'none',
            }}
            className={`relative flex flex-col rounded-sm border transition-all duration-300
                ${isActive
                    ? 'bg-slate-800 border-slate-700'
                    : 'border-slate-700/40 bg-slate-800/40 hover:bg-slate-800/80 hover:border-slate-600/60'
                }
            `}
        >
            {/* Üst Bar (Tıklanabilir Alan) */}
            <div
                className="flex items-center justify-between h-10 px-3 cursor-pointer group"
                onClick={onClick}
            >
                <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                    <ChevronRight
                        size={14}
                        style={{ color: isActive ? wsColor : undefined }}
                        className={`transition-transform duration-300 shrink-0 ${isActive ? 'rotate-90' : 'text-slate-500 group-hover:text-slate-300'}`}
                    />
                    <span className={`text-[12px] font-semibold tracking-wide truncate transition-colors ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                        {workspace.name}
                    </span>

                    {tabs.length > 0 && (
                        <AnimatePresence mode="popLayout">
                            <motion.span
                                key={tabs.length}
                                initial={{ scale: 0, rotate: -45 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                style={{ backgroundColor: isActive ? wsColor : undefined }}
                                className={`text-[9px] flex items-center justify-center font-bold px-1.5 py-0.5 rounded-[3px] font-mono min-w-[18px]
                                ${isActive ? 'text-white/90 shadow-sm' : 'bg-slate-700 text-slate-300 group-hover:bg-slate-600'}`}
                            >
                                {tabs.length}
                            </motion.span>
                        </AnimatePresence>
                    )}
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="w-6 h-6 rounded-md hover:bg-red-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-slate-400 hover:text-red-400 shrink-0 ml-2"
                    title="Çalışma Alanını Kapat"
                >
                    <X size={14} strokeWidth={2.5} />
                </button>
            </div>

            {/* Genişleyen İçerik (Açık sekmelerin listesi) */}
            <AnimatePresence>
                {isActive && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col px-1.5 pb-2 border-t border-slate-700/50"
                    >
                        {tabs.length === 0 ? (
                            <div className="text-[9px] text-slate-500 text-center py-3 italic">
                                Henüz açık sekme yok
                            </div>
                        ) : (
                            <div className="flex flex-col gap-0.5 mt-1.5">
                                {tabs.map(tab => (
                                    <div
                                        key={tab.id}
                                        title={tab.title}
                                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] transition-colors
                                            ${tab.id === workspace.activeTabId
                                                ? 'bg-slate-700/50 shadow-sm'
                                                : 'text-slate-400'
                                            }`}
                                    >
                                        {getTabIcon(tab, 10)}
                                        <span className={`text-[10px] truncate ${tab.id === workspace.activeTabId ? 'text-slate-200 font-medium' : 'text-slate-400'}`}>
                                            {tab.title}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hover Tooltip (Genişletilmemişken Sekmeleri Önizle) */}
            <AnimatePresence>
                {isHovered && !isActive && tabs.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, x: -10, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-full top-0 ml-3 z-50 w-52 bg-slate-800 border border-slate-600 rounded-md shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden"
                    >
                        <div className="bg-slate-700/80 px-3 py-2 border-b border-slate-600/50">
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{workspace.name} Önizlemesi</span>
                        </div>
                        <div className="p-2 flex flex-col gap-1 bg-slate-800/90">
                            {tabs.slice(0, 5).map(t => (
                                <div key={t.id} className="flex items-center gap-2 px-1.5 py-1 text-[10px] text-slate-300 truncate">
                                    {getTabIcon(t, 10)}
                                    <span className="truncate">{t.title}</span>
                                </div>
                            ))}
                            {tabs.length > 5 && (
                                <div className="text-[9px] text-slate-500 italic mt-1 px-1.5 font-medium">+{tabs.length - 5} sekme daha...</div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// Son kapatılan sekme satırı
const RecentlyClosedItem = ({ tab, onReopen }) => {
    const icon = tab.type === 'pdf'
        ? <FileText size={10} className="shrink-0 text-red-500/70" />
        : <Activity size={10} className="shrink-0 text-slate-500" />;

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] hover:bg-slate-800/60 cursor-pointer group transition-colors"
            onClick={(e) => {
                e.stopPropagation();
                onReopen();
            }}
            title={`Yeniden aç: ${tab.title}`}
        >
            {icon}
            <span className="text-[10px] font-medium text-slate-500 group-hover:text-slate-300 truncate flex-1 transition-colors">
                {tab.title}
            </span>
        </motion.div>
    );
};

// Ana WorkspacePanel bileşeni
const WorkspacePanel = ({
    workspaces,
    activeWorkspaceId,
    onSwitchWorkspace,
    onAddWorkspace,
    onCloseWorkspace,
    recentlyClosed,
    onReopenTab,
}) => {
    return (
        <div className="flex flex-col gap-4 w-full overflow-x-hidden">
            {/* Çalışma Alanları Listesi (Accordion) */}
            <div className="flex flex-col gap-1.5 w-full">
                <AnimatePresence>
                    {workspaces.map((ws, i) => (
                        <WorkspaceCard
                            key={ws.id}
                            index={i}
                            workspace={ws}
                            isActive={ws.id === activeWorkspaceId}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSwitchWorkspace(ws.id);
                            }}
                            onClose={() => onCloseWorkspace(ws.id)}
                        />
                    ))}
                </AnimatePresence>

                {/* Yeni çalışma alanı ekle (Yatay Buton) */}
                <motion.button
                    layout
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddWorkspace();
                    }}
                    className="flex items-center justify-center gap-2 h-8 mt-1 border border-dashed border-slate-700/60 rounded-[4px] hover:border-slate-500 hover:bg-slate-800/40 hover:text-slate-200 transition-all duration-150 cursor-pointer text-slate-400 group focus:outline-none"
                    title="Yeni Çalışma Alanı"
                >
                    <Plus size={14} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-medium tracking-wide">Yeni Alan</span>
                </motion.button>
            </div>

            {/* Son Kapatılanlar */}
            {recentlyClosed.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-800/60">
                    <div className="flex items-center gap-1.5 mb-2 px-1">
                        <Clock size={10} className="text-slate-500" />
                        <span className="text-[9px] font-bold text-slate-500 tracking-widest uppercase">Geçmiş (Kapatılanlar)</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <AnimatePresence>
                            {recentlyClosed.slice(0, 5).map((tab) => (
                                <RecentlyClosedItem
                                    key={tab.closedAt + tab.id}
                                    tab={tab}
                                    onReopen={() => onReopenTab(tab)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkspacePanel;
