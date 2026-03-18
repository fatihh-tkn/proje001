import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';

/**
 * SlideDeleteBar — Sağdan sola açılan onay çekmeceleri.
 *
 * Props:
 *   onDelete   : () => void   — Onay geldiğinde çağrılır
 *   label      : string       — Onay penceresindeki başlık (default: "Kalıcı Olarak Sil")
 *   iconSize   : number       — Çöp simgesi boyutu (default: 16)
 *   children   : React node   — Çekmeceyle birlikte render edilecek içerik
 *   dimContent : bool         — Onay açıkken içeriği karartır (default: false)
 */
export function SlideDeleteBar({ onDelete, label = 'Kalıcı Olarak Sil', iconSize = 16, children, dimContent = false }) {
    const [showConfirm, setShowConfirm] = useState(false);

    return (
        <div className="group relative flex overflow-hidden w-full h-full">
            {/* Ana içerik */}
            <div className={`flex-1 min-w-0 h-full transition-all duration-300 ${dimContent && showConfirm ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}`}>
                {children}
            </div>

            {/* Slayt çekmece */}
            <div
                className={`absolute right-0 top-0 bottom-0 group/trash transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden flex items-center justify-end z-10
                    ${showConfirm
                        ? 'w-[140px] bg-white/95 backdrop-blur-sm border-l border-black/[0.03] shadow-[-5px_0_20px_rgba(0,0,0,0.02)]'
                        : 'w-10 bg-transparent cursor-pointer'}`}
                onClick={() => !showConfirm && setShowConfirm(true)}
                title={!showConfirm ? 'Sil' : ''}
            >
                <div className="w-[140px] flex flex-col justify-center h-full relative shrink-0">

                    {/* Onay içeriği */}
                    <div className={`absolute inset-0 flex flex-col justify-center items-center px-4 transition-all duration-300
                        ${showConfirm ? 'opacity-100 delay-100 translate-x-0' : 'opacity-0 translate-x-2 pointer-events-none'}`}>
                        <span className="text-[10px] font-medium text-gray-400 mb-1.5">{label || 'Emin misiniz?'}</span>
                        <div className="flex items-center gap-3 w-full justify-center">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }}
                                className="text-[10px] uppercase font-medium tracking-wider text-gray-400 hover:text-gray-800 transition-colors cursor-pointer"
                            >
                                İptal
                            </button>
                            <span className="w-px h-2.5 bg-gray-200"></span>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(); setShowConfirm(false); }}
                                className="text-[10px] uppercase font-medium tracking-wider text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                            >
                                Sil
                            </button>
                        </div>
                    </div>

                    {/* Çöp simgesi (kapalıyken) */}
                    <div className={`absolute right-0 top-0 bottom-0 w-10 flex items-center justify-center transition-all duration-300 ${showConfirm ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'}`}>
                        <Trash2
                            size={iconSize}
                            className="text-gray-300 opacity-0 group-hover:opacity-100 group-hover/trash:text-red-400 transition-all duration-200"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
