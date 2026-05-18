import { useErrorStore } from '../../../../store/errorStore';

export const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tiff']);
export const isImage = t => IMAGE_EXTS.has((t || '').toLowerCase());

/* ── Belge işleme ilerlemesini SSE üzerinden toast'a yansıt ─────────── */
export function subscribeToDocProgress(docId, filename, onDone) {
    const { addToast, updateToast, replaceToast } = useErrorStore.getState();

    const short = filename.length > 28 ? filename.slice(0, 25) + '…' : filename;

    const toastId = addToast({
        type: 'loading',
        message: `${short} — işleme alındı`,
        duration: 0,
        skipDedupe: true,
    });

    const es = new EventSource(`/api/archive/progress/${docId}`);

    es.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data.done) {
                es.close();
                replaceToast(toastId, { type: 'success', message: `${short} — ${data.step}`, duration: 5000 });
                if (onDone) onDone();
            } else if (data.error) {
                es.close();
                replaceToast(toastId, { type: 'error', message: `${short} — ${data.step}`, duration: 7000 });
                if (onDone) onDone();
            } else {
                updateToast(toastId, { message: `${short} — ${data.step}` });
            }
        } catch {}
    };

    es.onerror = () => es.close();
}

export function fmtSize(b) {
    if (!b) return null;
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export function fmtDate(s) {
    return new Date(s).toLocaleDateString('tr', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── Nesting ID listesi (string veya array uyumlu) ──────────────── */
export function getNestingIds(bagli) {
    const n = (bagli || {}).nesting;
    if (!n) return [];
    return Array.isArray(n) ? n : [n];
}

/* ── Kimlik no çıkarıcı ──────────────────────────────────────────── */
const _SAP_RE = /\b(\d{7,10})\b/;

export function extractNumFromFilename(filename) {
    if (!filename) return '';
    const stem = filename.replace(/\.[^.]+$/, '');
    // Ayırıcılar arasındaki parçalara böl: - . , space _ /
    const parts = stem.split(/[-.,\s_/]+/);
    for (const p of parts) {
        const clean = p.replace(/\./g, ''); // Avrupa noktalı: 92.530.740
        if (/^\d{7,10}$/.test(clean)) return clean;
    }
    return '';
}

export function getKimlikNo(va, filename) {
    if (va) {
        const bb = va.baslik_bloku || {};
        // 1. Klasik alan adları
        if (bb.kimlik_numarasi) return bb.kimlik_numarasi;
        if (bb.cizim_numarasi)  return bb.cizim_numarasi;
        // 2. Nesting üst seviye
        if (va.malzeme_numarasi) return va.malzeme_numarasi;
        // 3. baslik_bloku'daki tüm değerlerde SAP şekilli sayı ara
        for (const v of Object.values(bb)) {
            if (!v) continue;
            const m = _SAP_RE.exec(String(v));
            if (m) return m[1];
        }
        // 4. parca_listesi parca_kodu
        for (const p of va.parca_listesi || []) {
            if (!p || typeof p !== 'object') continue;
            for (const fld of ['parca_kodu', 'kimlik_numarasi', 'malzeme_no']) {
                if (p[fld]) {
                    const m = _SAP_RE.exec(String(p[fld]));
                    if (m) return m[1];
                }
            }
        }
    }
    // 5. Dosya adından çıkar
    return extractNumFromFilename(filename);
}
