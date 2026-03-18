import { useState, useEffect } from 'react';

let g_isOnline = false;
let g_isBackendUp = false;
let g_progress = 0;
let g_stage = 0;
const g_listeners = new Set();
let g_loopsStarted = false;

const STAGES = [
    { text: "Sistem Başlatılıyor...", threshold: 0 },
    { text: "Core Modüller Yükleniyor...", threshold: 25 },
    { text: "CUDA ve Donanım Taraması...", threshold: 50 },
    { text: "Yapay Zeka Modeli Belleğe Alınıyor...", threshold: 75 }
];

const notifyListeners = () => g_listeners.forEach(fn => fn());

const pingBackend = async () => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        const res = await fetch('/api/monitor/logs?limit=1', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
            g_isBackendUp = true;
            if (g_progress >= 100) g_isOnline = true;
            notifyListeners();
            return true;
        }
    } catch (err) { }

    if (g_isBackendUp) {
        g_isBackendUp = false;
        g_isOnline = false;
        g_progress = 0;
    }
    return false;
};

const initBackendMonitoring = () => {
    if (g_loopsStarted) return;
    g_loopsStarted = true;

    pingBackend();

    setInterval(() => {
        if (!g_isBackendUp) pingBackend();
    }, 3000);

    setInterval(() => {
        if (g_isOnline) return;

        if (g_isBackendUp) {
            g_progress += 12;
            if (g_progress >= 100) {
                g_progress = 100;
                g_isOnline = true;
                notifyListeners();
                return;
            }
        } else {
            g_progress = Math.min(99, g_progress + (Math.random() * 0.5 + 0.1));
        }

        let newStage = 0;
        for (let i = STAGES.length - 1; i >= 0; i--) {
            if (g_progress >= STAGES[i].threshold) {
                newStage = i;
                break;
            }
        }

        if (g_stage !== newStage || g_progress <= 100) {
            g_stage = newStage;
            notifyListeners();
        }
    }, 100);
};

export const useBackendStatus = () => {
    const [, forceRender] = useState(0);

    useEffect(() => {
        initBackendMonitoring();
        const update = () => forceRender(x => x + 1);
        g_listeners.add(update);
        return () => g_listeners.delete(update);
    }, []);

    return {
        isOnline: g_isOnline,
        progress: g_progress,
        stage: g_stage,
        stages: STAGES
    };
};
