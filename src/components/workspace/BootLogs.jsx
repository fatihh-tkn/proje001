import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBackendStatus } from '../../hooks/useBackendStatus';
import { CheckCircle2, Loader2 } from 'lucide-react';

export const BootLogs = () => {
    const { isOnline, stage, stages } = useBackendStatus();
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        if (isOnline) {
            // Sistem çalışır hale gelince hepsini completed yap ve 1.5ms sonra sök at
            setLogs(prevLogs => prevLogs.map(log => ({ ...log, status: 'completed' })));
            const timer = setTimeout(() => setLogs([]), 1500);
            return () => clearTimeout(timer);
        }

        const newLogId = Date.now();
        const currentText = stages[stage]?.text || `Sistem Adımı: ${stage + 1}`;
        
        setLogs(prevLogs => {
            // Önceki logları tamamlandı olarak işaretle
            let updated = prevLogs.map(log => ({ ...log, status: 'completed' }));
            
            // Eğer sistem aşırı birikirse "max 3 tane tamamlanmış" kuralına uymak için kırp
            const completedItems = updated.filter(l => l.status === 'completed');
            if (completedItems.length > 3) {
                const keepCompleted = completedItems.slice(0, 3);
                const keepLoading = updated.filter(l => l.status === 'loading');
                updated = [...keepLoading, ...keepCompleted].sort((a,b) => b.id - a.id);
            }

            // Yeni aktif logu hemen en tepeye ekle
            return [{ id: newLogId, text: currentText, status: 'loading' }, ...updated];
        });

    }, [stage, stages, isOnline]);

    // Hızlıca kaybolması için: tamamlanmış logları 1.5 saniye sonra listeden filtrelenmiş şekilde çıkar
    useEffect(() => {
        const completedLogs = logs.filter(l => l.status === 'completed');
        if (completedLogs.length > 0) {
            const timer = setTimeout(() => {
                setLogs(prevLogs => prevLogs.filter(l => l.status !== 'completed'));
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [logs]);

    if (logs.length === 0) return null;

    return (
        <div 
            className="absolute top-4 left-4 z-[9999] flex flex-col gap-2 pointer-events-auto overflow-y-auto overflow-x-hidden pr-2 pb-8 scroll-smooth
                       [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent 
                       [&::-webkit-scrollbar-thumb]:bg-slate-300/0 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300/80 
                       [&::-webkit-scrollbar-thumb]:rounded-full transition-colors duration-300"
            style={{ 
               maxHeight: '210px',  // Tam 3 kutucuuk alacak yükseklik
               maskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)',
               WebkitMaskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)' 
            }}
        >
            <AnimatePresence initial={false}>
                {logs.map((log) => (
                    <motion.div
                        key={log.id}
                        layout
                        initial={{ opacity: 0, x: -30, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -10, scale: 0.9, transition: { duration: 0.25 } }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className={`bg-white/80 backdrop-blur-md shadow-lg border rounded-[6px] p-3 w-[260px] flex items-center gap-3 relative overflow-hidden pointer-events-auto
                            ${log.status === 'completed' ? 'border-emerald-200/50' : 'border-[#8a1717]/20'}
                        `}
                    >
                        {log.status === 'loading' ? (
                            <Loader2 className="animate-spin text-[#8a1717] shrink-0" size={15} />
                        ) : (
                            <CheckCircle2 className="text-emerald-500 shrink-0" size={15} />
                        )}
                        <span className={`text-[11px] font-semibold tracking-wide truncate ${log.status === 'completed' ? 'text-slate-500' : 'text-slate-800'}`}>
                            {log.text}
                        </span>

                        {log.status === 'loading' && (
                            <div className="absolute bottom-0 left-0 h-[2px] w-full bg-slate-100">
                                <motion.div 
                                   className="h-full bg-[#8a1717]"
                                   initial={{ width: "0%" }}
                                   animate={{ width: "100%" }}
                                   transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                />
                            </div>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
