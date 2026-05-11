import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import InlineTopologyOverview from './orchestrator/InlineTopologyOverview';
import ConversationTraceTab from './orchestrator/ConversationTraceTab';
import { DEFAULT_AGENTS } from './orchestrator/constants';

class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError() { return { hasError: true }; }
    render() {
        if (this.state.hasError) return <div className="p-8 text-red-500 text-sm">Render hatası.</div>;
        return this.props.children;
    }
}

const AUDIO_EXTS = ['mp3','wav','ogg','m4a','flac','aac','opus','wma','mp4','avi','mov','mkv','webm','m4v','wmv'];

export default function TopologyViewer({ defaultView = 'diagram' }) {
    const [agents, setAgents] = useState(DEFAULT_AGENTS);
    const [fetchedFiles, setFetchedFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const viewMode = defaultView; // 'diagram' | 'logs'
    const [selectedItemId, setSelectedItemId] = useState('sys_node_aggregator');

    useEffect(() => {
        Promise.all([
            fetch('/api/orchestrator/agents').then(r => r.ok ? r.json() : []),
            fetch('/api/archive/list').then(r => r.ok ? r.json() : {}),
        ]).then(([agentData, fileData]) => {
            if (agentData?.length) setAgents(agentData);
            if (fileData?.items) setFetchedFiles(fileData.items);
        }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const rags = React.useMemo(() => {
        const rag1 = { id: 'rag_1', type: 'rag', name: 'Resmi Belgeler Öz Havuzu', files: [] };
        const rag2 = { id: 'rag_2', type: 'rag', name: 'Canlı Toplantılar', files: [] };
        fetchedFiles.forEach(f => {
            if (f.file_type === 'folder') return;
            const ext = (f.file_type || '').toLowerCase().replace('.', '');
            (AUDIO_EXTS.includes(ext) ? rag2 : rag1).files.push(f);
        });
        return [rag1, rag2];
    }, [fetchedFiles]);

    const selectedItem = agents.find(a => a.id === selectedItemId) || agents[0];

    if (loading) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-white gap-3">
                <Loader2 size={28} className="text-[#378ADD] animate-spin" />
                <p className="text-[12px] font-bold text-stone-400 animate-pulse">Topoloji yükleniyor…</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col bg-white select-none animate-in fade-in duration-300 overflow-hidden">
            <div className="flex-1 relative overflow-hidden">
                {viewMode === 'diagram' && selectedItem && (
                    <ErrorBoundary>
                        <InlineTopologyOverview
                            agent={selectedItem}
                            allAgents={agents}
                            rags={rags}
                            onOpenPayload={() => {}}
                        />
                    </ErrorBoundary>
                )}
                {viewMode === 'logs' && (
                    <div className="w-full h-full overflow-hidden bg-stone-50 animate-in fade-in duration-300">
                        <ErrorBoundary>
                            <ConversationTraceTab />
                        </ErrorBoundary>
                    </div>
                )}
            </div>
        </div>
    );
}
