import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

export default function ArchiveTreeItem({ item, archives, meta, updateMeta, level = 0 }) {
    const [isOpen, setIsOpen] = useState(false);

    const children = archives.filter(a => a.parent_id == item.id && a.id !== item.id);
    const checked = meta[item.key] !== undefined ? meta[item.key] : true;
    const paddingLeft = level * 14;

    if (item.key === 'archive_empty') {
        return <div className="py-1.5 px-2 text-[10px] text-slate-400 italic">Belge bulunamadı.</div>;
    }

    const Toggle = () => (
        <div className={`shrink-0 w-7 h-3.5 rounded-full transition-all relative flex items-center ${checked ? 'bg-emerald-400' : 'bg-slate-200'}`}>
            <div className={`w-2.5 h-2.5 rounded-full bg-white absolute transition-all shadow-sm ${checked ? 'left-[15px]' : 'left-[2px]'}`} />
        </div>
    );

    if (item.is_folder) {
        return (
            <div className="flex flex-col">
                <div
                    className="flex items-center gap-1 py-1 pr-1 group"
                    style={{ paddingLeft: `${paddingLeft}px` }}
                >
                    <div
                        className="flex items-center gap-1 flex-1 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setIsOpen(p => !p); }}
                    >
                        {isOpen
                            ? <ChevronDown size={11} className="shrink-0 text-slate-400" />
                            : <ChevronRight size={11} className="shrink-0 text-slate-400" />
                        }
                        <span className="flex-1 text-[11px] text-slate-600 group-hover:text-slate-800 truncate select-none font-medium transition-colors">
                            {item.label}
                        </span>
                        {children.length > 0 && !isOpen && (
                            <span className="text-[9px] text-slate-300 mr-1.5">{children.length}</span>
                        )}
                    </div>
                    <div className="cursor-pointer" onClick={(e) => { e.stopPropagation(); updateMeta(item.key, !checked); setIsOpen(p => !p); }}>
                        <Toggle />
                    </div>
                </div>

                {isOpen && (
                    <div className="relative" style={{ paddingLeft: `${paddingLeft + 10}px` }}>
                        <div className="absolute top-0 bottom-0 w-px bg-slate-200" style={{ left: `${paddingLeft + 5}px` }} />
                        {children.length > 0 ? children.map(child => (
                            <ArchiveTreeItem
                                key={child.key}
                                item={child}
                                archives={archives}
                                meta={meta}
                                updateMeta={updateMeta}
                                level={level + 1}
                            />
                        )) : (
                            <div className="py-1 text-[10px] text-slate-300 italic">Boş</div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            className="flex items-center gap-1 py-1 pr-1 group cursor-pointer"
            style={{ paddingLeft: `${paddingLeft}px` }}
            onClick={() => updateMeta(item.key, !checked)}
        >
            <div className="w-1 h-1 rounded-full bg-slate-300 shrink-0 ml-0.5 mr-0.5" />
            <span className="flex-1 text-[11px] text-slate-500 group-hover:text-slate-700 truncate select-none transition-colors">
                {item.label}
            </span>
            <span className="text-[9px] font-mono text-slate-300 mr-1.5">{item.desc}</span>
            <Toggle />
        </div>
    );
}
