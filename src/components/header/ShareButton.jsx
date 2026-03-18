import React from 'react';
import { Share2 } from 'lucide-react';

export const ShareButton = () => {
    return (
        <div className="ml-4 flex items-center h-full">
            <button className="px-3 py-1 text-xs font-bold tracking-wide text-slate-600 hover:text-red-600 bg-white hover:bg-red-50 rounded-[4px] flex items-center transition-all duration-300 border border-slate-200 hover:border-red-200 shadow-sm hover:shadow-md focus:outline-none shrink-0 cursor-pointer">
                <Share2 className="w-3.5 h-3.5 mr-2" />
                PAYLAŞ
            </button>
        </div>
    );
};
