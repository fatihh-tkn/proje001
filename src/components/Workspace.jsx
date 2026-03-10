import React, { useState, useEffect, Suspense, lazy, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Activity, Minus, Maximize2, X, Loader2, Trash2, LayoutTemplate } from 'lucide-react';
import FullLogoImage from '../assets/logo-acik.png';
import { DndContext, DragOverlay, closestCenter, pointerWithin, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { arraySwap, SortableContext, useSortable, rectSwappingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { snapCenterToCursor } from '@dnd-kit/modifiers';

const BpmnViewer = lazy(() => import('./viewers/BpmnViewer'));
const PdfViewer = lazy(() => import('./viewers/PdfViewer'));
const DocxViewer = lazy(() => import('./viewers/DocxViewer'));
const ExcelViewer = lazy(() => import('./viewers/ExcelViewer'));

// ==========================================
// WINDOWS 11 / CHROME OS SNAP LAYOUTS
// ==========================================
const SNAP_LAYOUTS = [
  {
    id: 'split-2',
    name: 'İki Eşit',
    parentClass: 'grid-cols-2 grid-rows-1',
    zones: [
      { id: 0, class: 'col-span-1 row-span-1 w-full h-full' },
      { id: 1, class: 'col-span-1 row-span-1 w-full h-full' }
    ]
  },
  {
    id: 'split-2fr-1fr',
    name: 'Sol Geniş',
    parentClass: 'grid-cols-[2fr_1fr] grid-rows-1',
    zones: [
      { id: 0, class: 'col-span-1 row-span-1 w-full h-full' },
      { id: 1, class: 'col-span-1 row-span-1 w-full h-full' }
    ]
  },
  {
    id: 'split-1fr-2fr',
    name: 'Sağ Geniş',
    parentClass: 'grid-cols-[1fr_2fr] grid-rows-1',
    zones: [
      { id: 0, class: 'col-span-1 row-span-1 w-full h-full' },
      { id: 1, class: 'col-span-1 row-span-1 w-full h-full' }
    ]
  },
  {
    id: 'quad',
    name: 'Dörtlü',
    parentClass: 'grid-cols-2 grid-rows-2',
    zones: [
      { id: 0, class: 'col-span-1 row-span-1 w-full h-full' },
      { id: 1, class: 'col-span-1 row-span-1 w-full h-full' },
      { id: 2, class: 'col-span-1 row-span-1 w-full h-full' },
      { id: 3, class: 'col-span-1 row-span-1 w-full h-full' }
    ]
  },
  {
    id: 'top-span',
    name: 'Üst Geniş',
    parentClass: 'grid-cols-2 grid-rows-2',
    previewClass: 'grid-cols-2 grid-rows-2',
    zones: [
      { id: 0, class: 'col-span-2 row-span-1 w-full h-full' },
      { id: 1, class: 'col-span-1 row-span-1 w-full h-full' },
      { id: 2, class: 'col-span-1 row-span-1 w-full h-full' }
    ]
  },
  {
    id: 'bottom-span',
    name: 'Alt Geniş',
    parentClass: 'grid-cols-2 grid-rows-2',
    previewClass: 'grid-cols-2 grid-rows-2',
    zones: [
      { id: 0, class: 'col-span-1 row-span-1 w-full h-full' },
      { id: 1, class: 'col-span-1 row-span-1 w-full h-full' },
      { id: 2, class: 'col-span-2 row-span-1 w-full h-full' }
    ]
  }
];

const DynamicViewer = ({ tab }) => {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center w-full h-full text-slate-400">
        <Loader2 size={32} className="animate-spin mb-3 text-teal-500" />
        <p className="text-sm">Görüntüleyici Modül Yükleniyor...</p>
      </div>
    }>
      {tab.type === 'bpmn' && <BpmnViewer url={tab.url} title={tab.title} />}
      {tab.type === 'pdf' && <PdfViewer url={tab.url} title={tab.title} />}
      {(tab.type === 'doc' || tab.type === 'docx') && <DocxViewer url={tab.url} title={tab.title} />}
      {(tab.type === 'xls' || tab.type === 'xlsx') && <ExcelViewer url={tab.url} title={tab.title} />}

      {tab.type !== 'bpmn' && tab.type !== 'pdf' && tab.type !== 'docx' && tab.type !== 'doc' && tab.type !== 'xls' && tab.type !== 'xlsx' && (
        <div className="flex flex-col items-center justify-center w-full h-full text-slate-500 text-center">
          <div className="inline-block p-4 rounded-full bg-slate-50 border border-slate-200 mb-4">
            <Activity size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-800">{tab.title}</h3>
          <p className="text-xs text-slate-500 mt-2">Bu dosya formatı desteklenmiyor veya içeriği yok.</p>
        </div>
      )}
    </Suspense>
  );
};

