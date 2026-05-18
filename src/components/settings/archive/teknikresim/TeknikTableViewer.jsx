import React, { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, Table2 } from 'lucide-react';
import { SheetBlock, SheetKVTable, SheetDataTable, SheetTagTable, ExcelSheet } from './SheetComponents';

export const _VA_SKIP = new Set(['image_type', 'genel_metin', 'icerik']);

export function _humanizeKey(key) {
    const known = {
        parca_tanim:'Parça Tanımı', geometrik:'Geometrik', malzeme_uretim:'Malzeme & Üretim',
        toleranslar:'Toleranslar', izlenebilirlik:'İzlenebilirlik', islemler:'İşlemler',
        notlar:'Notlar', parca_listesi:'Parça Listesi', olcular:'Ölçüler',
        kimlik_numarasi:'Kimlik No', parca_adi:'Parça Adı', parca_kodu:'Parça Kodu',
        cizim_numarasi:'Çizim No', sayfa_bilgisi:'Sayfa', acilim_uzunlugu:'Açılım Uzunluğu',
        boyutlar:'Boyutlar', bukme_yaricapi:'Bükme Yarıçapı', kenar_mesafeleri:'Kenar Mesafeleri',
        kesit:'Kesit', olcek:'Ölçek', malzeme:'Malzeme', agirlik:'Ağırlık',
        yuzey_standardi:'Yüzey Standardı', kesim_standardi:'Kesim Standardı',
        sayfa_formati:'Sayfa Formatı', talasli_tolerans:'Talaşlı Tolerans',
        talassiz_tolerans:'Talaşsız Tolerans', kaynakli_tolerans:'Kaynaklı Tolerans',
        dokum_tolerans:'Döküm Tolerans', cizim_tarihi:'Çizim Tarihi', cizen:'Çizen',
        onaylayan:'Onaylayan', kalite_kontrol:'Kalite Kontrol', cad_bilgisi:'CAD Bilgisi',
        baslik_bloku:'Başlık Bloğu', malzeme_no:'Malzeme No', malzeme_adi:'Malzeme Adı',
        sac_boyutu:'Sac Boyutu', kalinlik:'Kalınlık',
    };
    return known[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* ── Generic KV bölümü (bilinmeyen şemalar için) ─────────────────── */
export function GenericSection({ label, value }) {
    if (Array.isArray(value) && value.length > 0) {
        const first = value[0];
        if (typeof first === 'object' && first !== null) {
            const cols = Object.keys(first).map(k => ({ key: k, label: k, w: `${Math.floor(100 / Object.keys(first).length)}%` }));
            return (
                <SheetBlock title={label} color="blue">
                    <SheetDataTable cols={cols} rows={value} />
                </SheetBlock>
            );
        }
        return (
            <SheetBlock title={label} color="stone">
                <SheetTagTable items={value} />
            </SheetBlock>
        );
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const rows = Object.entries(value).filter(([, v]) => v).map(([k, v]) => [k, String(v)]);
        if (rows.length === 0) return null;
        return (
            <SheetBlock title={label} color="blue">
                <SheetKVTable rows={rows} />
            </SheetBlock>
        );
    }
    if (value && typeof value === 'string') {
        return (
            <SheetBlock title={label} color="stone">
                <p className="text-[12px] text-stone-600 leading-relaxed px-4 py-3">{value}</p>
            </SheetBlock>
        );
    }
    return null;
}

/* ── Analiz boş durum ────────────────────────────────────────────── */
export function EmptyAnalysisState({ status, va, visionError }) {
    const [cfg, setCfg] = useState(null);

    useEffect(() => {
        if (status === 'done' && !va) {
            fetch('/api/archive/check-vision-config')
                .then(r => r.json())
                .then(setCfg)
                .catch(() => {});
        }
    }, [status, va]);

    if (status === 'processing') return (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-[#378ADD]">
            <Loader2 size={30} strokeWidth={1.5} className="animate-spin" />
            <p className="text-[12px] font-semibold">Vision AI analiz ediyor…</p>
        </div>
    );

    if (status === 'failed') return (
        <div className="flex flex-col items-center gap-4 px-8 py-8">
            <AlertTriangle size={28} strokeWidth={1.5} className="text-red-400 shrink-0" />
            <div className="text-center">
                <p className="text-[12px] font-bold text-stone-700">Analiz başarısız</p>
                <p className="text-[11px] text-stone-400 mt-1">Dosya yapay zeka tarafından işlenemedi.</p>
            </div>
            {visionError && (
                <div className="w-full bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[11px]">
                    <p className="font-bold text-red-600 mb-1">Hata Detayı</p>
                    <p className="text-red-500 break-words">{visionError}</p>
                </div>
            )}
            <p className="text-[10px] text-stone-400 text-center">
                DWG/DXF dosyalarını PNG veya PDF olarak dışa aktarıp tekrar yükleyin, ardından "Analiz Et" butonuna basın.
            </p>
        </div>
    );

    if (status === 'done' && !va) {
        const dp = cfg?.doc_processing;
        const vf = cfg?.vision_fallback;
        return (
            <div className="flex flex-col items-center gap-4 px-8 py-8">
                <AlertTriangle size={28} strokeWidth={1.5} className="text-amber-400 shrink-0" />
                <div className="text-center">
                    <p className="text-[12px] font-bold text-stone-700">Vision analizi tamamlanamadı</p>
                    <p className="text-[11px] text-stone-400 mt-1">Görsel yapay zekaya gönderildi ancak yanıt alınamadı.</p>
                </div>

                {/* Gerçek hata mesajı varsa önce onu göster */}
                {visionError && (
                    <div className="w-full bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[11px]">
                        <p className="font-bold text-red-600 mb-1">API Hatası</p>
                        <p className="text-red-500 break-all font-mono">{visionError}</p>
                    </div>
                )}

                {cfg && (
                    <div className="w-full bg-stone-50 rounded-xl border border-stone-200 overflow-hidden text-[11px]">
                        <div className="px-4 py-2 border-b border-stone-200 text-[10px] font-black tracking-widest text-stone-400 uppercase">
                            Model Tanılaması
                        </div>
                        {[
                            { label: 'Teknik Döküman İşleme', info: dp },
                            { label: 'Vision Fallback', info: vf },
                        ].map(({ label, info }) => (
                            <div key={label} className="flex items-start gap-3 px-4 py-2.5 border-b border-stone-100 last:border-0">
                                <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${info?.found && info?.has_key && info?.model_id ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                <div className="min-w-0">
                                    <p className="font-semibold text-stone-600">{label}</p>
                                    {!info?.stored && <p className="text-stone-400">Ayarlanmamış</p>}
                                    {info?.stored && !info?.found && <p className="text-red-500">Model bulunamadı (ID geçersiz)</p>}
                                    {info?.found && !info?.has_key && <p className="text-red-500">API anahtarı eksik veya çözülemiyor</p>}
                                    {info?.found && info?.has_key && !info?.model_id && <p className="text-amber-500">Model adı boş (model_id alanı dolu değil)</p>}
                                    {info?.found && info?.has_key && info?.model_id && (
                                        <p className="text-emerald-600">{info.model_id} · {info.provider || 'gemini'}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <p className="text-[10px] text-stone-400 text-center">
                    Sorunu giderdikten sonra "Analiz Et" ile tekrar deneyin.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-stone-400">
            <Table2 size={32} strokeWidth={1} />
            <p className="text-[12px] font-medium">Henüz analiz edilmemiş — önce "Analiz Et" butonuna basın</p>
        </div>
    );
}

/* ── Teknik Resim tablo görünümü ─────────────────────────────────── */
export function TeknikTable({ va }) {
    const llmSkipped = va?.llm_skipped === true;

    const _hv = v => v != null && String(v).trim() !== '' && String(v).trim() !== '-' && String(v).trim() !== '—' && String(v).trim() !== 'null';

    /* Tüm JSON anahtarlarını dinamik olarak sekmelere dönüştür */
    const sections = [];
    if (va) {
        Object.entries(va).forEach(([key, val]) => {
            if (_VA_SKIP.has(key)) return;

            // Array → işlemler, parça listesi, ölçüler, vb.
            if (Array.isArray(val)) {
                const rows = val
                    .filter(i => i && (typeof i !== 'object' || Object.values(i).some(v => _hv(v))))
                    .map(i => {
                        if (typeof i === 'object') {
                            const islem = i.islem || i.ad || i.name || '';
                            const sira  = i.sira || i.order || '';
                            const acik  = i.aciklama || i.description || '';
                            if (islem) return [`${sira ? sira + '. ' : ''}${islem}`, acik];
                            // Genel object → tüm key-value'larını birleştir
                            return [
                                Object.keys(i).filter(k => _hv(i[k])).map(k => _humanizeKey(k)).join(' / ') || '—',
                                Object.values(i).filter(_hv).join(' — ') || '',
                            ];
                        }
                        return [String(i), ''];
                    });
                if (rows.length) sections.push({ key, title: _humanizeKey(key), type: 'kv', rows });
                return;
            }

            // Object → key-value tablosu
            if (val && typeof val === 'object') {
                const rows = Object.entries(val)
                    .filter(([, v]) => _hv(v))
                    .map(([k, v]) => [_humanizeKey(k), String(v)]);
                if (rows.length) sections.push({ key, title: _humanizeKey(key), type: 'kv', rows });
                return;
            }

            // Düz string — "Genel" bölümüne ekle
            if (_hv(val)) {
                const existing = sections.find(s => s.key === '_genel');
                if (existing) existing.rows.push([_humanizeKey(key), String(val)]);
                else sections.push({ key: '_genel', title: 'Genel', type: 'kv', rows: [[_humanizeKey(key), String(val)]] });
            }
        });
    }

    const [activeKey, setActiveKey] = useState(() => sections[0]?.key || '');
    const active = sections.find(s => s.key === activeKey) || sections[0];

    if (!sections.length) return (
        <div className="flex flex-col items-center justify-center h-32 gap-2 text-stone-400">
            <AlertTriangle size={20} strokeWidth={1.5} className="text-amber-300" />
            <p className="text-[12px]">AI çizimden veri çıkaramadı</p>
            <p className="text-[10px] text-stone-300">Çizimi göster butonuyla görüntüleyebilirsiniz</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* ── LLM atlandı uyarısı ── */}
            {llmSkipped && (
                <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-700">
                    <span className="font-bold">LLM'den devam edilmedi</span>
                    <span className="text-amber-500">— Yalnızca DXF metin entity'leri gösteriliyor. Detaylı analiz için LLM'i etkinleştirebilirsiniz.</span>
                </div>
            )}
            {/* ── Excel sekme çubuğu ── */}
            <div className="flex items-end gap-0 bg-[#f0f0f0] border-b border-stone-300 px-3 pt-2 overflow-x-auto shrink-0">
                {sections.map(s => (
                    <button
                        key={s.key}
                        onClick={() => setActiveKey(s.key)}
                        className={`flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-semibold whitespace-nowrap border border-b-0 rounded-t-md mr-0.5 transition-all ${
                            active?.key === s.key
                                ? 'bg-white border-stone-300 text-[#217346] shadow-sm -mb-px z-10 relative'
                                : 'bg-[#dce6d0] border-[#dce6d0] text-stone-500 hover:bg-[#c9d9ba] hover:text-stone-700'
                        }`}
                    >
                        {s.title}
                    </button>
                ))}
            </div>

            {/* ── Spreadsheet içeriği ── */}
            <div className="flex-1 overflow-auto min-h-0 bg-white">
                {active?.type === 'text' ? (
                    <div className="p-5 text-[12px] text-stone-700 leading-relaxed whitespace-pre-wrap">{active.text}</div>
                ) : (
                    <ExcelSheet rows={active?.rows} cols={active?.cols} />
                )}
            </div>
        </div>
    );
}
