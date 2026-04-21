import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Activity, Database, Bot, Settings as SettingsIcon, X, ChevronsDown } from 'lucide-react';
import { DndContext, DragOverlay, closestCenter, pointerWithin, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arraySwap, SortableContext, rectSwappingStrategy, useSortable } from '@dnd-kit/sortable';
import { snapCenterToCursor } from '@dnd-kit/modifiers';

import { SNAP_LAYOUTS, getGridLayout } from './layoutUtils';
import { TileWindow } from './TileWindow';
import { TrashDropZone } from './TrashDropZone';
import { BackgroundLogo } from './BackgroundLogo';

const TAB_THEME = {
    'n8n':               { bg: 'bg-orange-50',  border: 'border-orange-200', text: 'text-orange-700',  icon: 'text-orange-400' },
    'database':          { bg: 'bg-blue-50',    border: 'border-blue-200',   text: 'text-blue-700',    icon: 'text-blue-400'   },
    'databases-viewer':  { bg: 'bg-blue-50',    border: 'border-blue-200',   text: 'text-blue-700',    icon: 'text-blue-400'   },
    'api-usage':         { bg: 'bg-violet-50',  border: 'border-violet-200', text: 'text-violet-700',  icon: 'text-violet-400' },
    'ai-orchestrator':   { bg: 'bg-violet-50',  border: 'border-violet-200', text: 'text-violet-700',  icon: 'text-violet-400' },
    'meetings':          { bg: 'bg-teal-50',    border: 'border-teal-200',   text: 'text-teal-700',    icon: 'text-teal-400'   },
    'pdf':               { bg: 'bg-slate-100',  border: 'border-slate-300',  text: 'text-slate-700',   icon: 'text-slate-400'  },
    'docx':              { bg: 'bg-slate-100',  border: 'border-slate-300',  text: 'text-slate-700',   icon: 'text-slate-400'  },
    'xls':               { bg: 'bg-slate-100',  border: 'border-slate-300',  text: 'text-slate-700',   icon: 'text-slate-400'  },
};
const DEFAULT_THEME = { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: 'text-indigo-400' };

const getMinTabIcon = (type, iconClass) => {
    switch (type) {
        case 'api-usage':
        case 'ai-orchestrator': return <Bot size={12} strokeWidth={2} className={`shrink-0 ${iconClass}`} />;
        case 'database':
        case 'databases-viewer': return <Database size={12} strokeWidth={2} className={`shrink-0 ${iconClass}`} />;
        case 'settings': return <SettingsIcon size={12} strokeWidth={2} className={`shrink-0 ${iconClass}`} />;
        case 'n8n': return <Activity size={12} strokeWidth={2} className={`shrink-0 ${iconClass}`} />;
        default: return <FileText size={12} strokeWidth={2} className={`shrink-0 ${iconClass}`} />;
    }
};

const NEUTRAL_THEME = { bg: 'bg-slate-100', border: 'border-slate-200/80', text: 'text-slate-500', icon: 'text-slate-400' };

