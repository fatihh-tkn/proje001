import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Folder, ChevronRight, ChevronDown
} from 'lucide-react';
import { FileCard } from '../ui/file-card-collections';

/* ── FileCard'ı sidebar boyutuna küçülten wrapper ── */
const SidebarFileIcon = ({ ext = 'file' }) => (
    <div style={{ width: 24, height: 28, flexShrink: 0, position: 'relative', overflow: 'visible' }}>
        <div style={{
            position: 'absolute', top: 0, left: 0,
            transform: 'scale(0.44)',
            transformOrigin: 'top left',
            pointerEvents: 'none',
        }}>
            <FileCard formatFile={ext || 'file'} />
        </div>
    </div>
);

const listVariants = {
    hidden: { height: 0, opacity: 0 },
    show: {
        height: "auto", opacity: 1,
        transition: { height: { duration: 0.3, ease: "easeOut" }, staggerChildren: 0.03, delayChildren: 0.02 }
    },
    exit: {
        height: 0, opacity: 0,
        transition: { height: { duration: 0.2, ease: "easeIn" } }
    }
};

const itemVariants = {
    hidden: { opacity: 0, x: -6 },
    show: { opacity: 1, x: 0, transition: { duration: 0.2, ease: "easeOut" } },
    exit: { opacity: 0, x: -6, transition: { duration: 0.1 } }
};

const EXT_STYLE_MAP = {
    pdf:  { border: 'border-l-red-400',    text: 'text-red-300',    mark: 'bg-red-400/30 text-red-200',    arrow: 'text-red-400'    },
    bpmn: { border: 'border-l-teal-400',   text: 'text-teal-300',   mark: 'bg-teal-400/30 text-teal-200',  arrow: 'text-teal-400'   },
    xls:  { border: 'border-l-green-400',  text: 'text-green-300',  mark: 'bg-green-400/30 text-green-200',arrow: 'text-green-400'  },
    xlsx: { border: 'border-l-green-400',  text: 'text-green-300',  mark: 'bg-green-400/30 text-green-200',arrow: 'text-green-400'  },
    csv:  { border: 'border-l-emerald-400',text: 'text-emerald-300',mark: 'bg-emerald-400/30 text-emerald-200',arrow: 'text-emerald-400'},
    doc:  { border: 'border-l-blue-400',   text: 'text-blue-300',   mark: 'bg-blue-400/30 text-blue-200',  arrow: 'text-blue-400'   },
    docx: { border: 'border-l-blue-400',   text: 'text-blue-300',   mark: 'bg-blue-400/30 text-blue-200',  arrow: 'text-blue-400'   },
    txt:  { border: 'border-l-slate-400',  text: 'text-slate-300',  mark: 'bg-slate-400/30 text-slate-200',arrow: 'text-slate-400'  },
    md:   { border: 'border-l-slate-400',  text: 'text-slate-300',  mark: 'bg-slate-400/30 text-slate-200',arrow: 'text-slate-400'  },
    ppt:  { border: 'border-l-orange-400', text: 'text-orange-300', mark: 'bg-orange-400/30 text-orange-200',arrow:'text-orange-400'},
    pptx: { border: 'border-l-orange-400', text: 'text-orange-300', mark: 'bg-orange-400/30 text-orange-200',arrow:'text-orange-400'},
    png:  { border: 'border-l-violet-400', text: 'text-violet-300', mark: 'bg-violet-400/30 text-violet-200',arrow:'text-violet-400'},
    jpg:  { border: 'border-l-violet-400', text: 'text-violet-300', mark: 'bg-violet-400/30 text-violet-200',arrow:'text-violet-400'},
    jpeg: { border: 'border-l-violet-400', text: 'text-violet-300', mark: 'bg-violet-400/30 text-violet-200',arrow:'text-violet-400'},
    mp3:  { border: 'border-l-amber-400',  text: 'text-amber-300',  mark: 'bg-amber-400/30 text-amber-200',arrow: 'text-amber-400' },
    wav:  { border: 'border-l-amber-400',  text: 'text-amber-300',  mark: 'bg-amber-400/30 text-amber-200',arrow: 'text-amber-400' },
    mp4:  { border: 'border-l-pink-400',   text: 'text-pink-300',   mark: 'bg-pink-400/30 text-pink-200',  arrow: 'text-pink-400'   },
    mov:  { border: 'border-l-pink-400',   text: 'text-pink-300',   mark: 'bg-pink-400/30 text-pink-200',  arrow: 'text-pink-400'   },
};
const _defaultExtStyle = { border: 'border-l-amber-400', text: 'text-amber-200', mark: 'bg-amber-400/30 text-amber-200', arrow: 'text-amber-400' };

