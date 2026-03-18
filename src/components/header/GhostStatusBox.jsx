import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

import { useBackendStatus } from '../../hooks/useBackendStatus';

// Backend canlı durumunu kontrol eden gelişmiş hayalet durum kutusu
export const GhostStatusBox = () => {
    const { isOnline, progress, stage, stages } = useBackendStatus();

    const currentText = isOnline ? "Sistem Aktif ve Çalışıyor" : (stages[stage]?.text || "Bekleniyor...");

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 px-3 py-1.5 bg-slate-100/30 hover:bg-slate-100/50 backdrop-blur-sm border border-slate-200/50 rounded-md transition-all duration-300 select-none group cursor-default"
        >
            <div className="flex items-center justify-center w-4 h-4">
                {isOnline ? (
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                ) : (
                    <div className="flex gap-1">
                        <motion.div
                            animate={{ height: ["4px", "12px", "4px"] }}
                            transition={{ repeat: Infinity, duration: 1, ease: "easeInOut", delay: 0 }}
                            className="w-0.5 bg-slate-400 rounded-full"
                        />
                        <motion.div
                            animate={{ height: ["4px", "12px", "4px"] }}
                            transition={{ repeat: Infinity, duration: 1, ease: "easeInOut", delay: 0.15 }}
                            className="w-0.5 bg-slate-400 rounded-full"
                        />
                        <motion.div
                            animate={{ height: ["4px", "12px", "4px"] }}
                            transition={{ repeat: Infinity, duration: 1, ease: "easeInOut", delay: 0.3 }}
                            className="w-0.5 bg-slate-400 rounded-full"
                        />
                    </div>
                )}
            </div>

            <div className="flex flex-col">
                <span className={`text-[10px] font-medium tracking-wide transition-colors duration-300 ${isOnline ? 'text-emerald-700/80' : 'text-slate-600/80 group-hover:text-slate-800/80'}`}>
                    {currentText}
                </span>

                {!isOnline && (
                    <div className="w-full h-0.5 bg-slate-200/60 rounded-full mt-1 overflow-hidden">
                        <motion.div
                            className="h-full bg-slate-400/60 rounded-full"
                            animate={{ width: `${progress}%` }}
                            transition={{ ease: "linear", duration: 0.3 }}
                        />
                    </div>
                )}
            </div>

            {!isOnline && (
                <span className="text-[9px] font-mono font-bold text-slate-400 w-8 text-right">
                    %{Math.floor(progress)}
                </span>
            )}
        </motion.div>
    );
};
