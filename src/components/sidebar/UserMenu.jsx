import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, BarChart2, MessageSquare } from 'lucide-react';

const UserMenu = ({ isOpen, onClose, onSelect, isCollapsed, currentUser }) => {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                const trigger = e.target.closest('[data-user-menu-trigger]');
                if (trigger) return;
                onClose();
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const items = [
        { id: 'profil',   label: 'Profil',       Icon: User,            color: '#A01B1B' },
        { id: 'egitim',   label: 'Eğitimlerim',  Icon: BarChart2,       color: '#378ADD' },
        { id: 'talepler', label: 'Taleplerim',   Icon: MessageSquare,   color: '#10b981' },
    ];

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
                        right: isCollapsed ? 'auto' : '10px',
                        left:  isCollapsed ? '10px' : 'auto',
                        width: '230px',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2d2d2d]">
                        <span className="text-[12px] font-semibold text-white/80 tracking-wide truncate">
                            {currentUser?.tam_ad || 'Kullanıcı'}
                        </span>
                        <button
                            onClick={onClose}
                            className="text-white/30 hover:text-white/70 transition-colors cursor-pointer p-0.5"
                        >
                            <X size={12} />
                        </button>
                    </div>

                    {/* Menü Listesi */}
                    <div className="py-1">
                        {items.map(({ id, label, Icon, color }) => (
                            <button
                                key={id}
                                onClick={() => { onSelect(id); onClose(); }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-[12px] transition-colors cursor-pointer text-white/60 hover:bg-white/[0.03] hover:text-white/80"
                            >
                                <Icon size={14} className="shrink-0" style={{ color }} />
                                <span>{label}</span>
                            </button>
                        ))}
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

export default UserMenu;
