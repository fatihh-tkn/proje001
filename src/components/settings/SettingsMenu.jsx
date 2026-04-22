import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, X, Check, Database, Activity, Archive, Users, FileCog, HardDrive, Cpu, Bot, Mic, Zap, Layers, Webhook, MessageSquareText, ChevronDown, ChevronRight } from 'lucide-react';

const THEMES = [
    { id: 'dark', name: 'Koyu', colors: ['#1c1c1e', '#2d2d2d', '#A01B1B'] },
    { id: 'light', name: 'Açık', colors: ['#f8fafc', '#e2e8f0', '#A01B1B'] },
    { id: 'blue', name: 'Mavi', colors: ['#0f172a', '#1e293b', '#3b82f6'] },
    { id: 'green', name: 'Yeşil', colors: ['#0a1a0f', '#1a2e1a', '#22c55e'] },
    { id: 'purple', name: 'Mor', colors: ['#1a0a2e', '#2d1b4e', '#a855f7'] },
    { id: 'rose', name: 'Pembe', colors: ['#1a0a14', '#2e1b24', '#f43f5e'] },
];

const SettingsMenu = ({ isOpen, onClose, onThemeChange, onSetBasePath, onAddFiles, currentTheme = 'dark', currentBasePath = '', isCollapsed, onOpenFile, currentUser }) => {
    const [activeSection, setActiveSection] = useState(null);
    const [basePath, setBasePath] = useState(currentBasePath);
    const [isAiExpanded, setIsAiExpanded] = useState(false);
    const menuRef = useRef(null);

    const canSeeTab = (_key) => {
        if (currentUser?.super) return true;
        if (!currentUser?.meta) return true;
        return currentUser.meta[_key] !== false;
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                // Ayarlar ikonuna tıklanıyorsa kapanmasın
                const settingsIcon = e.target.closest('[data-settings-trigger]');
                if (settingsIcon) return;
                onClose();
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute z-[200] bg-[#1c1c1e] border border-[#333] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] overflow-hidden"
                    style={{
                        bottom: isCollapsed ? '70px' : '60px',
                        left: isCollapsed ? '10px' : '10px',
                        width: '230px',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2d2d2d]">
                        <span className="text-[12px] font-semibold text-white/80 tracking-wide">Ayarlar</span>
                        <button
                            onClick={onClose}
                            className="text-white/30 hover:text-white/70 transition-colors cursor-pointer p-0.5"
                        >
                            <X size={12} />
                        </button>
                    </div>

                    {/* Menü Listesi */}
                    <div className="py-1">

                        {canSeeTab('ui_file_processing') && (
                            <button
                                onClick={() => {
                                    if (onOpenFile) {
                                        onOpenFile({
                                            id: 'database-settings',
                                            title: 'Dosya İşleme',
                                            type: 'database',
                                        });
                                    }
                                    onClose();
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-[12px] transition-colors cursor-pointer text-white/60 hover:bg-white/[0.03] hover:text-white/80`}
                            >
                                <FileCog size={14} className="text-slate-500 shrink-0" />
                                <span>Dosya İşleme</span>
                            </button>
                        )}

                        {canSeeTab('ui_database') && (
                            <button
                                onClick={() => {
                                    if (onOpenFile) {
                                        onOpenFile({
                                            id: 'databases-viewer',
                                            title: 'Veritabanı',
                                            type: 'databases-viewer',
                                        });
                                    }
                                    onClose();
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-[12px] transition-colors cursor-pointer text-white/60 hover:bg-white/[0.03] hover:text-white/80`}
                            >
                                <Database size={14} className="text-slate-500 shrink-0" />
                                <span>Veritabanı</span>
                            </button>
                        )}

                        {canSeeTab('ui_ai_orchestrator') && (
                            <div className="my-2 border-t border-[#2d2d2d] pt-2">
                                <div
                                    className="px-4 py-1 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1 flex items-center justify-between cursor-pointer hover:text-white/60 transition-colors"
                                    onClick={() => setIsAiExpanded(!isAiExpanded)}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <Bot size={12} /> Yapay Zeka Merkezi
                                    </div>
                                    {isAiExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                </div>
                                <AnimatePresence>
                                    {isAiExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden flex flex-col"
                                        >
                                            <button
                                                onClick={() => {
                                                    if (onOpenFile) {
                                                        onOpenFile({
                                                            id: 'ai-architecture-center',
                                                            title: 'Mimari Merkezi',
                                                            type: 'ai-orchestrator',
                                                            meta: { defaultMainTab: 'architecture' }
                                                        });
                                                    }
                                                    onClose();
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2 text-[12px] transition-colors cursor-pointer text-white/60 hover:bg-white/[0.03] hover:text-white/80"
                                            >
                                                <Layers size={14} className="text-indigo-400 shrink-0" />
                                                <span>Mimari Merkezi</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (onOpenFile) {
                                                        onOpenFile({
                                                            id: 'ai-automation-center',
                                                            title: 'Otomasyon',
                                                            type: 'ai-orchestrator',
                                                            meta: { defaultMainTab: 'automation' }
                                                        });
                                                    }
                                                    onClose();
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2 text-[12px] transition-colors cursor-pointer text-white/60 hover:bg-white/[0.03] hover:text-white/80"
                                            >
                                                <Webhook size={14} className="text-rose-400 shrink-0" />
                                                <span>Otomasyon</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (onOpenFile) {
                                                        onOpenFile({
                                                            id: 'ai-playground-center',
                                                            title: 'Ai Playground',
                                                            type: 'ai-orchestrator',
                                                            meta: { defaultMainTab: 'playground' }
                                                        });
                                                    }
                                                    onClose();
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2 text-[12px] transition-colors cursor-pointer text-white/60 hover:bg-white/[0.03] hover:text-white/80"
                                            >
                                                <MessageSquareText size={14} className="text-teal-400 shrink-0" />
                                                <span>Playground</span>
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {canSeeTab('ui_metrics') && (
                            <button
                                onClick={() => {
                                    if (onOpenFile) {
                                        onOpenFile({
                                            id: 'api-usage-settings',
                                            title: 'Sistem Metrikleri',
                                            type: 'api-usage',
                                        });
                                    }
                                    onClose();
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-[12px] transition-colors cursor-pointer text-white/60 hover:bg-white/[0.03] hover:text-white/80`}
                            >
                                <Cpu size={14} className="text-slate-500 shrink-0" />
                                <span>Sistem Metrikleri</span>
                            </button>
                        )}

                        {canSeeTab('ui_auth') && (
                            <button
                                onClick={() => {
                                    if (onOpenFile) {
                                        onOpenFile({
                                            id: 'auth-settings',
                                            title: 'Kullanıcı ve Rol Yönetimi',
                                            type: 'auth',
                                        });
                                    }
                                    onClose();
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-[12px] transition-colors cursor-pointer text-white/60 hover:bg-white/[0.03] hover:text-white/80`}
                            >
                                <Users size={14} className="text-slate-500 shrink-0" />
                                <span>Kullanıcı ve Rol Yönetimi</span>
                            </button>
                        )}






                    </div>

                    {/* Footer */}
                    <div className="px-4 py-1.5 border-t border-[#2d2d2d]">
                        <span className="text-[9px] text-white/15">Yılgenci Base v1.0</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SettingsMenu;
