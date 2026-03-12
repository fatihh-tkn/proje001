import React, { useEffect, useRef } from 'react';
import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';

const BpmnViewerComponent = ({ url }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!url || !containerRef.current) return;

        const viewer = new BpmnViewer({
            container: containerRef.current
        });

        let resizeObserver = null;

        fetch(url)
            .then(res => res.text())
            .then(xml => viewer.importXML(xml))
            .then(() => {
                // XML yüklendikten hemen sonra diyagramı otomatik ortala ve sığdır
                const canvas = viewer.get('canvas');
                canvas.zoom('fit-viewport', 'auto');

                // Konteyner boyutu değiştiğinde otomatik olarak yeniden boyutlandır ve ortala
                resizeObserver = new ResizeObserver(() => {
                    canvas.zoom('fit-viewport', 'auto');
                });
                if (containerRef.current) {
                    resizeObserver.observe(containerRef.current);
                }
            })
            .catch(err => console.error("BPMN Loading Error: ", err));

        return () => {
            if (resizeObserver) resizeObserver.disconnect();
            viewer.destroy();
        };
    }, [url]);

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-transparent overflow-hidden flex-1 cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => e.stopPropagation()} // Dragging ile çakışmaması için
        />
    );
};

export default BpmnViewerComponent;
