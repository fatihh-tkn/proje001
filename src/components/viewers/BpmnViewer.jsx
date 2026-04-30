import React, { useEffect, useRef } from 'react';
import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';

const HIGHLIGHT_STYLE = `
.bjs-powered-by { display: none !important; }

.bpmn-highlight-element .djs-visual > :is(rect, circle, polygon, path) {
    stroke: #f59e0b !important;
    stroke-width: 3px !important;
    fill: rgba(245, 158, 11, 0.18) !important;
    filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.7));
    animation: bpmn-pulse 1.4s ease-in-out 3;
}
@keyframes bpmn-pulse {
    0%   { filter: drop-shadow(0 0 4px rgba(245,158,11,0.5)); }
    50%  { filter: drop-shadow(0 0 12px rgba(245,158,11,0.95)); }
    100% { filter: drop-shadow(0 0 4px rgba(245,158,11,0.5)); }
}
`;

const BpmnViewerComponent = ({ url, elementId }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!url || !containerRef.current) return;

        // Highlight CSS'i bir kez ekle
        if (!document.getElementById('bpmn-highlight-style')) {
            const style = document.createElement('style');
            style.id = 'bpmn-highlight-style';
            style.textContent = HIGHLIGHT_STYLE;
            document.head.appendChild(style);
        }

        const viewer = new BpmnViewer({ container: containerRef.current });
        let resizeObserver = null;

        fetch(url)
            .then(res => res.text())
            .then(xml => viewer.importXML(xml))
            .then(() => {
                const canvas = viewer.get('canvas');

                if (elementId) {
                    // Elementi highlight et
                    try {
                        canvas.addMarker(elementId, 'bpmn-highlight-element');
                    } catch (_) { /* element bulunamadı — sessizce geç */ }

                    // Elementi merkeze al ve yakınlaştır
                    try {
                        const elementRegistry = viewer.get('elementRegistry');
                        const el = elementRegistry.get(elementId);
                        if (el) {
                            canvas.zoom('fit-viewport', 'auto');
                            // Elementin merkezine scroll
                            const { x, y, width, height } = el;
                            const cx = x + width / 2;
                            const cy = y + height / 2;
                            canvas.scroll({ dx: 0, dy: 0 }); // reset
                            // Yakınlaştır: canvas zoom to element
                            const vbox = canvas.viewbox();
                            const targetZoom = Math.min(1.0, Math.max(0.5, 350 / Math.max(width, height)));
                            canvas.viewbox({
                                x: cx - (vbox.outer.width / targetZoom) / 2,
                                y: cy - (vbox.outer.height / targetZoom) / 2,
                                width:  vbox.outer.width  / targetZoom,
                                height: vbox.outer.height / targetZoom,
                            });
                        } else {
                            canvas.zoom('fit-viewport', 'auto');
                        }
                    } catch (_) {
                        canvas.zoom('fit-viewport', 'auto');
                    }
                } else {
                    canvas.zoom('fit-viewport', 'auto');
                }

                resizeObserver = new ResizeObserver(() => {
                    if (!elementId) canvas.zoom('fit-viewport', 'auto');
                });
                if (containerRef.current) {
                    resizeObserver.observe(containerRef.current);
                }
            })
            .catch(err => console.error('BPMN Loading Error:', err));

        return () => {
            if (resizeObserver) resizeObserver.disconnect();
            viewer.destroy();
        };
    }, [url, elementId]);

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-transparent overflow-hidden flex-1 cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => e.stopPropagation()}
        />
    );
};

export default BpmnViewerComponent;
