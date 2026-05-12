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
const TopologyViewer = lazy(() => import('../settings/ai/TopologyViewer'));
const ModelsTab = lazy(() => import('../settings/ai/tabs/ModelsTab').then(m => ({ default: m.ModelsTab })));
const LogsTab = lazy(() => import('../settings/ai/tabs/LogsTab').then(m => ({ default: m.LogsTab })));
const MonitoringTab = lazy(() => import('../settings/ai/tabs/MonitoringTab').then(m => ({ default: m.MonitoringTab })));
const UsersOverviewTab = lazy(() => import('../settings/ai/tabs/UsersOverviewTab').then(m => ({ default: m.UsersOverviewTab })));
const MeetingUploadViewer = lazy(() => import('../settings/meetings/MeetingUploadViewer'));
const ToplantılarViewer = lazy(() => import('../settings/meetings/ToplantılarViewer'));
const SüreçlerViewer = lazy(() => import('../settings/processes/SüreçlerViewer'));
const BelgelerViewer = lazy(() => import('../settings/archive/BelgelerViewer'));
const KişiselViewer  = lazy(() => import('../settings/archive/KişiselViewer'));
const TeknikResimViewer = lazy(() => import('../settings/archive/TeknikResimViewer'));
const AuthViewer = lazy(() => import('../settings/auth/AuthViewer'));
const TalepYonetimViewer = lazy(() => import('../settings/talepler/TalepYonetimViewer'));
const ErrorManagementViewer = lazy(() => import('../settings/errors/ErrorManagementViewer'));
const MyResolvedErrorsViewer = lazy(() => import('../settings/errors/MyResolvedErrorsViewer'));
const MyRequestsViewer = lazy(() => import('../settings/talepler/MyRequestsViewer'));
const RestrictionsViewer = lazy(() => import('../settings/restrictions/RestrictionsViewer'));
const PcSessionsViewer = lazy(() => import('../settings/ai/tabs/PcSessionsViewer').then(m => ({ default: m.PcSessionsViewer })));
const VectorHealthPanel = lazy(() => import('../settings/databases/VectorHealthPanel'));
const FileWatcherPanel  = lazy(() => import('../settings/database/FileWatcherPanel'));

export const DynamicViewer = ({ tab, onOpenFile }) => {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center w-full h-full text-slate-400">
                <Loader2 size={32} className="animate-spin mb-3 text-teal-500" />
                <p className="text-sm">Görüntüleyici Modül Yükleniyor...</p>
            </div>
        }>
            {tab.type === 'bpmn' && <BpmnViewer url={tab.url} title={tab.title} elementId={tab.meta?.elementId || null} />}
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
            {tab.type === 'databases-viewer' && <DatabasesViewer defaultTab={tab.meta?.defaultTab || 'sql'} archiveSection={tab.meta?.archiveSection} />}
            {tab.type === 'database' && <DatabaseViewer onOpenFile={onOpenFile} />}
            {tab.type === 'api-usage' && <ApiUsageViewer />}
            {tab.type === 'archive-docs' && <ArchiveDocsViewer />}
            {(['image-viewer','png','jpg','jpeg','webp','bmp','gif','tiff'].includes(tab.type)) && (
                <ImageViewer
                    url={tab.url}
                    title={tab.title}
                    bbox={tab.meta?.bbox}
                    docId={tab.meta?.docId || (tab.id?.startsWith('archive_') ? tab.id.replace('archive_', '') : null)}
                />
            )}
            {tab.type === 'n8n' && <N8nViewer />}
            {tab.type === 'ai-orchestrator' && <AiOrchestratorViewer defaultAgentId={tab.defaultAgentId} defaultMainTab={tab.meta?.defaultMainTab} onOpenFile={onOpenFile} />}
            {tab.type === 'topology-viewer' && <TopologyViewer defaultView={tab.meta?.defaultView} />}
            {tab.type === 'api-keys' && <ModelsTab />}
            {tab.type === 'api-logs' && <LogsTab />}
            {tab.type === 'api-monitoring' && <MonitoringTab />}
            {tab.type === 'api-users' && <UsersOverviewTab />}
            {tab.type === 'meetings' && <MeetingUploadViewer />}
            {tab.type === 'toplantilar-viewer' && <ToplantılarViewer />}
            {tab.type === 'surecler-viewer'   && <SüreçlerViewer />}
            {tab.type === 'belgeler-viewer'   && <BelgelerViewer />}
            {tab.type === 'kisisel-viewer'    && <KişiselViewer />}
            {tab.type === 'teknik-resim-viewer' && <TeknikResimViewer onOpenFile={onOpenFile} />}
            {tab.type === 'auth' && <AuthViewer />}
            {tab.type === 'auth-users' && <AuthViewer defaultTab="users" />}
            {tab.type === 'auth-egitim' && <AuthViewer defaultTab="egitim_yonetimi" />}
            {tab.type === 'talep-yonetim' && <TalepYonetimViewer />}
            {tab.type === 'error-management' && <ErrorManagementViewer currentUser={tab.meta?.currentUser} />}
            {tab.type === 'my-errors' && <MyResolvedErrorsViewer currentUser={tab.meta?.currentUser} />}
            {tab.type === 'my-requests' && <MyRequestsViewer currentUser={tab.meta?.currentUser} />}
            {tab.type === 'restrictions' && <RestrictionsViewer />}
            {tab.type === 'pc-sessions' && <PcSessionsViewer />}
            {tab.type === 'vector-health' && <VectorHealthPanel />}
            {tab.type === 'file-watcher'  && <FileWatcherPanel  />}
            {tab.type === 'coming-soon' && (
                <div className="flex flex-col items-center justify-center w-full h-full text-center select-none">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-stone-100 border border-stone-200 mb-5">
                        <Activity size={28} className="text-stone-400" />
                    </div>
                    <span className="text-[10px] font-black tracking-[0.22em] text-[#378ADD] uppercase mb-2">YAKINDA</span>
                    <h3 className="text-xl font-semibold text-stone-800 mb-1">{tab.title}</h3>
                    <p className="text-sm text-stone-400 max-w-xs">Bu özellik henüz geliştirme aşamasında. Kısa süre içinde kullanıma sunulacak.</p>
                </div>
            )}

            {tab.type !== 'auth-egitim' && tab.type !== 'auth-users' && tab.type !== 'api-users' && tab.type !== 'api-monitoring' && tab.type !== 'api-logs' && tab.type !== 'api-keys' && tab.type !== 'restrictions' && tab.type !== 'pc-sessions' && tab.type !== 'vector-health' && tab.type !== 'file-watcher' && tab.type !== 'meetings' && tab.type !== 'toplantilar-viewer' && tab.type !== 'surecler-viewer' && tab.type !== 'belgeler-viewer' && tab.type !== 'kisisel-viewer' && tab.type !== 'teknik-resim-viewer' && tab.type !== 'ai-orchestrator' && tab.type !== 'n8n' && tab.type !== 'image-viewer' && tab.type !== 'auth' && tab.type !== 'talep-yonetim' && tab.type !== 'archive-docs' && tab.type !== 'api-usage' && tab.type !== 'database' && tab.type !== 'databases-viewer' && tab.type !== 'error-management' && tab.type !== 'my-errors' && tab.type !== 'my-requests' && tab.type !== 'coming-soon' && tab.type !== 'bpmn' && tab.type !== 'pdf' && tab.type !== 'pptx' && tab.type !== 'ppt' && tab.type !== 'docx' && tab.type !== 'doc' && tab.type !== 'xls' && tab.type !== 'xlsx' && (
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
