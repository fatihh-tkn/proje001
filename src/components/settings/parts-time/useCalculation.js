// src/components/settings/parts-time/useCalculation.js
// Sahte AI hesaplama akışı — gerçek API'ye bağlanırken bu hook fetch + SSE'ye dönüştürülmeli.
// fetch('/api/parts-time/calculate', { method: 'POST', body: JSON.stringify({ bomId, partIds }) })
// ve sonuçları SSE üzerinden dinleyerek log + parts state'i besler.

import { useCallback, useRef, useState } from 'react';
import {
    OPERATIONS, partTotalSec, fmtSecCompact,
    SAMPLE_BOM, SAMPLE_SUBASSEMBLIES, SAMPLE_NESTING_REFS,
} from './constants';

// Tweak çarpanlarını uygulayarak operasyon sürelerini ayarla
function buildCalculatedOps(part, tweaks) {
    const { laserSpeed = 1, bendSpeed = 1, weldSpeed = 1, overallMul = 1 } = tweaks || {};
    const out = {};
    Object.entries(part.ops).forEach(([id, sec]) => {
        let mul = 1;
        if (id === 'laser') mul = 1 / laserSpeed;
        else if (id === 'bend') mul = 1 / bendSpeed;
        else if (id === 'weld') mul = 1 / weldSpeed;
        let v = Math.round(sec * mul * overallMul);
        if (!part.drawingMatched) v = Math.round(v * 1.18); // çizim yoksa %18 belirsizlik payı
        out[id] = v;
    });
    return out;
}

export default function useCalculation({ parts, setParts, tweaks }) {
    const [calcStatus, setCalcStatus] = useState('idle'); // idle | running | done
    const [aiLog, setAiLog] = useState([]);
    const cancelRef = useRef(false);

    const reset = useCallback(() => {
        cancelRef.current = true;
        setAiLog([]);
        setCalcStatus('idle');
        setParts(prev => prev.map(p => ({ ...p, status: 'pending', calculatedOps: null })));
    }, [setParts]);

    const run = useCallback(async () => {
        cancelRef.current = false;
        setCalcStatus('running');
        setAiLog([]);

        const log = (entry) => setAiLog(prev => [...prev, entry]);
        const wait = (ms) => new Promise(r => setTimeout(r, ms));
        const safe = async (ms) => { await wait(ms); if (cancelRef.current) throw new Error('cancelled'); };

        try {
            // 1. BOM Analizi
            log({ type: 'header', text: 'BOM ANALİZİ' });
            await safe(300);
            log({ type: 'info', text: `Ürün okunuyor: ${SAMPLE_BOM.code} · ${SAMPLE_BOM.name}`, tag: SAMPLE_BOM.revision });
            await safe(400);
            log({ type: 'success', text: `${SAMPLE_SUBASSEMBLIES.length} alt-grup, ${parts.length} parça tespit edildi` });
            await safe(250);
            log({ type: 'success', text: `Sipariş: ${SAMPLE_BOM.orderQty} adet · ${SAMPLE_BOM.customer} · İE: ${SAMPLE_BOM.workOrder}` });
            await safe(300);

            // 2. Nesting & çizim eşleştirme
            log({ type: 'divider' });
            log({ type: 'header', text: 'NESTING & ÇİZİM EŞLEŞTİRME' });
            await safe(250);
            log({ type: 'info', text: `${SAMPLE_NESTING_REFS.length} nesting dosyası bağlandı (kalınlık bazında)` });
            await safe(200);
            for (const n of SAMPLE_NESTING_REFS) {
                log({ type: 'calc', text: n.filename, tag: `${n.sheets} levha` });
                await safe(120);
            }
            log({ type: 'info', text: 'Arşivde 1,248 çizim tarandı (vektör)' });
            await safe(350);
            const matched = parts.filter(p => p.drawingMatched).length;
            const unmatched = parts.length - matched;
            log({ type: 'success', text: `${matched} parça için çizim eşleşti` });
            await safe(200);
            if (unmatched > 0) {
                log({ type: 'warn', text: `${unmatched} parça için eşleşme yok — tahmin modeli devrede` });
                await safe(250);
            }

            // 3. Operasyon süreleri
            log({ type: 'divider' });
            log({ type: 'header', text: 'OPERASYON SÜRELERİ' });
            await safe(200);
            const lp = Math.round((tweaks.laserSpeed || 1) * 100);
            const bp = Math.round((tweaks.bendSpeed || 1) * 100);
            const wp = Math.round((tweaks.weldSpeed || 1) * 100);
            log({ type: 'info', text: 'Kalibrasyon: S355MC + DC04 + S275JR' });
            await safe(150);
            log({ type: 'info', text: `Lazer h.: ${lp}% · Abkant h.: ${bp}% · Kaynak h.: ${wp}%`, tag: 'tweaks' });
            await safe(200);

            for (let i = 0; i < parts.length; i++) {
                if (cancelRef.current) throw new Error('cancelled');
                const part = parts[i];
                setParts(prev => prev.map(p => p.id === part.id ? { ...p, status: 'calculating' } : p));

                const calc = buildCalculatedOps(part, tweaks);
                const total = partTotalSec(calc);
                const stepDelay = tweaks.aiMode === 'bulk' ? 60 : 240;

                log({ type: 'calc', text: `${part.id} · ${part.name}`, tag: `${part.thick}mm` });
                await safe(stepDelay);
                log({ type: 'result', text: `   ${fmtSecCompact(total)} / parça · ×${part.qty} adet = ${fmtSecCompact(total * part.qty)}` });

                setParts(prev => prev.map(p =>
                    p.id === part.id
                        ? { ...p, status: 'done', calculatedOps: calc, ops: calc }
                        : p
                ));
                await safe(Math.round(stepDelay * 0.8));
            }

            // 4. Özet
            log({ type: 'divider' });
            log({ type: 'header', text: 'ÖZET' });
            await safe(200);
            log({ type: 'success', text: 'Tüm parçalar için hesaplama tamamlandı' });
            log({ type: 'info', text: 'Sonuçları onaylayın veya elle düzenleyin', tag: '✓' });

            setCalcStatus('done');
        } catch (err) {
            if (err.message !== 'cancelled') {
                console.error('[useCalculation] error:', err);
                log({ type: 'warn', text: `HATA: ${err.message}` });
            }
            setCalcStatus(prev => prev === 'running' ? 'idle' : prev);
        }
    }, [parts, setParts, tweaks]);

    return { calcStatus, aiLog, run, reset };
}
