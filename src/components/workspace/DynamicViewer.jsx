import React, { Suspense, lazy } from 'react';
import { Loader2, Activity } from 'lucide-react';

const BpmnViewer = lazy(() => import('../viewers/BpmnViewer'));
const PdfViewer = lazy(() => import('../viewers/PdfViewer'));
const DocxViewer = lazy(() => import('../viewers/DocxViewer'));
const ExcelViewer = lazy(() => import('../viewers/ExcelViewer'));
const DatabasesViewer = lazy(() => import('../settings/databases/DatabasesViewer'));
const DatabaseViewer = lazy(() => import('../settings/DatabaseViewer'));
const ApiUsageViewer = lazy(() => import('../settings/ai/ApiUsageViewer'));

const ArchiveDocsViewer = lazy(() => import('../settings/archive/ArchiveDocsViewer'));
const ImageViewer = lazy(() => import('../viewers/ImageViewer'));
const N8nViewer = lazy(() => import('../settings/n8n/N8nViewer'));
const AiOrchestratorViewer = lazy(() => import('../settings/ai/AiOrchestratorViewer'));
const MeetingUploadViewer = lazy(() => import('../settings/meetings/MeetingUploadViewer'));

export const DynamicViewer = ({ tab }) => {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center w-full h-full text-slate-400">
                <Loader2 size={32} className="animate-spin mb-3 text-teal-500" />
                <p className="text-sm">Görüntüleyici Modül Yükleniyor...</p>
            </div>
        }>
            {tab.type === 'bpmn' && <BpmnViewer url={tab.url} title={tab.title} />}
            {(tab.type === 'pdf' || tab.type === 'pptx' || tab.type === 'ppt') && (
                <PdfViewer
                    url={tab.url}
                    title={tab.title}
                    initialPage={tab.meta?.page ? Number(tab.meta.page) : undefined}
                    highlightPage={tab.meta?.highlightPage ? Number(tab.meta.highlightPage) : undefined}
                    highlightBbox={tab.meta?.bbox || undefined}
                />
            )}

            {(tab.type === 'doc' || tab.type === 'docx') && <DocxViewer url={tab.url} title={tab.title} />}
            {(tab.type === 'xls' || tab.type === 'xlsx') && <ExcelViewer url={tab.url} title={tab.title} />}
            {tab.type === 'databases-viewer' && <DatabasesViewer />}
            {tab.type === 'database' && <DatabaseViewer />}
            {tab.type === 'api-usage' && <ApiUsageViewer />}
            {tab.type === 'archive-docs' && <ArchiveDocsViewer />}
            {tab.type === 'image-viewer' && <ImageViewer url={tab.url} title={tab.title} bbox={tab.meta?.bbox} />}
            {tab.type === 'n8n' && <N8nViewer />}
            {tab.type === 'ai-orchestrator' && <AiOrchestratorViewer defaultAgentId={tab.defaultAgentId} />}
            {tab.type === 'meetings' && <MeetingUploadViewer />}

            {tab.type !== 'meetings' && tab.type !== 'ai-orchestrator' && tab.type !== 'n8n' && tab.type !== 'image-viewer' && tab.type !== 'auth' && tab.type !== 'archive-docs' && tab.type !== 'api-usage' && tab.type !== 'database' && tab.type !== 'databases-viewer' && tab.type !== 'bpmn' && tab.type !== 'pdf' && tab.type !== 'pptx' && tab.type !== 'ppt' && tab.type !== 'docx' && tab.type !== 'doc' && tab.type !== 'xls' && tab.type !== 'xlsx' && (
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
