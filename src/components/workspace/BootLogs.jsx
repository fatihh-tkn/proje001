import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBackendStatus } from '../../hooks/useBackendStatus';
import { CheckCircle2, Loader2 } from 'lucide-react';

export const BootLogs = () => {
    const { isOnline, stage, stages, progress } = useBackendStatus();
    const [logs, setLogs] = useState([]);

    // Stage değişince yeni log ekle
    useEffect(() => {
        if (isOnline) return; // isOnline effect ayrıca halleder

        const currentText = stages[stage]?.text || `Sistem Adımı: ${stage + 1}`;

        setLogs(prevLogs => {
            // StrictMode çift-render koruması: aynı stage zaten yükleniyorsa ekleme
            if (prevLogs.length > 0 && prevLogs[0].text === currentText && prevLogs[0].status === 'loading') {
                return prevLogs;
            }

            // Önceki tüm logları tamamlandı olarak işaretle
            const updated = prevLogs.map(log => ({ ...log, status: 'completed' }));

            return [
                { id: Date.now(), text: currentText, status: 'loading' },
                ...updated,
            ];
        });
    }, [stage, isOnline, stages]);

    // Sistem hazır olunca hepsini completed yap, 1200ms'de temizle
    useEffect(() => {
        if (!isOnline) return;

        setLogs(prevLogs => prevLogs.map(log => ({ ...log, status: 'completed' })));
        const timer = setTimeout(() => setLogs([]), 1200);
        return () => clearTimeout(timer);
    }, [isOnline]);

    // Tamamlanan logları 1200ms bekledikten sonra listeden çıkar
    useEffect(() => {
        const completedLogs = logs.filter(l => l.status === 'completed');
        if (completedLogs.length === 0 || isOnline) return; // isOnline kendi timer'ını yönetir

        const timer = setTimeout(() => {
            setLogs(prevLogs => prevLogs.filter(l => l.status !== 'completed'));
        }, 1200);
        return () => clearTimeout(timer);
    }, [logs, isOnline]);

    if (logs.length === 0) return null;

    // Aktif stage içindeki progress'i 0-100 arasına map et (loading bar için)
    const stageStart  = stage * 25;
    const barProgress = Math.min(100, Math.max(0, ((progress - stageStart) / 25) * 100));

    return (
        <div
            className="absolute top-4 left-4 z-[9999] flex flex-col gap-2 pointer-events-none overflow-hidden pr-2 pb-8"
            style={{
                maxHeight: '210px',
                maskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)',
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
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className={`bg-white/80 backdrop-blur-md shadow-lg border rounded-[6px] p-3 w-[260px] flex items-center gap-3 relative overflow-hidden
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

                        {/* Yükleme çubuğu — gerçek stage progress'i yansıtır */}
                        {log.status === 'loading' && (
                            <div className="absolute bottom-0 left-0 h-[2px] w-full bg-slate-100">
                                <motion.div
                                    className="h-full bg-[#8a1717]"
                                    animate={{ width: `${barProgress}%` }}
                                    transition={{ duration: 0.2, ease: 'linear' }}
                                />
                            </div>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