const MinimizedTabBar = ({ allTabs, minimizedTabIds, activeTabId, onRestore, onFocus, onClose, onCloseAll }) => {
    const [collapsed, setCollapsed] = React.useState(true);
    const spring = { type: 'spring', stiffness: 400, damping: 30 };
    const total = allTabs.length;

    return (
        <div className="absolute top-0 left-0 right-0 z-[200] pointer-events-none">
            <motion.div
                initial={{ y: -34 }}
                animate={{ y: collapsed ? -34 : 0 }}
                transition={spring}
                className="h-[34px] flex items-center px-2 gap-1 bg-[#f8f9fa] border-b border-slate-200/80 pointer-events-auto overflow-hidden"
                style={{ scrollbarWidth: 'none' }}
            >
                <div className="flex items-center gap-1 flex-1 overflow-x-auto overflow-y-hidden" style={{ scrollbarWidth: 'none' }}>
                    {allTabs.map(tab => {
                        const isMin = minimizedTabIds.includes(tab.id);
                        const isActive = tab.id === activeTabId;
                        // Sadece ekranda açık olan (minimize değil) sekme renkli, gerisi nötr
                        const theme = (!isMin && isActive)
                            ? (TAB_THEME[tab.type] || DEFAULT_THEME)
                            : NEUTRAL_THEME;
                        return (
                            <div
                                key={tab.id}
                                onClick={() => isMin ? onRestore(tab.id) : onFocus(tab.id)}
                                className={`flex items-center gap-1.5 px-2.5 h-[22px] ${theme.bg} ${theme.border} border rounded-sm cursor-pointer transition-all group/mintab shrink-0 hover:brightness-95`}
                            >
                                {getMinTabIcon(tab.type, theme.icon)}
                                <span className={`text-[11px] font-medium truncate max-w-[130px] ${theme.text}`}>{tab.title}</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
                                    className="opacity-0 group-hover/mintab:opacity-100 ml-0.5 text-slate-300 hover:text-red-500 transition-all"
                                >
                                    <X size={10} strokeWidth={2.5} />
                                </button>
                            </div>
                        );
                    })}
                </div>
                <button
                    onClick={onCloseAll}
                    className="flex items-center gap-1 px-2 h-[22px] text-[10px] text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-sm transition-all shrink-0"
                >
                    <X size={10} strokeWidth={2.5} />
                    Hepsini kapat
                </button>
            </motion.div>

            <motion.button
                animate={{ y: collapsed ? -34 : 0 }}
                transition={spring}
                onClick={() => setCollapsed(c => !c)}
                title={collapsed ? `${total} sekme` : 'Gizle'}
                className="absolute top-[34px] left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-1 px-3 h-[14px] bg-[#f8f9fa] border border-t-0 border-slate-200/80 rounded-b-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
                {collapsed
                    ? <><ChevronsDown size={10} strokeWidth={2} /><span className="text-[9px] font-medium">{total}</span></>
                    : <ChevronsDown size={10} strokeWidth={2} />
                }
            </motion.button>
        </div>
    );
};

const EmptySlot = ({ tab, idx, zoneClass, isMinimized, onOpenFile, targetDropZoneIndexRef, isNativeDragging }) => {
    const { setNodeRef, isOver } = useSortable({
        id: tab.id,
        data: tab,
    });

    if (isMinimized) return null;

    // Hap sekürükleniyor ise kendi kutu stilini gizle — cam overlay devralacak
    const showBoxHighlight = isOver && !isNativeDragging;

    return (
        <div
            ref={setNodeRef}
            className={`pointer-events-auto relative border-2 transition-all rounded-[4px] ${zoneClass} 
                ${showBoxHighlight ? 'border-[#4F8CFF] bg-[#4F8CFF]/10 z-50' : 'border-transparent'}
            `}
            onDragOver={(e) => {
                if (e.dataTransfer?.types.includes('application/json')) {
                    e.preventDefault();
                    // stopPropagation KALDIRILDI — üst Workspace'in cam overlay'i çalışsın
                }
            }}
            onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const data = e.dataTransfer.getData('application/json');
                if (data) {
                    try {
                        const file = JSON.parse(data);
                        if (file && file.id && onOpenFile) {
                            targetDropZoneIndexRef.current = { id: file.id, index: idx };
                            onOpenFile(file);
                        }
                    } catch (err) {
                        console.error("Gözlemciye sürüklerken hata:", err);
                    }
                }
            }}
        />
    );
};

// Tüm layout zone'larını gösterir: aktif zone mavi highlight, diğerleri ghost outline
const LayoutHintOverlay = ({ hint }) => {
    const layout = SNAP_LAYOUTS.find(l => l.id === hint.layoutId);
    if (!layout) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute inset-[12px] z-[70] pointer-events-none"
        >
            <div className={`w-full h-full grid gap-[6px] ${layout.parentClass}`}>
                {layout.zones.map((zone, i) => {
                    const isTarget = i === hint.zoneIndex;
                    const gridClasses = zone.class
                        .split(' ')
                        .filter(c => c.startsWith('col-') || c.startsWith('row-'))
                        .join(' ');
                    return (
                        <div
                            key={i}
                            className={`rounded-[6px] w-full h-full ${gridClasses}`}
                            style={isTarget ? {
                                border: '2px solid rgba(79, 140, 255, 0.85)',
                                background: 'rgba(79, 140, 255, 0.12)',
                                backdropFilter: 'blur(6px)',
                                WebkitBackdropFilter: 'blur(6px)',
                                boxShadow: 'inset 0 0 0 1px rgba(79, 140, 255, 0.2)',
                                transition: 'all 0.15s ease',
                            } : {
                                border: '1.5px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(255, 255, 255, 0.03)',
                                transition: 'all 0.15s ease',
                            }}
                        />
                    );
                })}
            </div>
        </motion.div>
    );
};

