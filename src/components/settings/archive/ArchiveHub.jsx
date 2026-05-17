import React, { useState } from 'react';
import { FileText, GitBranch, Users2 } from 'lucide-react';
import ArchiveDocsViewer from './ArchiveDocsViewer';
import AudioArchiveViewer from '../meetings/AudioArchiveViewer';
import ErrorBoundary from '../../ErrorBoundary';

const TABS = [
    {
        id: 'documents',
        label: 'Döküman',
        icon: FileText,
        description: 'PDF, Word, Excel, görsel ve diğer belgeler',
    },
    {
        id: 'workflows',
        label: 'İş Akışları',
        icon: GitBranch,
        description: 'BPMN, JSON, süreç ve otomasyon dosyaları',
    },
    {
        id: 'user-docs',
        label: 'Kullanıcı Belgeleri',
        icon: Users2,
        description: 'Ses ve video kayıtları, transkriptler',
    },
];

export default function ArchiveHub() {
    const [activeTab, setActiveTab] = useState('documents');

    return (
        <div className="flex flex-col h-full w-full bg-stone-50 font-sans overflow-hidden">

            {/* ── Sekme Çubuğu ── */}
            <div className="flex-none flex items-stretch border-b border-stone-200 bg-stone-50 px-2">
                {TABS.map(({ id, label, icon: Icon }) => {
                    const active = activeTab === id;
                    return (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`
                                relative flex items-center gap-1.5 px-3.5 py-3 text-[12px] font-black
                                border-b-2 transition-all duration-150 shrink-0
                                ${active
                                    ? 'border-[#378ADD] text-[#378ADD]'
                                    : 'border-transparent text-stone-400 hover:text-stone-600 hover:border-stone-200'
                                }
                            `}
                        >
                            <Icon size={13} className="shrink-0" />
                            <span className="tracking-[0.04em]">{label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── İçerik ── */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'documents' && (
                    <ErrorBoundary compact>
                        <ArchiveDocsViewer />
                    </ErrorBoundary>
                )}
                {activeTab === 'workflows' && (
                    <ErrorBoundary compact>
                        <ArchiveDocsViewer defaultFilter="workflow" />
                    </ErrorBoundary>
                )}
                {activeTab === 'user-docs' && (
                    <ErrorBoundary compact>
                        <AudioArchiveViewer />
                    </ErrorBoundary>
                )}
            </div>
        </div>
    );
}
