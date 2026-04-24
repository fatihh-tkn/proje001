import React, { useState } from 'react';
import { Database, Network, Table, DatabaseZap, PackageOpen, BarChart3 } from 'lucide-react';

import DatabaseViewer from '../DatabaseViewer';
import VectorDatabaseViewer from './VectorDatabaseViewer';
import SqlDatabaseViewer from '../SqlDatabaseViewer';
import GraphDatabaseViewer from './GraphDatabaseViewer';
import ArchiveDocsViewer from '../archive/ArchiveDocsViewer';

export default function DatabasesViewer({ defaultTab = 'sql' }) {
    const [activeTab, setActiveTab] = useState(defaultTab);

    React.useEffect(() => {
        setActiveTab(defaultTab);
    }, [defaultTab]);

    const tabs = [
        { id: 'sql', label: 'İlişkisel SQL', icon: Table },
        { id: 'vector', label: 'Vektör', icon: Database },
        { id: 'graph', label: 'Graf', icon: BarChart3 },
        { id: 'archive', label: 'Arşiv', icon: PackageOpen },
    ];

    return (
        <div className="flex flex-col h-full w-full bg-stone-50 font-sans">

            {/* ── KOMPAKT TEK SATIRLIK HEADER + TABS ── */}
            <div className="flex-none bg-white border-b border-stone-200/70">
                <div className="flex items-center px-5">

                    {/* Sol: Başlık */}
                    <div className="flex items-center gap-2 py-3 pr-6 border-r border-stone-200/60 mr-4 shrink-0">
                        <DatabaseZap size={16} className="text-[#378ADD]" />
                        <span className="text-[13px] font-semibold text-stone-800 whitespace-nowrap">Veri Yönetimi</span>
                    </div>

                    {/* Sağ: Sekmeler */}
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                        {tabs.map(tab => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-1.5 px-3 py-3 text-[12px] font-medium transition-all relative whitespace-nowrap shrink-0
                                        ${isActive
                                            ? 'text-[#378ADD]'
                                            : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
                                        }
                                    `}
                                >
                                    <tab.icon size={13} />
                                    {tab.label}
                                    {isActive && (
                                        <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#378ADD] rounded-t-sm" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── CONTENT AREA ── */}
            <div className="flex-1 overflow-hidden relative">
                <div className={`w-full h-full ${activeTab === 'sql' ? 'block' : 'hidden'}`}>
                    <SqlDatabaseViewer />
                </div>
                <div className={`w-full h-full ${activeTab === 'vector' ? 'block' : 'hidden'}`}>
                    <VectorDatabaseViewer />
                </div>
                <div className={`w-full h-full ${activeTab === 'graph' ? 'block' : 'hidden'}`}>
                    <GraphDatabaseViewer />
                </div>
                <div className={`w-full h-full ${activeTab === 'archive' ? 'block' : 'hidden'}`}>
                    <ArchiveDocsViewer />
                </div>

            </div>
        </div>
    );
}