const Workspace = ({ tabs = [], activeTabId, maximizedTabId, onMinimize, onCloseTab, onFocusTab, onMaximizeTab, onOpenFile, onBackgroundDoubleClick }) => {
    const [minimizedTabs, setMinimizedTabs] = useState([]);
    const [localTabs, setLocalTabs] = useState([]);
    const [customLayoutMode, setCustomLayoutMode] = useState(null);
    const [activeDragId, setActiveDragId] = useState(null);
    const [layoutHint, setLayoutHint] = useState(null);
    const [isNativeDragging, setIsNativeDragging] = useState(false);

    // Her iki değer için ref — activeTabId effect'inde stale closure olmaması için
    const customLayoutModeRef = useRef(null);
    const minimizedTabsRef = useRef([]);
    const targetDropZoneIndexRef = useRef(null); // Sidebar'dan boş bir slota direkt sürüklenen dosyanın hedefini tutar
    useEffect(() => { customLayoutModeRef.current = customLayoutMode; }, [customLayoutMode]);
    useEffect(() => { minimizedTabsRef.current = minimizedTabs; }, [minimizedTabs]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    // Bir sekme aktif olduğunda (sekme çubuğundan açılırsa dahil) minimize listesinden çıkar.
    // Özel layout aktifse, sekmeyi ilk boş slota yerleştir veya layout'u sıfırla.
    useEffect(() => {
        if (!activeTabId) return;
        // Ref üzyerinden oku — stale closure yok
        if (!minimizedTabsRef.current.includes(activeTabId)) return;

        if (customLayoutModeRef.current) {
            const layout = SNAP_LAYOUTS.find(l => l.id === customLayoutModeRef.current);
            const maxZones = layout?.zones.length ?? 4;

            setLocalTabs(prev => {
                const emptySlotIdx = prev.findIndex((t, i) => t.isEmpty && i < maxZones);
                const tabIdx = prev.findIndex(t => t.id === activeTabId);

                if (emptySlotIdx !== -1 && tabIdx !== -1) {
                    const newArr = [...prev];
                    newArr[emptySlotIdx] = newArr[tabIdx];
                    newArr[tabIdx] = { id: `empty-freed-${Date.now()}`, isEmpty: true };
                    while (newArr.length > 0 && newArr[newArr.length - 1].isEmpty) newArr.pop();
                    return newArr;
                } else if (emptySlotIdx === -1) {
                    setCustomLayoutMode(null);
                }
                return prev;
            });
        }

        // Minimize listesinden çıkar — ayrı çağrı, hiçbir zaman başka bir setter içinde değil
        setMinimizedTabs(prev => prev.filter(id => id !== activeTabId));
    }, [activeTabId]); // minimizedTabs ve customLayoutMode ref üzerinden okunuyor

    useEffect(() => {
        setLocalTabs(prev => {
            const activeTabIds = new Set(tabs.map(t => t.id));
            const filteredPrev = prev.filter(t => t.isEmpty || activeTabIds.has(t.id));
            const prevIds = new Set(filteredPrev.filter(t => !t.isEmpty).map(t => t.id));
            const newlyAdded = tabs.filter(t => !prevIds.has(t.id));

            if (newlyAdded.length === 0) {
                const res = [...filteredPrev];
                while (res.length > 0 && res[res.length - 1].isEmpty) res.pop();
                return res;
            }

            const layout = customLayoutModeRef.current
                ? SNAP_LAYOUTS.find(l => l.id === customLayoutModeRef.current)
                : null;
            const maxZones = layout?.zones.length ?? Infinity;

            const result = [...filteredPrev];
            for (const newTab of newlyAdded) {
                let emptyIdx = -1;

                // 1) Sürükle-bırak ile bilerek belli bir boş slota bırakıldıysa hedefi belirle
                if (targetDropZoneIndexRef.current && targetDropZoneIndexRef.current.id === newTab.id) {
                    const targetIdx = targetDropZoneIndexRef.current.index;
                    if (targetIdx < maxZones && result[targetIdx] && result[targetIdx].isEmpty) {
                        emptyIdx = targetIdx;
                    }
                    targetDropZoneIndexRef.current = null; // Tüketildi
                }

                // 2) Eğer spesifik bir yer yoksa veya orası dolu/geçersizse ilk boş slotu bul
                if (emptyIdx === -1) {
                    emptyIdx = result.findIndex((t, i) => t.isEmpty && i < maxZones);
                }

                if (emptyIdx !== -1) {
                    result[emptyIdx] = newTab;
                } else {
                    // Layout doldu ya da özel layout yok → normal mod
                    if (customLayoutModeRef.current) setCustomLayoutMode(null);
                    result.push(newTab);
                }
            }

            while (result.length > 0 && result[result.length - 1].isEmpty) {
                result.pop();
            }

            return result;
        });
    }, [tabs]);

    const visibleTabs = localTabs.filter(tab => tab.isEmpty || !minimizedTabs.includes(tab.id));

    // EĞER ÖZEL LAYOUT SEÇİLDİYSE ONU, YOKSA OTOMATİK GRID'İ KULLAN
    const gridLayoutClass = customLayoutMode
        ? SNAP_LAYOUTS.find(l => l.id === customLayoutMode)?.parentClass || getGridLayout(visibleTabs.length)
        : getGridLayout(visibleTabs.length);

    const handleDragStart = (event) => {
        setActiveDragId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (over && over.id === 'trash-zone') {
            if (onCloseTab) onCloseTab(active.id);
        }
        else if (over && active.id !== over.id) {
            setLocalTabs((items) => {
                const oldIndex = items.findIndex(t => t.id === active.id);
                const newIndex = items.findIndex(t => t.id === over.id);
                return arraySwap(items, oldIndex, newIndex);
            });
        }
        setActiveDragId(null);
    };

    const handleDragCancel = () => {
        setActiveDragId(null);
    };

    const customCollisionDetection = (args) => {
        const pointerCollisions = pointerWithin(args);
        const trashCollision = pointerCollisions.find((c) => c.id === 'trash-zone');

        if (trashCollision) return [trashCollision];

        return closestCenter({
            ...args,
            droppableContainers: args.droppableContainers.filter(
                (container) => container.id !== 'trash-zone'
            ),
        });
    };

    const handleSelectLayout = (tabId, layoutId, zoneIndex) => {
        const layout = SNAP_LAYOUTS.find(l => l.id === layoutId);
        const maxZones = layout?.zones.length ?? 4;

        setCustomLayoutMode(layoutId);

        setLocalTabs(prev => {
            const theTab = prev.find(t => !t.isEmpty && t.id === tabId);
            if (!theTab) return prev;

            // Mevcut görünen sekmeler (minimize olmayan, boş olmayan)
            const currentlyVisible = prev.filter(t => !t.isEmpty && !minimizedTabsRef.current.includes(t.id));

            // Sekmeler zone sayısına sığabiliyorsa kapsamacı olmadan acık tut
            if (currentlyVisible.length <= maxZones) {
                // Sadece array'i tabId'yi zoneIndex'e taşıyacak şekilde yeniden düzenle
                const others = currentlyVisible.filter(t => t.id !== tabId);
                const ordered = Array.from({ length: maxZones }, (_, i) => {
                    if (i === zoneIndex) return theTab;
                    return others.shift() || { id: `empty-zone-${i}-${Date.now()}`, isEmpty: true };
                });
                const remaining = prev.filter(t => !t.isEmpty && minimizedTabsRef.current.includes(t.id));
                return [...ordered, ...remaining];
            }

            // Sığmazsa taşan sekmeleri minimize et
            const toMinimize = currentlyVisible.filter(t => t.id !== tabId).slice(maxZones - 1);
            if (toMinimize.length > 0) {
                setMinimizedTabs(prev => [...new Set([...prev, ...toMinimize.map(t => t.id)])]);
            }

            const fitsVisible = currentlyVisible.filter(t => t.id !== tabId).slice(0, maxZones - 1);
            const ordered = Array.from({ length: maxZones }, (_, i) => {
                if (i === zoneIndex) return theTab;
                return fitsVisible.shift() || { id: `empty-zone-${i}-${Date.now()}`, isEmpty: true };
            });
            const remaining = prev.filter(t => !t.isEmpty && minimizedTabsRef.current.includes(t.id));
            return [...ordered, ...remaining];
        });
    };

    const handleAddTabToGrid = (tabId, layoutId, zoneIndex) => {
        const layout = SNAP_LAYOUTS.find(l => l.id === layoutId);
        const maxZones = layout?.zones.length ?? 4;

        setCustomLayoutMode(layoutId);

        setMinimizedTabs(prev => prev.filter(id => id !== tabId));

        setLocalTabs(prev => {
            const theTab = prev.find(t => !t.isEmpty && t.id === tabId);
            if (!theTab) return prev;

            const visibleOthers = prev.filter(t => !t.isEmpty && t.id !== tabId && !minimizedTabsRef.current.includes(t.id));

            const slots = Array.from({ length: maxZones }, (_, i) => {
                if (i === zoneIndex) return theTab;
                if (visibleOthers.length > 0) return visibleOthers.shift();
                return { id: `empty-zone-${i}-${Date.now()}`, isEmpty: true };
            });

            if (visibleOthers.length > 0) {
                const toMinimize = visibleOthers.map(t => t.id);
                setMinimizedTabs(m => [...new Set([...m, ...toMinimize])]);
            }

            const otherTabs = prev.filter(t => !t.isEmpty && t.id !== tabId && !slots.includes(t));
            return [...slots, ...otherTabs];
        });
    };

    const activeDraggingTab = localTabs.find(t => t.id === activeDragId);

    useEffect(() => {
        const onDragStart = () => setIsNativeDragging(true);
        const onDragEnd = () => { setIsNativeDragging(false); setLayoutHint(null); };
        window.addEventListener('dragstart', onDragStart);
        window.addEventListener('dragend', onDragEnd);
        return () => {
            window.removeEventListener('dragstart', onDragStart);
            window.removeEventListener('dragend', onDragEnd);
        };
    }, []);

    const getDropZoneConfig = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const rx = (e.clientX - rect.left) / rect.width;
        const ry = (e.clientY - rect.top) / rect.height;

        // Sensitivite Optimizasyonu (Yanlışlıkla bölünmeyi önlemek için daha dar ölü bölgeler: %15)
        const isLeft = rx < 0.15;
        const isRight = rx > 0.85;
        const isTop = ry < 0.15;
        const isBottom = ry > 0.85;

        // Köşeler -> Dörtlü Dağılım (quad)
        if (isTop && isLeft) return { type: 'tl', layoutId: 'quad', zoneIndex: 0 };
        if (isTop && isRight) return { type: 'tr', layoutId: 'quad', zoneIndex: 1 };
        if (isBottom && isLeft) return { type: 'bl', layoutId: 'quad', zoneIndex: 2 };
        if (isBottom && isRight) return { type: 'br', layoutId: 'quad', zoneIndex: 3 };

        // Kenarlar -> İkili Bölünme (split-2 / h-split-2)
        if (isLeft) return { type: 'left', layoutId: 'split-2', zoneIndex: 0 };
        if (isRight) return { type: 'right', layoutId: 'split-2', zoneIndex: 1 };
        if (isTop) return { type: 'top', layoutId: 'h-split-2', zoneIndex: 0 };
        if (isBottom) return { type: 'bottom', layoutId: 'h-split-2', zoneIndex: 1 };

        return { type: null, layoutId: null, zoneIndex: -1 };
    };


    // ==========================================
    // HARİCİDEN (Sidebar veya Menüden) SÜRÜKLE BIRAK YÖNETİMİ
    // ==========================================
    const handleNativeDragOver = (e) => {
        if (e.dataTransfer.types.includes('application/json')) {
            e.preventDefault();
            const config = getDropZoneConfig(e);
            setLayoutHint(config.type ? config : null);
        }
    };

    const handleNativeDragLeave = (e) => {
        if (e.target === e.currentTarget) setLayoutHint(null);
    };

    const handleNativeDrop = (e) => {
        e.preventDefault();
        setLayoutHint(null);
        const data = e.dataTransfer.getData('application/json');
        if (data) {
            try {
                const file = JSON.parse(data);
                if (file && file.id && onOpenFile) {
                    const config = getDropZoneConfig(e);

                    if (config.layoutId) {
                        const exists = localTabs.find(t => t.id === file.id);
                        if (exists) {
                            handleAddTabToGrid(file.id, config.layoutId, config.zoneIndex);
                            if (onFocusTab) onFocusTab(file.id);
                            return;
                        } else {
                            setCustomLayoutMode(config.layoutId);
                            targetDropZoneIndexRef.current = { id: file.id, index: config.zoneIndex };
                        }
                    }

                    onOpenFile(file);
                }
            } catch (err) {
                console.error("Sürüklerken hata oluştu", err);
            }
        }
    };

    const minimizedTabsData = localTabs.filter(t => minimizedTabs.includes(t.id) && !t.isEmpty);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <div
                onDragOver={handleNativeDragOver}
                onDragLeave={handleNativeDragLeave}
                onDrop={handleNativeDrop}
                onDoubleClick={(e) => {
                    // Yalnızca arka plana tıklandıysa menüleri küçült
                    if (e.target === e.currentTarget && onBackgroundDoubleClick) {
                        onBackgroundDoubleClick();
                    }
                }}
                className="flex-1 flex items-center justify-center relative overflow-hidden select-none workspace-dev-logo-container transition-all duration-500"
            >

                <BackgroundLogo />

                {/* Sekme Barı */}
                {localTabs.filter(t => !t.isEmpty).length > 0 && (
                    <MinimizedTabBar
                        allTabs={localTabs.filter(t => !t.isEmpty)}
                        minimizedTabIds={minimizedTabs}
                        activeTabId={activeTabId}
                        onRestore={(tabId) => {
                            // Ekranda açık sekme varsa ızgara düzeninde aç, yoksa tek başına göster
                            setMinimizedTabs(prev => prev.filter(id => id !== tabId));
                            if (onFocusTab) onFocusTab(tabId);
                        }}
                        onFocus={(tabId) => {
                            if (onFocusTab) onFocusTab(tabId);
                        }}
                        onClose={(tabId) => {
                            if (onCloseTab) onCloseTab(tabId);
                            setMinimizedTabs(prev => prev.filter(id => id !== tabId));
                        }}
                        onCloseAll={() => {
                            minimizedTabsData.forEach(t => { if (onCloseTab) onCloseTab(t.id); });
                            setMinimizedTabs([]);
                        }}
                    />
                )}

                {/* Layout önizlemesi: tüm zone'lar gösterilir, hedef mavi highlight */}
                <AnimatePresence>
                    {layoutHint && layoutHint.layoutId && (
                        <LayoutHintOverlay key={layoutHint.layoutId} hint={layoutHint} />
                    )}
                </AnimatePresence>

                <div className="absolute inset-0 z-10 p-0 pointer-events-none">
                    <SortableContext
                        items={visibleTabs.map(t => t.id)}
                        strategy={rectSwappingStrategy}
                    >
                        <div
                            className={`relative w-full h-full grid gap-0 pointer-events-none ${gridLayoutClass}`}
                        >
                            {/* Mount/Unmount performans kaybını önlemek için tüm localTabs'i tarıyoruz. Minimizeleri 'hidden' yapıyoruz */}
                            {localTabs.map((tab, idx) => {
                                const isMinimized = minimizedTabs.includes(tab.id);
                                const isMaximizedTabHere = tab.id === maximizedTabId;

                                const layoutConfig = customLayoutMode ? SNAP_LAYOUTS.find(l => l.id === customLayoutMode) : null;
                                const zoneClass = layoutConfig && layoutConfig.zones[idx]
                                    ? layoutConfig.zones[idx].class.replace('w-full h-full', '').trim()
                                    : '';

                                const displayClass = isMinimized ? 'hidden' : (isMaximizedTabHere ? 'opacity-0 pointer-events-none' : '');

                                if (tab.isEmpty) {
                                    return (
                                        <EmptySlot
                                            key={tab.id}
                                            tab={tab}
                                            idx={idx}
                                            zoneClass={zoneClass}
                                            isMinimized={isMinimized}
                                            onOpenFile={onOpenFile}
                                            targetDropZoneIndexRef={targetDropZoneIndexRef}
                                            isNativeDragging={isNativeDragging}
                                        />
                                    );
                                }

                                return (
                                    <div key={tab.id} className={`${displayClass} ${zoneClass} relative pointer-events-auto flex items-stretch justify-stretch col-span-1 row-span-1`}>
                                        <TileWindow
                                            tab={tab}
                                            isActive={activeTabId === tab.id}
                                            activeId={activeDragId}
                                            isMaximized={false}
                                            customZoneClass={zoneClass}
                                            onMinimize={() => {
                                                if (tab.id === 'n8n-viewer') {
                                                    if (onCloseTab) onCloseTab(tab.id, null, { keepAlive: true });
                                                    return;
                                                }
                                                setMinimizedTabs(prev => [...prev, tab.id]);
                                                if (onMinimize) onMinimize();
                                            }}
                                            onClose={() => {
                                                if (onCloseTab) onCloseTab(tab.id);
                                            }}
                                            onFocus={() => {
                                                if (onFocusTab) onFocusTab(tab.id);
                                            }}
                                            onMaximize={() => onMaximizeTab && onMaximizeTab(tab.id)}
                                            onSelectLayout={(layoutId, zoneId) => handleSelectLayout(tab.id, layoutId, zoneId)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </SortableContext>
                </div>

                <AnimatePresence>
                    {maximizedTabId && (() => {
                        const maxTab = localTabs.find(t => t.id === maximizedTabId);
                        if (!maxTab) return null;
                        return (
                            <motion.div
                                key="maximized-overlay"
                                initial={{ opacity: 0, scale: 0.85, filter: 'blur(10px)' }}
                                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, scale: 0.1, y: -window.innerHeight * 0.4, filter: 'blur(4px)' }}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                className="absolute inset-0 z-[60] p-0 pointer-events-auto"
                            >
                                <TileWindow
                                    tab={maxTab}
                                    isActive={true}
                                    isMaximized={true}
                                    isDraggingGhost={false}
                                    onMinimize={() => {
                                        if (onMaximizeTab) onMaximizeTab(maxTab.id);
                                        if (maxTab.id === 'n8n-viewer') {
                                            if (onCloseTab) onCloseTab(maxTab.id, null, { keepAlive: true });
                                        } else {
                                            setMinimizedTabs(prev => [...prev, maxTab.id]);
                                            if (onMinimize) onMinimize();
                                        }
                                    }}
                                    onClose={() => {
                                        if (onMaximizeTab) onMaximizeTab(maxTab.id);
                                        if (onCloseTab) onCloseTab(maxTab.id);
                                    }}
                                    onFocus={() => {
                                        if (onFocusTab) onFocusTab(maxTab.id);
                                    }}
                                    onMaximize={() => onMaximizeTab && onMaximizeTab(maxTab.id)}
                                    onSelectLayout={(layoutId, zoneId) => {
                                        if (onMaximizeTab) onMaximizeTab(maxTab.id);
                                        handleSelectLayout(maxTab.id, layoutId, zoneId);
                                    }}
                                />
                            </motion.div>
                        );
                    })()}
                </AnimatePresence>

                <TrashDropZone isDragging={!!activeDragId} />

                <DragOverlay modifiers={[snapCenterToCursor]} dropAnimation={null}>
                    {activeDragId && activeDraggingTab ? (
                        <div
                            style={{
                                transform: 'scale(0.5)',
                                transformOrigin: 'center center',
                                opacity: 0.8,
                                cursor: 'grabbing',
                                width: '100%',
                                height: '100%'
                            }}
                        >
                            <TileWindow
                                tab={activeDraggingTab}
                                isActive={true}
                                isDraggingGhost={true}
                                onMinimize={() => { }}
                                onClose={() => { }}
                                onFocus={() => { }}
                            />
                        </div>
                    ) : null}
                </DragOverlay>

            </div>
        </DndContext>
    );
};

export default Workspace;
