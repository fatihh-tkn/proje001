import React from 'react';
import { Trash2 } from 'lucide-react';

export const CloseAllTabsButton = ({ onCloseAllTabs }) => {
    return (
        <div className="flex items-stretch border-l border-slate-200/80 bg-slate-200/30 shrink-0">
            <button
                onClick={onCloseAllTabs}
                className="group flex items-center justify-start hover:bg-red-50/80 transition-all duration-300 ease-out cursor-pointer overflow-hidden w-[28px] hover:w-[155px] relative"
                title="Tüm Sekmeleri Kapat"
            >
                <Trash2 size={13} className="text-slate-500 group-hover:text-red-500 shrink-0 absolute left-2 transition-colors" />
                <span className="text-[10px] font-bold tracking-wider text-red-600 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-75 absolute left-[26px]">
                    TÜM SEKMELERİ KAPAT
                </span>
            </button>
        </div>
    );
};
