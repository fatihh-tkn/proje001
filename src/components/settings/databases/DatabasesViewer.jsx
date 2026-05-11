import React from 'react';

import VectorDatabaseViewer from './VectorDatabaseViewer';
import SqlDatabaseViewer from '../SqlDatabaseViewer';
import GraphDatabaseViewer from './GraphDatabaseViewer';
import ArchiveDocsViewer from '../archive/ArchiveDocsViewer';
import AudioArchiveViewer from '../meetings/AudioArchiveViewer';
import ErrorBoundary from '../../ErrorBoundary';

export default function DatabasesViewer({ defaultTab = 'sql', archiveSection }) {
    if (defaultTab === 'vector') return <VectorDatabaseViewer />;
    if (defaultTab === 'graph')  return <ErrorBoundary compact><GraphDatabaseViewer /></ErrorBoundary>;
    if (defaultTab === 'archive') {
        if (archiveSection === 'workflows') return <ArchiveDocsViewer defaultFilter="workflow" />;
        if (archiveSection === 'meetings' || archiveSection === 'user-docs') return <AudioArchiveViewer />;
        return <ArchiveDocsViewer />;
    }
    return <SqlDatabaseViewer />;
}
