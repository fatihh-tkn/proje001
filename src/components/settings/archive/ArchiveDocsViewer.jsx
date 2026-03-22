import React, { useState, useEffect, useRef } from 'react';
import { PackageOpen, Folder, File, ChevronRight, Upload, Plus, Search, FileText } from 'lucide-react';
import ArchiveDetailPanel from './ArchiveDetailPanel';

export default function ArchiveDocsViewer() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDoc, setSelectedDoc] = useState(null);
    
    // Klasör oluşturma state
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const fileInputRef = useRef(null);

    const fetchArchive = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/archive/list');
            if (res.ok) {
                const data = await res.json();
                setItems(data.items || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchArchive();
    }, []);

    // Klasör Yolunu Çıkar
    const getFolderPath = (folderId) => {
        const path = [];
        let cur = items.find(i => i.id === folderId);
        while (cur) {
            path.unshift(cur);
            cur = items.find(i => i.id === cur.folder_id && i.file_type === 'folder');
        }
        return path;
    };

    const breadcrumbs = currentFolderId ? getFolderPath(currentFolderId) : [];

    const currentItems = items.filter(item => {
        if (searchQuery) {
            return item.filename.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return item.folder_id === currentFolderId;
    });

    const folders = currentItems.filter(i => i.file_type === 'folder');
    const documents = currentItems.filter(i => i.file_type !== 'folder');

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            const res = await fetch('/api/archive/create-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newFolderName, parent_id: currentFolderId })
            });
            if (res.ok) {
                fetchArchive();
                setIsCreatingFolder(false);
                setNewFolderName('');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleUploadClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        if (currentFolderId) formData.append('folder_id', currentFolderId);

        try {
            setLoading(true);
            const res = await fetch('/api/archive/direct-upload', {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                fetchArchive();
            }
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024, dm = 2, sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    return (
        <div className="flex bg-[#f4f5f7] h-full w-full font-sans overflow-hidden">
            {/* ── SOL ANA PANEL ── */}
            <div className={`flex flex-col flex-1 h-full shadow-sm bg-white transition-all duration-300 ${selectedDoc ? 'mr-[320px]' : ''}`}>
                
                {/* ── HEADER ── */}
                <div className="flex-none px-6 py-4 flex flex-col gap-3 justify-center border-b border-slate-200 bg-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-[16px] font-semibold text-slate-800 flex items-center gap-2">
                                <PackageOpen className="text-[#b91d2c]" size={20} />
                                Arşiv Yöneticisi
                            </h2>
                            <p className="text-[12px] text-slate-500 mt-1">Sisteme yüklenen ve arşivlenen tüm dosyalarınızı klasörler halinde yönetin.</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsCreatingFolder(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12px] font-medium rounded-md transition-colors"
                            >
                                <Plus size={14} /> Yeni Klasör
                            </button>
                            <button
                                onClick={handleUploadClick}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#A01B1B] hover:bg-[#8a1717] text-white text-[12px] font-medium rounded-md transition-colors"
                            >
                                <Upload size={14} /> Dosya Yükle
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                className="hidden" 
                            />
                        </div>
                    </div>

                    {/* BREADCRUMB & SEARCH */}
                    <div className="flex items-center justify-between mt-2 px-1">
                        <div className="flex items-center gap-1.5 text-[13px]">
                            <button 
                                onClick={() => setCurrentFolderId(null)}
                                className={`flex items-center gap-1 hover:text-[#A01B1B] transition-colors ${!currentFolderId && !searchQuery ? 'font-semibold text-slate-800' : 'text-slate-500'}`}
                            >
                                <Folder size={14} className={!currentFolderId && !searchQuery ? 'text-[#b91d2c]' : ''}/> Kök Dizini
                            </button>
                            {breadcrumbs.map(bc => (
                                <React.Fragment key={bc.id}>
                                    <ChevronRight size={14} className="text-slate-300" />
                                    <button 
                                        onClick={() => setCurrentFolderId(bc.id)}
                                        className={`hover:text-[#A01B1B] transition-colors ${currentFolderId === bc.id ? 'font-semibold text-slate-800' : 'text-slate-500'}`}
                                    >
                                        {bc.filename}
                                    </button>
                                </React.Fragment>
                            ))}
                            {searchQuery && (
                                <>
                                    <ChevronRight size={14} className="text-slate-300" />
                                    <span className="font-semibold text-slate-800 text-[12px]">Arama Sonuçları</span>
                                </>
                            )}
                        </div>
                        
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Arşivde ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-[12px] border border-slate-200 rounded-md w-60 focus:outline-none focus:border-[#A01B1B] focus:ring-1 focus:ring-[#A01B1B]/20 transition-all bg-slate-50"
                            />
                        </div>
                    </div>
                </div>

                {/* ── CONTENT AREA ── */}
                <div className="flex-1 overflow-y-auto px-6 py-4 bg-slate-50/50">
                    
                    {isCreatingFolder && (
                        <div className="flex gap-2 items-center mb-6 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                            <Folder size={20} className="text-[#A01B1B]/70" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Klasör Adı..."
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                                onKeyDown={e => {
                                    if(e.key === 'Enter') handleCreateFolder();
                                    if(e.key === 'Escape') setIsCreatingFolder(false);
                                }}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-[13px] outline-none focus:border-[#A01B1B]"
                            />
                            <button onClick={handleCreateFolder} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[12px] font-medium">Oluştur</button>
                            <button onClick={() => setIsCreatingFolder(false)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[12px] font-medium">İptal</button>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A01B1B]"></div>
                        </div>
                    ) : folders.length === 0 && documents.length === 0 && !isCreatingFolder ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <PackageOpen size={48} strokeWidth={1.5} className="mb-4 opacity-30" />
                            <h3 className="text-[14px] font-semibold text-slate-700 mb-1">Arşiviniz Boş</h3>
                            <p className="text-[12px] text-slate-500 max-w-sm text-center">Bu dizinde henüz hiçbir dosya veya klasör bulunmuyor.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {/* Klasörler */}
                            {folders.map(folder => (
                                <div 
                                    key={folder.id} 
                                    onClick={() => { setCurrentFolderId(folder.id); setSearchQuery(''); }}
                                    className="group flex flex-col p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-[#A01B1B]/30 cursor-pointer transition-all"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="p-2.5 bg-slate-50 rounded-lg group-hover:bg-[#A01B1B]/5 transition-colors">
                                            <Folder size={24} className="text-slate-400 group-hover:text-[#A01B1B] fill-slate-200" />
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <h4 className="text-[13px] font-semibold text-slate-800 truncate" title={folder.filename}>{folder.filename}</h4>
                                        <p className="text-[11px] text-slate-500 mt-0.5">Oluşturulma: {new Date(folder.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}

                            {/* Dosyalar */}
                            {documents.map(doc => (
                                <div 
                                    key={doc.id} 
                                    onClick={() => setSelectedDoc(doc)}
                                    className={`group flex flex-col p-4 bg-white border rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all ${selectedDoc?.id === doc.id ? 'border-[#A01B1B] ring-1 ring-[#A01B1B]/20' : 'border-slate-200 hover:border-[#A01B1B]/30'}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="p-2.5 bg-slate-50 rounded-lg group-hover:bg-slate-100 transition-colors">
                                            <FileText size={24} className={doc.is_vectorized ? "text-teal-600" : "text-blue-500"} />
                                        </div>
                                        {doc.is_vectorized && (
                                            <span className="bg-teal-50 text-teal-700 border border-teal-200/50 text-[9px] font-bold px-1.5 py-0.5 rounded leading-none">VEKTÖR</span>
                                        )}
                                    </div>
                                    <div className="mt-3">
                                        <h4 className="text-[13px] font-semibold text-slate-800 truncate" title={doc.filename}>{doc.filename}</h4>
                                        <div className="flex items-center text-[10px] text-slate-500 mt-1 gap-2">
                                            <span className="uppercase font-medium text-slate-400">{doc.file_type}</span>
                                            <span>•</span>
                                            <span>{formatBytes(doc.file_size)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <ArchiveDetailPanel selectedDoc={selectedDoc} onClose={() => setSelectedDoc(null)} />
        </div>
    );
}
