import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FullLogoImage from '../../assets/logo-acik.png';
import { DndContext, DragOverlay, closestCenter, pointerWithin, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arraySwap, SortableContext, rectSwappingStrategy } from '@dnd-kit/sortable';
import { snapCenterToCursor } from '@dnd-kit/modifiers';

import { SNAP_LAYOUTS, getGridLayout } from './layoutUtils';
import { TileWindow } from './TileWindow';
import { TrashDropZone } from './TrashDropZone';

const Workspace = ({ tabs = [], activeTabId, maximizedTabId, onMinimize, onCloseTab, onFocusTab, onMaximizeTab, onOpenFile }) => {
    const [minimizedTabs, setMinimizedTabs] = useState([]);
    const [localTabs, setLocalTabs] = useState([]);
    const [activeDragId, setActiveDragId] = useState(null);
    const [customLayoutMode, setCustomLayoutMode] = useState(null);

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

        // Seçilen sekme dışındakileri minimize et
        setMinimizedTabs(prev => {
            const allOtherIds = localTabs
                .filter(t => !t.isEmpty && t.id !== tabId)
                .map(t => t.id);
            return [...new Set([...prev, ...allOtherIds])];
        });

        setLocalTabs(prev => {
            const theTab = prev.find(t => !t.isEmpty && t.id === tabId);
            if (!theTab) return prev;

            // Tüm zone slotlarını oluştur (seçilen hariç boş)
            const slots = Array.from({ length: maxZones }, (_, i) =>
                i === zoneIndex
                    ? theTab
                    : { id: `empty-zone-${i}-${Date.now()}`, isEmpty: true }
            );

            // Minimize edilen diğer sekmeleri slotların arkasına ekle
            // (boş slot bulurlarsa oraya, bulamazlarsa layout reset ile normal moda girecekler)
            const otherRealTabs = prev.filter(t => !t.isEmpty && t.id !== tabId);
            return [...slots, ...otherRealTabs];
        });
    };

    const activeDraggingTab = localTabs.find(t => t.id === activeDragId);

    // ==========================================
    // HARİCİDEN (Sidebar'dan) SÜRÜKLE BIRAK YÖNETİMİ
    // ==========================================
    const handleNativeDragOver = (e) => {
        if (e.dataTransfer.types.includes('application/json')) {
            e.preventDefault(); // Sürüklemeye izin ver
        }
    };

    const handleNativeDrop = (e) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('application/json');
        if (data) {
            try {
                const file = JSON.parse(data);
                if (file && file.id && onOpenFile) {
                    onOpenFile(file); // App.jsx'teki onOpenFile'ı tetikler!
                }
            } catch (err) {
                console.error("Klasörden dosya sürüklerken hata oluştu", err);
            }
        }
    };

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
                onDrop={handleNativeDrop}
                className="flex-1 flex items-center justify-center relative overflow-hidden select-none workspace-dev-logo-container transition-all duration-500"
            >

                <div className="relative w-[85%] h-[85%] max-w-[1200px] flex items-center justify-center transition-all duration-500 z-0 pointer-events-none">
                    <img src={FullLogoImage} alt="Yılgenci Base Logo" className="w-full h-full object-contain opacity-5 grayscale workspace-base-logo transition-all duration-500" />
                </div>

                <div className="absolute inset-0 z-10 p-6 pointer-events-none">
                    <SortableContext
                        items={visibleTabs.filter(t => !t.isEmpty).map(t => t.id)}
                        strategy={rectSwappingStrategy}
                    >
                        <motion.div
                            layout
                            className={`relative w-full h-full grid gap-4 pointer-events-none ${gridLayoutClass}`}
                            transition={{ layout: { type: "tween", ease: "circOut", duration: 0.35 } }}
                        >
                            <AnimatePresence>
                                {visibleTabs.map((tab, idx) => {
                                    const layoutConfig = customLayoutMode ? SNAP_LAYOUTS.find(l => l.id === customLayoutMode) : null;
                                    const zoneClass = layoutConfig && layoutConfig.zones[idx]
                                        ? layoutConfig.zones[idx].class.replace('w-full h-full', '').trim()
                                        : '';

                                    if (tab.isEmpty) {
                                        return (
                                            <div
                                                key={tab.id}
                                                className={`pointer-events-auto relative border-2 border-transparent hover:border-slate-400/50 hover:bg-slate-500/5 transition-all rounded-xl ${zoneClass}`}
                                                onDragOver={(e) => {
                                                    if (e.dataTransfer.types.includes('application/json')) {
                                                        e.preventDefault();
                                                        e.stopPropagation();
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
                                                                // Hangi boş kutuya atıldığını hafızaya al
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
                                    }

                                    return (
                                        <TileWindow
                                            key={tab.id}
                                            tab={tab}
                                            isActive={activeTabId === tab.id}
                                            activeId={activeDragId}
                                            isMaximized={false}
                                            customZoneClass={zoneClass}
                                            onMinimize={() => {
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
                                    );
                                })}
                            </AnimatePresence>
                        </motion.div>
                    </SortableContext>
                </div>

                <AnimatePresence>
                    {maximizedTabId && (() => {
                        const maxTab = localTabs.find(t => t.id === maximizedTabId);
                        if (!maxTab) return null;
                        return (
                            <motion.div
                                key="maximized-overlay"
                                initial={{ opacity: 0, scale: 0.88, filter: 'blur(12px)' }}
                                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, scale: 0.92, filter: 'blur(8px)' }}
                                transition={{ type: "tween", ease: "circOut", duration: 0.35 }}
                                className="absolute inset-0 z-[60] p-4 pointer-events-auto"
                            >
                                <TileWindow
                                    tab={maxTab}
                                    isActive={true}
                                    isMaximized={true}
                                    isDraggingGhost={false}
                                    onMinimize={() => {
                                        if (onMaximizeTab) onMaximizeTab(maxTab.id);
                                        setMinimizedTabs(prev => [...prev, maxTab.id]);
                                        if (onMinimize) onMinimize();
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
