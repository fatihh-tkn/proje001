import React, { Suspense, lazy } from 'react';
import { Loader2, Activity } from 'lucide-react';

const BpmnViewer = lazy(() => import('../viewers/BpmnViewer'));
const PdfViewer = lazy(() => import('../viewers/PdfViewer'));
const DocxViewer = lazy(() => import('../viewers/DocxViewer'));
const ExcelViewer = lazy(() => import('../viewers/ExcelViewer'));
const DatabaseViewer = lazy(() => import('../settings/DatabaseViewer'));
const ApiUsageViewer = lazy(() => import('../settings/ApiUsageViewer'));

export const DynamicViewer = ({ tab }) => {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center w-full h-full text-slate-400">
                <Loader2 size={32} className="animate-spin mb-3 text-teal-500" />
                <p className="text-sm">Görüntüleyici Modül Yükleniyor...</p>
            </div>
        }>
            {tab.type === 'bpmn' && <BpmnViewer url={tab.url} title={tab.title} />}
            {tab.type === 'pdf' && <PdfViewer url={tab.url} title={tab.title} />}
            {(tab.type === 'doc' || tab.type === 'docx') && <DocxViewer url={tab.url} title={tab.title} />}
            {(tab.type === 'xls' || tab.type === 'xlsx') && <ExcelViewer url={tab.url} title={tab.title} />}
            {tab.type === 'database' && <DatabaseViewer />}
            {tab.type === 'api-usage' && <ApiUsageViewer />}

            {tab.type !== 'api-usage' && tab.type !== 'database' && tab.type !== 'bpmn' && tab.type !== 'pdf' && tab.type !== 'docx' && tab.type !== 'doc' && tab.type !== 'xls' && tab.type !== 'xlsx' && (
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
