import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, AlertCircle, Table, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const ExcelViewer = ({ url, title }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Pagination Stateleri
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 100; // Sayfa başına gösterilecek satır sayısı

    useEffect(() => {
        const fetchAndParseExcel = async () => {
            try {
                setLoading(true);
                // 1. URL'den Blob'u al
                const response = await fetch(url);
                const blob = await response.blob();

                // 2. FormData oluştur
                const formData = new FormData();
                formData.append('file', blob, title || 'data.xlsx');

                // 3. FastAPI Backend üzerinden veriyi işle
                const apiResponse = await fetch('http://localhost:8000/api/files/parse', {
                    method: 'POST',
                    body: formData,
                });

                if (!apiResponse.ok) {
                    throw new Error(`Backend hatası: ${apiResponse.status}`);
                }

                const result = await apiResponse.json();

                if (!result.success) {
                    throw new Error(result.message || result.error || "Excel çözümlenemedi.");
                }

                setData(result);
                setCurrentPage(1); // Sayfa sayacını sıfırla
            } catch (err) {
                console.error("Excel ayrıştırma hatası:", err);
                setError(err.message || "Excel dosyası işlenirken ağ hatası oluştu. Backend çalışmıyor olabilir.");
            } finally {
                setLoading(false);
            }
        };

        if (url) {
            fetchAndParseExcel();
        }
    }, [url, title]);

    // Toplam sayfa hesaplama ve kesilmiş (paginated) veriyi üretme (Sadece aktif sayfayı hesaplar, DOM'u yormaz)
    const { paginatedData, totalPages, totalRows, columns } = useMemo(() => {
        if (!data || !data.data || data.data.length === 0) {
            return { paginatedData: [], totalPages: 0, totalRows: 0, columns: [] };
        }

        const total = data.data.length;
        const cols = data.columns || Object.keys(data.data[0] || {});
        const pages = Math.ceil(total / rowsPerPage);

        const startIndex = (currentPage - 1) * rowsPerPage;
        const pData = data.data.slice(startIndex, startIndex + rowsPerPage);

        return { paginatedData: pData, totalPages: pages, totalRows: total, columns: cols };
    }, [data, currentPage, rowsPerPage]);


    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center w-full h-full p-10 bg-white">
                <Loader2 size={32} className="animate-spin text-green-600 mb-4" />
                <h3 className="text-lg font-medium text-slate-800">Yapay Zeka Motoru Excel'i Okuyor...</h3>
                <p className="text-sm text-slate-500 mt-2">Bu işlem verinin büyüklüğüne göre arka planda işlenmektedir.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center w-full h-full p-10 bg-white">
                <AlertCircle size={48} className="text-red-500 mb-4" />
                <h3 className="text-lg font-bold text-slate-800">Excel Okuma Hatası</h3>
                <p className="text-sm text-slate-500 mt-2">{error}</p>
            </div>
        );
    }

    if (totalRows === 0) {
        return (
            <div className="flex flex-col items-center justify-center w-full h-full p-10 bg-white">
                <Table size={48} className="text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-800">Boş Dosya veya Kayıt Yok</h3>
                <p className="text-sm text-slate-500 mt-2">Bu Excel dosyasının içinde geçerli bir tablo bulunamadı.</p>
            </div>
        );
    }

    // Sayfa geçiş butonları fonksiyonları
    const handleNext = () => setCurrentPage(p => Math.min(p + 1, totalPages));
    const handlePrev = () => setCurrentPage(p => Math.max(p - 1, 1));
    const handleFirst = () => setCurrentPage(1);
    const handleLast = () => setCurrentPage(totalPages);

    return (
        <div className="w-full h-full flex flex-col bg-white overflow-hidden relative">
            {/* ÜST BİLGİ ALANI */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0 bg-slate-50 shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 border border-green-200 text-green-700 rounded-lg">
                        <Table size={20} />
                    </div>
                    <div>
                        <h3 className="text-[15px] font-bold text-slate-800 truncate max-w-sm">{title}</h3>
                        <p className="text-[12px] text-slate-500 mt-0.5">{totalRows.toLocaleString()} Satır Analiz Edildi</p>
                    </div>
                </div>

                {/* SAĞ ÜST MİNİ SAYFALAMA DURUMU */}
                <div className="text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 border border-slate-200 rounded-full shadow-sm">
                    Sayfa {currentPage} / {totalPages}
                </div>
            </div>

            {/* TABLO ALANI (KAYDIRILABİLİR) */}
            <div className="flex-1 overflow-auto bg-white p-6 relative [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full">
                <table className="w-full text-left border-collapse text-sm">
                    <thead className="sticky top-[-24px] z-10 shadow-sm">
                        <tr className="bg-slate-100">
                            <th className="py-3 px-4 text-slate-400 font-semibold w-12 text-center border-b-2 border-slate-200">#</th>
                            {columns.map((col, idx) => (
                                <th key={idx} className="py-3 px-4 text-slate-700 font-semibold whitespace-nowrap border-b-2 border-slate-200">
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map((row, r_idx) => {
                            const absoluteIndex = (currentPage - 1) * rowsPerPage + r_idx + 1;
                            return (
                                <tr key={r_idx} className="border-b border-slate-100/70 hover:bg-slate-50/80 transition-colors">
                                    <td className="py-2.5 px-4 text-slate-400 text-center text-xs font-medium border-r border-slate-100 bg-slate-50/30">
                                        {absoluteIndex}
                                    </td>
                                    {columns.map((col, c_idx) => (
                                        <td key={c_idx} className="py-2.5 px-4 text-slate-600 whitespace-nowrap group relative">
                                            {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-300">-</span>}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ALT SAYFALAMA KONTROLLERİ */}
            <div className="shrink-0 flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50">
                <div className="text-xs text-slate-500">
                    Toplam <span className="font-semibold text-slate-700">{totalRows.toLocaleString()}</span> kayıttan
                    <span className="font-semibold text-slate-700"> {Math.max(1, (currentPage - 1) * rowsPerPage + 1)} - {Math.min(currentPage * rowsPerPage, totalRows)}</span> arası gösteriliyor.
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={handleFirst}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                        title="İlk Sayfa"
                    >
                        <ChevronsLeft size={16} />
                    </button>
                    <button
                        onClick={handlePrev}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                        title="Önceki Sayfa"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    <div className="text-xs font-medium bg-white px-3 py-1 border border-slate-200 rounded text-slate-700 shadow-sm mx-2">
                        {currentPage}
                    </div>

                    <button
                        onClick={handleNext}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                        title="Sonraki Sayfa"
                    >
                        <ChevronRight size={16} />
                    </button>
                    <button
                        onClick={handleLast}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                        title="Son Sayfa"
                    >
                        <ChevronsRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExcelViewer;
