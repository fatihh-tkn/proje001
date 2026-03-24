import React, { useState } from 'react';
import { Database, Network, Table, DatabaseZap, PackageOpen, BarChart3 } from 'lucide-react';

import DatabaseViewer from '../DatabaseViewer'; // Vektör (orijinal)
import VectorDatabaseViewer from './VectorDatabaseViewer'; // Ağaç görünümlü vektörDB
import SqlDatabaseViewer from '../SqlDatabaseViewer'; // SQL
import SqlSchemaViewer from './SqlSchemaViewer'; // SQL Şema
import GraphDatabaseViewer from './GraphDatabaseViewer'; // Graph
import ArchiveDocsViewer from '../archive/ArchiveDocsViewer'; // Arşiv

export default function DatabasesViewer() {
    const [activeTab, setActiveTab] = useState('sql');

    const tabs = [
        { id: 'sql', label: 'İlişkisel SQL', icon: Table },
        { id: 'schema', label: 'ER Şema', icon: Network },
        { id: 'vector', label: 'Vektör', icon: Database },
        { id: 'graph', label: 'Graf', icon: BarChart3 },
        { id: 'archive', label: 'Arşiv', icon: PackageOpen },
    ];

    return (
        <div className="flex flex-col h-full w-full bg-[#f8f9fa] font-sans">

            {/* ── KOMPAKT TEK SATIRLIK HEADER + TABS ── */}
            <div className="flex-none bg-white border-b border-slate-200/70">
                <div className="flex items-center px-5">

                    {/* Sol: Başlık */}
                    <div className="flex items-center gap-2 py-3 pr-6 border-r border-slate-200/60 mr-4 shrink-0">
                        <DatabaseZap size={16} className="text-[#b91d2c]" />
                        <span className="text-[13px] font-semibold text-slate-800 whitespace-nowrap">Veri Yönetimi</span>
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
                                            ? 'text-[#b91d2c]'
                                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                        }
                                    `}
                                >
                                    <tab.icon size={13} />
                                    {tab.label}
                                    {isActive && (
                                        <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#b91d2c] rounded-t-sm" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── CONTENT AREA ── */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'sql' && <SqlDatabaseViewer />}
                {activeTab === 'schema' && <SqlSchemaViewer />}
                {activeTab === 'vector' && <VectorDatabaseViewer />}
                {activeTab === 'graph' && <GraphDatabaseViewer />}
                {activeTab === 'archive' && <ArchiveDocsViewer />}
            </div>
        </div>
    );
}
