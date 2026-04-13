import { useState, useEffect } from 'react';

// ── Modül düzeyinde global state ─────────────────────────────────────────────
// Tek polling döngüsü garantisi + tüm bileşenler aynı state'i okur.
let g_isOnline    = false;
let g_isBackendUp = false;
let g_progress    = 0;
let g_stage       = 0;
let g_loopsStarted = false;
let g_pingInterval = null;
let g_progInterval = null;
const g_listeners = new Set();

const STAGES = [
    { text: "Sistem Başlatılıyor...",              threshold: 0  },
    { text: "Core Modüller Yükleniyor...",         threshold: 25 },
    { text: "CUDA ve Donanım Taraması...",          threshold: 50 },
    { text: "Yapay Zeka Modeli Belleğe Alınıyor...", threshold: 75 },
];

const notifyListeners = () => g_listeners.forEach(fn => fn());

// ── Sağlık kontrolü — hafif /api/health endpoint ─────────────────────────────
const pingBackend = async () => {
    try {
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), 1500);
        const res = await fetch('/api/health', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
            if (!g_isBackendUp) {
                g_isBackendUp = true;
                notifyListeners();
            }
            return true;
        }
    } catch (_) { /* backend henüz hazır değil */ }

    if (g_isBackendUp) {
        g_isBackendUp = false;
        g_isOnline    = false;
        g_progress    = 0;
        g_stage       = 0;
        notifyListeners();
    }
    return false;
};

// ── Monitoring döngüsünü başlat ───────────────────────────────────────────────
const initBackendMonitoring = () => {
    if (g_loopsStarted) return;
    g_loopsStarted = true;

    // İlk ping hemen
    pingBackend();

    // Ping: backend hazır olana kadar her 2 saniyede
    g_pingInterval = setInterval(() => {
        if (g_isOnline) { clearInterval(g_pingInterval); return; }
        if (!g_isBackendUp) pingBackend();
    }, 2000);

    // Progress: her 100ms'de bir güncelle
    g_progInterval = setInterval(() => {
        if (g_isOnline) { clearInterval(g_progInterval); return; }

        const oldProgress = g_progress;

        if (g_isBackendUp) {
            // Backend hazır → hızlı doldur (100ms'de 12 birim = ~900ms'de tamamlanır)
            g_progress += 12;
            if (g_progress >= 100) {
                g_progress = 100;
                g_isOnline = true;
                notifyListeners();
                clearInterval(g_progInterval);
                clearInterval(g_pingInterval);
                return;
            }
        } else {
            // Backend henüz cevap vermedi → yavaş ama görünür crawl
            // Ortalama 2-3 birim/100ms → stage 1'e ~1 saniyede ulaşır, canlı görünür
            g_progress = Math.min(24, g_progress + (Math.random() * 3 + 2));
        }

        // Stage hesapla
        let newStage = 0;
        for (let i = STAGES.length - 1; i >= 0; i--) {
            if (g_progress >= STAGES[i].threshold) { newStage = i; break; }
        }

        if (g_stage !== newStage || (g_progress >= 100 && oldProgress < 100)) {
            g_stage = newStage;
            notifyListeners();
        }
    }, 100);
};

// ── Reset — çıkış yapıldığında çağrılır ──────────────────────────────────────
export const resetBackendMonitoring = () => {
    clearInterval(g_pingInterval);
    clearInterval(g_progInterval);
    g_isOnline     = false;
    g_isBackendUp  = false;
    g_progress     = 0;
    g_stage        = 0;
    g_loopsStarted = false;
    g_pingInterval = null;
    g_progInterval = null;
    notifyListeners();
    // Kısa gecikme sonrası yeniden başlat (yeni giriş için)
    setTimeout(initBackendMonitoring, 50);
};

// ── Hook ─────────────────────────────────────────────────────────────────────
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
        stage:    g_stage,
        stages:   STAGES,
    };
};
