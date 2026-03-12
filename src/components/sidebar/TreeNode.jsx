import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Folder, FileText, Activity, CornerDownRight, FileQuestion,
    ChevronRight, ChevronDown
} from 'lucide-react';

const getFileIcon = (ext) => {
    switch (ext) {
        case 'pdf': return <FileText size={14} className="shrink-0 text-red-400" />;
        case 'bpmn': return <Activity size={14} className="shrink-0 text-teal-400" />;
        case 'xls': case 'xlsx': return <Activity size={14} className="shrink-0 text-green-400" />;
        case 'txt': case 'doc': case 'docx': return <FileText size={14} className="shrink-0 text-blue-400" />;
        case 'png': case 'jpg': case 'jpeg': return <FileText size={14} className="shrink-0 text-purple-400" />;
        default: return <FileQuestion size={14} className="shrink-0 text-slate-400" />;
    }
};

const listVariants = {
    hidden: { height: 0, opacity: 0 },
    show: {
        height: "auto", opacity: 1,
        transition: { height: { duration: 0.3, ease: "easeInOut" }, staggerChildren: 0.08 }
    },
    exit: {
        height: 0, opacity: 0,
        transition: { height: { duration: 0.3, ease: "easeInOut" }, staggerChildren: 0.05, staggerDirection: -1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: -10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
};

const TreeNode = ({ node, level, openFolders, toggleFolder, activeFile, setActiveFile, isCollapsed, setIsCollapsed, setOpenFolders, onOpenFile, tabs }) => {
    const isOpen = !!openFolders[node.id];
    const isAktif = activeFile === node.id;
    const isOpenedInTab = tabs?.some(t => t.id === node.id);
    const paddingLeft = level * 16;

    // 1. EĞER BU BİR KLASÖR İSE:
    if (node.type === 'folder') {
        if (isCollapsed && level > 0) return null;

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
                    className={`flex items-center gap-1.5 text-sm cursor-pointer hover:text-white transition-colors py-1.5 ${isCollapsed ? 'justify-center mb-4' : 'w-full'}`}
                    style={{ paddingLeft: !isCollapsed ? `${paddingLeft}px` : '0px' }}
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
                            <div className="absolute top-0 bottom-0 w-px bg-slate-800" style={{ left: `${paddingLeft + 15}px` }}></div>
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
                                        onOpenFile={onOpenFile} // onOpenFile'ı alt dosyalara aktar
                                        tabs={tabs}
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

    let bgColor = 'border border-transparent ml-1';
    let textColor = 'text-slate-400 hover:text-slate-200';

    if (isOpenedInTab) {
        textColor = 'text-red-400 font-medium';
        if (isAktif) bgColor = 'bg-white/10 border border-transparent border-l-2 border-l-red-500 ml-1 rounded-none';
    } else if (isAktif) {
        textColor = 'text-white';
        bgColor = 'bg-white/5 border border-transparent border-l-2 border-l-red-500 ml-1 rounded-none';
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
            className={`flex items-center gap-2 text-xs rounded p-1.5 cursor-pointer whitespace-nowrap transition-all relative z-10 ${bgColor} ${textColor}`}
            style={{ paddingLeft: `${paddingLeft + 14}px` }}
            title="Açmak için çift tıklayın"
        >
            <CornerDownRight size={14} className={isAktif ? "text-red-500 shrink-0" : "text-slate-600 shrink-0"} />
            {getFileIcon(node.extension)}
            <span className="truncate max-w-[150px] select-none">{node.name}</span>
        </div>
    );
};

export default TreeNode;
