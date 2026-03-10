import React, { useEffect, useRef } from 'react';
import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';

const BpmnViewerComponent = ({ url }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!url || !containerRef.current) return;

        const viewer = new BpmnViewer({
            container: containerRef.current
        });

        fetch(url)
            .then(res => res.text())
            .then(xml => viewer.importXML(xml))
            .then(() => {
                // XML yüklendikten hemen sonra diyagramı otomatik ortala ve sığdır
                const canvas = viewer.get('canvas');
                canvas.zoom('fit-viewport', 'auto');
            })
            .catch(err => console.error("BPMN Loading Error: ", err));

        return () => {
            viewer.destroy();
        };
    }, [url]);

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-white overflow-hidden flex-1 cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => e.stopPropagation()} // Dragging ile çakışmaması için
        />
    );
};

export default BpmnViewerComponent;
