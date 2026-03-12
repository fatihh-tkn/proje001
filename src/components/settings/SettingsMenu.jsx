import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, FolderOpen, X, Check, Database, Activity } from 'lucide-react';

const THEMES = [
    { id: 'dark', name: 'Koyu', colors: ['#1c1c1e', '#2d2d2d', '#A01B1B'] },
    { id: 'light', name: 'Açık', colors: ['#f8fafc', '#e2e8f0', '#A01B1B'] },
    { id: 'blue', name: 'Mavi', colors: ['#0f172a', '#1e293b', '#3b82f6'] },
    { id: 'green', name: 'Yeşil', colors: ['#0a1a0f', '#1a2e1a', '#22c55e'] },
    { id: 'purple', name: 'Mor', colors: ['#1a0a2e', '#2d1b4e', '#a855f7'] },
    { id: 'rose', name: 'Pembe', colors: ['#1a0a14', '#2e1b24', '#f43f5e'] },
];

const SettingsMenu = ({ isOpen, onClose, onThemeChange, onSetBasePath, onAddFiles, currentTheme = 'dark', currentBasePath = '', isCollapsed, onOpenFile }) => {
    const [activeSection, setActiveSection] = useState(null);
    const [basePath, setBasePath] = useState(currentBasePath);
    const menuRef = useRef(null);

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

                        {/* TEMA */}
                        <button
                            onClick={() => setActiveSection(activeSection === 'theme' ? null : 'theme')}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-[12px] transition-colors cursor-pointer
                ${activeSection === 'theme' ? 'bg-white/5 text-white' : 'text-white/60 hover:bg-white/[0.03] hover:text-white/80'}`}
                        >
                            <Palette size={14} className="text-slate-500 shrink-0" />
                            <span>Tema</span>
                        </button>

                        <AnimatePresence>
                            {activeSection === 'theme' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="overflow-hidden bg-[#161616]"
                                >
                                    <div className="py-1">
                                        {THEMES.map((theme) => (
                                            <button
                                                key={theme.id}
                                                onClick={() => onThemeChange && onThemeChange(theme.id)}
                                                className={`w-full flex items-center gap-3 px-6 py-1.5 text-[11px] transition-colors cursor-pointer
                          ${currentTheme === theme.id
                                                        ? 'text-white/90 bg-white/5'
                                                        : 'text-white/40 hover:text-white/60 hover:bg-white/[0.02]'
                                                    }`}
                                            >
                                                <div className="flex gap-1">
                                                    {theme.colors.map((color, i) => (
                                                        <div
                                                            key={i}
                                                            className="w-3 h-3 rounded-full border border-white/10"
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="flex-1 text-left">{theme.name}</span>
                                                {currentTheme === theme.id && (
                                                    <Check size={12} className="text-red-500 shrink-0" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* DOSYA YOLU */}
                        <button
                            onClick={() => setActiveSection(activeSection === 'path' ? null : 'path')}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-[12px] transition-colors cursor-pointer
                ${activeSection === 'path' ? 'bg-white/5 text-white' : 'text-white/60 hover:bg-white/[0.03] hover:text-white/80'}`}
                        >
                            <FolderOpen size={14} className="text-slate-500 shrink-0" />
                            <span>Dosya Yolu</span>
                        </button>

                        <AnimatePresence>
                            {activeSection === 'path' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="overflow-hidden bg-[#161616]"
                                >
                                    <div className="px-4 py-2.5 space-y-2">
                                        <input
                                            type="text"
                                            value={basePath}
                                            onChange={(e) => setBasePath(e.target.value)}
                                            onBlur={() => {
                                                if (onSetBasePath && basePath.trim()) {
                                                    onSetBasePath(basePath.trim());
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && onSetBasePath && basePath.trim()) {
                                                    onSetBasePath(basePath.trim());
                                                }
                                            }}
                                            placeholder="C:\Belgeler\Projeler..."
                                            className="w-full bg-[#111] border border-[#333] rounded-md px-2.5 py-1.5 text-[11px] text-white/70 placeholder-white/15 outline-none focus:border-[#555] transition-colors"
                                        />

                                        <div className="flex gap-2 w-full pt-1">
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const res = await fetch('/api/files/dialog');
                                                        const data = await res.json();
                                                        if (data.path) {
                                                            setBasePath(data.path);
                                                            if (onSetBasePath) onSetBasePath(data.path);
                                                            onClose();
                                                        }
                                                    } catch (err) {
                                                        console.error(err);
                                                    }
                                                }}
                                                className="flex-1 py-1.5 bg-[#333] hover:bg-[#444] text-white/90 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer"
                                                title="Klasör Seç (Kalıcı)"
                                            >
                                                Gözat
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const res = await fetch('/api/files/dialog_file');
                                                        const data = await res.json();
                                                        if (data.paths && data.paths.length > 0) {
                                                            if (onAddFiles) onAddFiles(data.paths);
                                                            onClose();
                                                        }
                                                    } catch (err) {
                                                        console.error(err);
                                                    }
                                                }}
                                                className="flex-1 py-1.5 bg-[#333] hover:bg-[#444] text-white/90 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer"
                                                title="Geçici Bireysel Dosya Seç"
                                            >
                                                Dosya Ekle
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* VERİTABANI */}
                        <div className="w-full h-px bg-white/[0.05] my-1" />
                        <button
                            onClick={() => {
                                if (onOpenFile) {
                                    onOpenFile({
                                        id: 'database-settings',
                                        title: 'Veritabanı Yönetimi',
                                        type: 'database',
                                    });
                                }
                                onClose();
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-[12px] transition-colors cursor-pointer text-white/60 hover:bg-white/[0.03] hover:text-white/80`}
                        >
                            <Database size={14} className="text-slate-500 shrink-0" />
                            <span>Veritabanı</span>
                        </button>

                        {/* API KULLANIMI */}
                        <button
                            onClick={() => {
                                if (onOpenFile) {
                                    onOpenFile({
                                        id: 'api-usage-settings',
                                        title: 'API Kullanımı',
                                        type: 'api-usage',
                                    });
                                }
                                onClose();
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-[12px] transition-colors cursor-pointer text-white/60 hover:bg-white/[0.03] hover:text-white/80`}
                        >
                            <Activity size={14} className="text-slate-500 shrink-0" />
                            <span>API Kullanımı</span>
                        </button>
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