const getExtStyle = (ext) => {
    const s = EXT_STYLE_MAP[(ext || '').toLowerCase()] || _defaultExtStyle;
    return {
        bgColor:    `bg-white/5 border border-transparent border-l ${s.border} ml-1 rounded-[2px] pr-2`,
        textColor:  `${s.text} font-medium`,
        markClass:  `${s.mark} rounded-[2px] px-px not-italic`,
        arrowClass: `${s.arrow} shrink-0`,
    };
};

const highlightText = (text, query, markClass) => {
    if (!query) return text;
    const idx = text.toLocaleLowerCase('tr-TR').indexOf(query.toLocaleLowerCase('tr-TR'));
    if (idx === -1) return text;
    return (
        <>
            {text.slice(0, idx)}
            <mark className={markClass}>{text.slice(idx, idx + query.length)}</mark>
            {text.slice(idx + query.length)}
        </>
    );
};

const TreeNode = ({ node, level, openFolders, toggleFolder, activeFile, setActiveFile, isCollapsed, setIsCollapsed, setOpenFolders, onOpenFile, tabs, searchQuery = '', matchedFileIds = new Set(), matchedFolderIds = new Set() }) => {
    const isOpen = !!openFolders[node.id];
    const isAktif = activeFile === node.id;
    const isOpenedInTab = tabs?.some(t => t.id === node.id);
    const paddingLeft = level * 16;
    const isSearchActive = !!searchQuery.trim();

    // 1. EĞER BU BİR KLASÖR İSE:
    if (node.type === 'folder') {
        if (isCollapsed) return null;
        // Arama aktifken bu klasör eşleşen dosya içermiyorsa gizle
        return (
            <div className="flex flex-col w-full">
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isCollapsed) {
                            setIsCollapsed(false);
                            setOpenFolders(prev => ({ ...prev, [node.id]: true }));
                        } else {
                            toggleFolder(node.id);
                        }
                    }}
                    className={`flex items-center gap-1.5 text-[13px] cursor-pointer text-slate-300 hover:text-white rounded-[2px] transition-colors py-1.5 hover:bg-slate-800/60 ${isCollapsed ? 'justify-center mb-4' : 'w-[calc(100%-8px)] ml-1 pr-1'}`}
                    style={{ paddingLeft: !isCollapsed ? `${paddingLeft + 4}px` : '0px' }}
                >
                    {!isCollapsed && (
                        isOpen ? <ChevronDown size={14} className="text-red-500 shrink-0" /> : <ChevronRight size={14} className="text-slate-500 shrink-0" />
                    )}
                    <Folder size={isCollapsed ? 24 : 16} className={isCollapsed ? "text-red-500 shrink-0" : "text-slate-400 shrink-0"} />
                    {!isCollapsed && <span className="whitespace-nowrap font-medium truncate select-none" title={node.name}>{node.name}</span>}
                </div>

                <AnimatePresence initial={false}>
                    {!isCollapsed && isOpen && node.children && (
                        <motion.div key={`content-${node.id}`} variants={listVariants} initial="hidden" animate="show" exit="exit" className="flex flex-col w-full space-y-0.5 mt-0.5 relative overflow-hidden">
                            <div className="absolute top-0 bottom-0 w-px bg-slate-700/40" style={{ left: `${paddingLeft + 15}px` }}></div>
                            {node.children.map(child => (
                                <motion.div key={child.id} variants={itemVariants}>
                                    <TreeNode
                                        node={child}
                                        level={level + 1}
                                        openFolders={openFolders}
                                        toggleFolder={toggleFolder}
                                        activeFile={activeFile}
                                        setActiveFile={setActiveFile}
                                        isCollapsed={isCollapsed}
                                        setIsCollapsed={setIsCollapsed}
                                        setOpenFolders={setOpenFolders}
                                        onOpenFile={onOpenFile}
                                        tabs={tabs}
                                        searchQuery={searchQuery}
                                        matchedFileIds={matchedFileIds}
                                        matchedFolderIds={matchedFolderIds}
                                    />
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // 2. EĞER BU BİR DOSYA İSE:
    if (isCollapsed) return null;

    const isSearchMatch = isSearchActive && matchedFileIds.has(node.id);
    const extStyle = isSearchMatch ? getExtStyle(node.extension) : null;

    let bgColor = 'border border-transparent ml-1 rounded-[2px] pr-2 hover:bg-slate-800/40';
    let textColor = 'text-slate-300 hover:text-white';

    if (isSearchMatch) {
        bgColor = extStyle.bgColor;
        textColor = extStyle.textColor;
    } else if (isOpenedInTab) {
        textColor = 'text-red-400 font-medium';
        if (isAktif) bgColor = 'bg-red-500/10 border border-transparent border-l border-l-red-500 ml-1 rounded-[2px] pr-2 shadow-[inset_0_0_10px_rgba(160,27,27,0.05)]';
    } else if (isAktif) {
        textColor = 'text-white font-medium';
        bgColor = 'bg-red-500/10 border border-transparent border-l border-l-red-500 ml-1 rounded-[2px] pr-2 shadow-[inset_0_0_10px_rgba(160,27,27,0.05)]';
    }

    return (
        <div
            draggable={true}
            onDragStart={(e) => {
                // 1) Sürüklenen veriyi (Payload) yükle
                e.dataTransfer.setData('application/json', JSON.stringify({
                    id: node.id,
                    title: node.name,
                    type: node.extension || 'file',
                    url: node.url
                }));

                // Dışarıya Sürükleme (Native OS Drag-out) Desteği
                // Sol panelden tutarak Outlook/masaüstü/WhatsApp gibi yerlere dosyayı kopyala
                if (node.url && node.extension && node.extension !== 'folder') {
                    const origin = window.location.origin;
                    // /download/ endpoint'i Content-Disposition: attachment döner — OS dosya olarak tanır
                    const rawUrl = node.url.startsWith('http') ? node.url : `${origin}${node.url}`;
                    const downloadUrl = rawUrl.replace('/api/archive/file/', '/api/archive/download/');
                    e.dataTransfer.setData('DownloadURL', `application/octet-stream:${node.name}:${downloadUrl}`);
                    e.dataTransfer.effectAllowed = 'copyLink';
                }

                // 2) Kendi özel Sürükleme Hayaletimizi ('Drag Ghost') Oluşturuyoruz
                // DOM'da geçici bir kopya öğe (klon) yarat
                const dragGhost = document.createElement('div');
                dragGhost.className = 'flex items-center gap-2 text-xs rounded p-2 bg-slate-800 text-white font-medium shadow-lg border border-slate-700/50';
                dragGhost.style.position = 'absolute';
                dragGhost.style.top = '-1000px'; // Ekranda görünmemesi için dışarı at

                const clone = e.currentTarget.cloneNode(true);
                clone.style.backgroundColor = '#1e293b'; // slate-800
                clone.style.color = '#ffffff';
                clone.style.border = '1px solid #334155';
                clone.style.borderRadius = '6px';
                clone.style.padding = '8px 12px';
                clone.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.5)';
                clone.style.opacity = '1';
                clone.style.width = 'max-content';
                clone.style.paddingLeft = '8px';

                document.body.appendChild(clone);

                // Klonu imlecin altına yerleştir (DataTransfer.setDragImage)
                // 10, 10 -> imlecin kutu içindeki X, Y offset noktasıdır
                e.dataTransfer.setDragImage(clone, 20, 20);

                setTimeout(() => {
                    if (document.body.contains(clone)) {
                        document.body.removeChild(clone);
                    }
                }, 0);
            }}
            // TEK TIKLAMA: Sadece sol panelde aktif (mavi/yeşil) yapar
            onClick={(e) => {
                e.stopPropagation();
                setActiveFile(node.id);
            }}
            // ÇİFT TIKLAMA: App.jsx'e "Bu dosyayı orta alanda (Sekme olarak) aç!" der
            onDoubleClick={(e) => {
                e.stopPropagation();
                if (onOpenFile) {
                    onOpenFile({
                        id: node.id,
                        title: node.name,
                        type: node.extension || 'file',
                        url: node.url
                    });
                }
            }}
            className={`flex items-center gap-2 text-[12px] py-1 cursor-pointer whitespace-nowrap transition-all relative z-10 w-[calc(100%-8px)] ${bgColor} ${textColor}`}
            style={{ paddingLeft: `${paddingLeft + 8}px` }}
            title="Açmak için çift tıklayın"
        >
            <SidebarFileIcon ext={node.extension} />
            <span className="truncate w-full select-none">{highlightText(node.name, searchQuery, extStyle?.markClass)}</span>
        </div>
    );
};

export default TreeNode;
