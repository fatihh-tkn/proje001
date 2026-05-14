import {
    BarChart2, Wrench, Mic, Layers, FileText, Package, Calendar, Mail,
    GitBranch, Truck, ClipboardCheck, FilePlus, TrendingUp, Clock,
    Receipt, BookOpen, Users, Search, Activity, Briefcase,
} from 'lucide-react';

export const ALL_SUGGESTIONS = [
    { id: 'raporlar',     icon: BarChart2,      label: 'Raporlar',      text: 'Hangi raporlara erişebilirim?' },
    { id: 'hata_cozumu',  icon: Wrench,         label: 'Hata Çözümü',   text: 'Bir hata mesajını çözmeme yardım eder misin?' },
    { id: 'toplanti',     icon: Mic,            label: 'Toplantı',      text: 'Toplantı özetini oluşturabilir misin?' },
    { id: 'sap',          icon: Layers,         label: 'SAP',           text: 'SAP sisteminde nasıl işlem yapabilirim?' },
    { id: 'teknik_resim', icon: FileText,       label: 'Teknik Resim',  text: 'Teknik resim arşivinde nasıl arama yapabilirim?' },
    { id: 'stok',         icon: Package,        label: 'Stok',          text: 'Malzeme stok durumunu nasıl sorgulayabilirim?' },
    { id: 'planlama',     icon: Calendar,       label: 'Planlama',      text: 'Üretim planını görmek istiyorum.' },
    { id: 'bildirimler',  icon: Mail,           label: 'Bildirimler',   text: 'Bekleyen onaylarımı göster.' },
    { id: 'surec',        icon: GitBranch,      label: 'Süreç',         text: 'Onay sürecini nasıl başlatırım?' },
    { id: 'tedarik',      icon: Truck,          label: 'Tedarik',       text: 'Tedarikçi bilgilerini nasıl bulabilirim?' },
    { id: 'kalite',       icon: ClipboardCheck, label: 'Kalite',        text: 'Kalite kontrol formunu doldurabilir misin?' },
    { id: 'belge',        icon: FilePlus,       label: 'Belge',         text: 'Yeni bir belge şablonu oluşturabilir misin?' },
    { id: 'performans',   icon: TrendingUp,     label: 'Performans',    text: 'Bu ayki üretim KPIlarını göster.' },
    { id: 'vardiya',      icon: Clock,          label: 'Vardiya',       text: 'Vardiya çizelgemi nasıl görebilirim?' },
    { id: 'fatura',       icon: Receipt,        label: 'Fatura',        text: 'Bekleyen faturalarımı listele.' },
    { id: 'egitim',       icon: BookOpen,       label: 'Eğitim',        text: 'SAP eğitim materyallerine nasıl ulaşabilirim?' },
    { id: 'ekip',         icon: Users,          label: 'Ekip',          text: 'Departman organizasyon şemasını gösterebilir misin?' },
    { id: 'arsiv',        icon: Search,         label: 'Arşiv',         text: 'Geçen ay yüklenen belgeleri bul.' },
    { id: 'analiz',       icon: Activity,       label: 'Analiz',        text: 'Hata trendlerini analiz edebilir misin?' },
    { id: 'proje',        icon: Briefcase,      label: 'Proje',         text: 'Aktif proje listemi göster.' },
];

const LS_KEY = 'suggestion_disabled_ids';

export const getDisabledIds = () => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
};

export const setDisabledIds = (ids) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(ids)); } catch {}
};

export const pickSuggestions = (sessionId) => {
    const disabled = new Set(getDisabledIds());
    const pool = ALL_SUGGESTIONS.filter(s => !disabled.has(s.id));
    if (pool.length === 0) return ALL_SUGGESTIONS.slice(0, 4);
    let n = parseInt((sessionId || '').replace(/\D/g, '').slice(-8) || '1', 10);
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
        n = Math.imul(n, 1664525) + 1013904223 | 0;
        const j = Math.abs(n) % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 4);
};