const getGridLayout = (count) => {
  if (count === 0) return "grid-cols-1 grid-rows-1";
  if (count === 1) return "grid-cols-1 grid-rows-1";
  if (count === 2) return "grid-cols-2 grid-rows-1";
  if (count === 3 || count === 4) return "grid-cols-2 grid-rows-2";
  if (count === 5 || count === 6) return "grid-cols-3 grid-rows-2";
  if (count >= 7 && count <= 9) return "grid-cols-3 grid-rows-3";
  return "grid-cols-4 grid-rows-3";
};

const TileWindow = ({ tab, isActive, isDraggingGhost, activeId, isMaximized, onMinimize, onClose, onFocus, onMaximize, onSelectLayout, customZoneClass }) => {

  const [showSnap, setShowSnap] = useState(false);
  const snapTimeoutRef = useRef(null);

  const handleMouseEnterSnap = () => {
    if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
    setShowSnap(true);
  };

  const handleMouseLeaveSnap = () => {
    snapTimeoutRef.current = setTimeout(() => {
      setShowSnap(false);
    }, 250);
  };

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
    disabled: isMaximized || isDraggingGhost
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <motion.div
      layout={!isDraggingGhost && !isMaximized}
      initial={!isDraggingGhost ? { opacity: 0, scale: 0.92, filter: 'blur(8px)' } : false}
      animate={!isDraggingGhost ? { opacity: isDragging ? 0 : 1, scale: 1, filter: 'blur(0px)' } : false}
      exit={!isDraggingGhost ? { opacity: 0, scale: 0.92, filter: 'blur(6px)' } : false}
      transition={{ type: "spring", stiffness: 260, damping: 28, mass: 0.8 }}
      onPointerDownCapture={onFocus}

      ref={!isMaximized ? setNodeRef : undefined}
      style={isDraggingGhost ? {} : (isMaximized ? {} : style)}
      {...(!isMaximized && !isDraggingGhost ? attributes : {})}

      className={`
        flex flex-col shadow-2xl backdrop-blur-md min-w-0 min-h-0
        border cyber-window pointer-events-auto
        ${isMaximized ? '' : 'rounded-xl'}
        ${!isMaximized && customZoneClass ? customZoneClass : ''}
        
        ${isActive ? 'border-slate-200 bg-white shadow-xl' : 'border-slate-200 bg-slate-50 opacity-90'}
        
        ${isMaximized ? 'w-full h-full' : 'w-full h-full relative'}
      `}
    >
      <div
        {...(!isMaximized && !isDraggingGhost ? listeners : {})}
        className={`h-12 border-b flex items-center justify-between px-4 shrink-0 select-none transition-colors duration-300 ${isMaximized ? '' : 'rounded-t-xl'}
          ${isActive ? 'bg-[#A01B1B] border-[#8a1717]' : 'bg-slate-50 border-slate-200'}
          ${!isMaximized ? 'cursor-grab active:cursor-grabbing' : ''}
        `}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2 pointer-events-none">
          {tab.type === 'pdf'
            ? <FileText size={16} className={`shrink-0 ${isActive ? 'text-white/80' : 'text-red-500'}`} />
            : <Activity size={16} className={`shrink-0 ${isActive ? 'text-white/80' : 'text-slate-500'}`} />}
          <span className={`text-sm font-medium tracking-wide truncate ${isActive ? 'text-white' : 'text-slate-700'}`}>{tab.title}</span>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-3 shrink-0 relative z-[9999]" onPointerDown={(e) => e.stopPropagation()}>
          <button onClick={(e) => { e.stopPropagation(); onMinimize(); }} className={`transition-colors cursor-pointer ${isActive ? 'text-white/60 hover:text-white' : 'text-slate-400 hover:text-slate-800'}`}>
            <Minus size={14} />
          </button>

          <div
            className="relative flex items-center justify-center -my-2 py-2 -mx-1 px-1"
            onMouseEnter={handleMouseEnterSnap}
            onMouseLeave={handleMouseLeaveSnap}
          >
            <button onClick={(e) => { e.stopPropagation(); setShowSnap(!showSnap); }} className={`transition-colors cursor-pointer ${isMaximized ? 'text-white hover:text-white/80' : isActive ? 'text-white/60 hover:text-white' : 'text-slate-400 hover:text-red-500'}`} title="Ekran Düzeni (Üzerine Gelin)">
              <LayoutTemplate size={12} />
            </button>

            {/* SNAP LAYOUT POPUP */}
            <AnimatePresence>
              {showSnap && !isMaximized && !isDraggingGhost && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute top-full -right-[110px] mt-6 bg-[#232323]/95 backdrop-blur-xl border border-[#444]/60 rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.6)] px-4 py-4 w-[280px] grid grid-cols-2 gap-3"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {/* Ok / Pointer İşareti */}
                  <div className="absolute -top-1.5 right-[114px] w-3 h-3 bg-[#232323] border-t border-l border-[#444]/60 rotate-45 transform pointer-events-none"></div>

                  {SNAP_LAYOUTS.map((layout) => (
                    <div
                      key={layout.id}
                      className={`w-full h-16 bg-[#333]/50 border border-[#444]/50 rounded-lg p-[5px] gap-[5px] grid 
                           ${layout.previewClass || layout.parentClass.split(' ')[0]} 
                           ${layout.previewClass || layout.parentClass.split(' ')[1]}`}
                    >
                      {layout.zones.map((zone) => (
                        <div
                          key={zone.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSnap(false);
                            onSelectLayout(layout.id, zone.id);
                          }}
                          className={`bg-[#555] hover:bg-white rounded-[3px] transition-all duration-150 cursor-pointer shadow-sm ${zone.class}`}
                          title={`${layout.name} - Alan ${zone.id + 1}`}
                        />
                      ))}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className={`transition-colors cursor-pointer ${isActive ? 'text-white/60 hover:text-white' : 'text-slate-400 hover:text-red-500'}`}>
            <X size={16} />
          </button>
        </div>
      </div>

      <div className={`flex-1 bg-white relative flex items-center justify-center overflow-hidden w-full h-full ${isMaximized ? '' : 'rounded-b-xl'}`} onPointerDown={(e) => e.stopPropagation()}>
        <DynamicViewer tab={tab} />
      </div>
    </motion.div>
  );
};

const TrashDropZone = ({ isDragging }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'trash-zone',
  });

  return (
    <div className="absolute bottom-10 left-0 right-0 flex justify-center pointer-events-none z-[100]">
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 450, damping: 25 }}
            ref={setNodeRef}
            className={`
              flex items-center justify-center transition-all duration-400 ease-out backdrop-blur-2xl pointer-events-auto h-16 px-10 rounded-[2rem] gap-4 border ring-1 ring-inset
              ${isOver
                ? 'bg-red-500 text-white border-red-400 ring-red-400 shadow-[0_0_60px_-10px_rgba(239,68,68,0.6)] scale-[1.05] -translate-y-2'
                : 'bg-white/60 text-slate-600 border-white/50 ring-white/30 shadow-[0_10px_40px_rgba(0,0,0,0.06)]'}
            `}
          >
            <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${isOver ? 'bg-white/20' : 'bg-white shadow-sm border border-slate-100'}`}>
              <Trash2 size={20} strokeWidth={isOver ? 2.5 : 2} className={isOver ? 'text-white' : 'text-red-400'} />
            </div>
            <span className={`text-[15px] font-semibold tracking-wide whitespace-nowrap transition-colors duration-300 ${isOver ? 'text-white' : 'text-slate-600'}`}>
              {isOver ? "Kapatmak İçin Bırak" : "Kapatmak İçin Çöpe Sürükle"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Workspace = ({ tabs = [], activeTabId, maximizedTabId, onMinimize, onCloseTab, onFocusTab, onMaximizeTab }) => {
  const [minimizedTabs, setMinimizedTabs] = useState([]);
  const [localTabs, setLocalTabs] = useState([]);
  const [activeDragId, setActiveDragId] = useState(null);
  const [customLayoutMode, setCustomLayoutMode] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    if (activeTabId) {
      setMinimizedTabs(prev => prev.filter(id => id !== activeTabId));
    }
  }, [activeTabId]);

  useEffect(() => {
    setLocalTabs(prev => {
      const activeTabIds = new Set(tabs.map(t => t.id));
      const filteredPrev = prev.filter(t => activeTabIds.has(t.id));
      const prevIds = new Set(filteredPrev.map(t => t.id));
      const newlyAdded = tabs.filter(t => !prevIds.has(t.id));
      return [...filteredPrev, ...newlyAdded];
    });
  }, [tabs]);

  const visibleTabs = localTabs.filter(tab => !minimizedTabs.includes(tab.id));

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
    setCustomLayoutMode(layoutId);

    // Uygulanan grid içindeki yeri swap yap
    setLocalTabs(prev => {
      const newTabs = [...prev];
      const currentIndex = newTabs.findIndex(t => t.id === tabId);
      if (currentIndex === -1) return prev;

      const [theTab] = newTabs.splice(currentIndex, 1);

      // Çok az dosya açıksa array sonundan öteye geçmemesini sağla
      const targetIndex = Math.min(zoneIndex, newTabs.length);
      newTabs.splice(targetIndex, 0, theTab);
      return newTabs;
    });
  };

  const activeDraggingTab = localTabs.find(t => t.id === activeDragId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex-1 flex items-center justify-center relative overflow-hidden select-none workspace-dev-logo-container transition-all duration-500">

        <div className="relative w-[85%] h-[85%] max-w-[1200px] flex items-center justify-center transition-all duration-500 z-0 pointer-events-none">
          <img src={FullLogoImage} alt="Yılgenci Base Logo" className="w-full h-full object-contain opacity-5 grayscale workspace-base-logo transition-all duration-500" />
        </div>

        <div className="absolute inset-0 z-10 p-6 pointer-events-none">
          <SortableContext items={visibleTabs.map(t => t.id)} strategy={rectSwappingStrategy}>
            <motion.div
              layout
              className={`relative w-full h-full grid gap-4 pointer-events-none ${gridLayoutClass}`}
            >
              <AnimatePresence>
                {visibleTabs.map((tab, idx) => {
                  const layoutConfig = customLayoutMode ? SNAP_LAYOUTS.find(l => l.id === customLayoutMode) : null;
                  const zoneClass = layoutConfig && layoutConfig.zones[idx]
                    ? layoutConfig.zones[idx].class.replace('w-full h-full', '').trim()
                    : '';

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
                transition={{ type: "spring", stiffness: 280, damping: 30, mass: 0.7 }}
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
                  // Tam ekrandayken layout seçilirse, tam ekrandan çık ve o layoutu uygula
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
