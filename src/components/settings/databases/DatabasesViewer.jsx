import React, { useState } from 'react';
import { Database, Network, Table, DatabaseZap } from 'lucide-react';

import DatabaseViewer from '../DatabaseViewer'; // Vektör (orijinal)
import VectorDatabaseViewer from './VectorDatabaseViewer'; // Ağaç görünümlü vektörDB
import SqlDatabaseViewer from '../SqlDatabaseViewer'; // SQL
import SqlSchemaViewer from './SqlSchemaViewer'; // SQL Şema
import GraphDatabaseViewer from './GraphDatabaseViewer'; // Graph

export default function DatabasesViewer() {
    const [activeTab, setActiveTab] = useState('sql');

    const tabs = [
        { id: 'sql', label: 'İlişkisel SQL (Tablolar)', icon: Table },
        { id: 'schema', label: 'SQL Şema (ER Modeli)', icon: Network },
        { id: 'vector', label: 'Vektör (Belge & Chunk)', icon: Database },
        { id: 'graph', label: 'Graf (Modeller Arası)', icon: Network },
    ];

    return (
        <div className="flex flex-col h-full w-full bg-[#f8f9fa] font-sans">
            {/* ── HEADER ── */}
            <div className="flex-none px-6 py-4 flex items-center justify-between border-b border-slate-200/60 bg-white">
                <div>
                    <h2 className="text-[14px] font-semibold text-slate-800 flex items-center gap-2">
                        <DatabaseZap className="text-[#b91d2c]" size={18} />
                        Sistem Veritabanları
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-1">İlişkisel verileri, vektör belgelerini ve graf bağlantılarını tek merkezden yönetin.</p>
                </div>
            </div>

            {/* ── TABS ── */}
            <div className="flex-none px-6 flex items-center gap-6 border-b border-slate-200/60 bg-white pt-2">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-1 pb-3 text-[12px] font-medium transition-all relative
                                ${isActive ? 'text-[#b91d2c]' : 'text-slate-500 hover:text-slate-800'}
                            `}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                            {isActive && (
                                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#b91d2c] rounded-t-md" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── CONTENT AREA ── */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'sql' && <SqlDatabaseViewer />}
                {activeTab === 'schema' && <SqlSchemaViewer />}
                {activeTab === 'vector' && <VectorDatabaseViewer />}
                {activeTab === 'graph' && <GraphDatabaseViewer />}
            </div>
        </div>
    );
}
