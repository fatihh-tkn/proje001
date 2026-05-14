// src/components/settings/parts-time/DrawingThumb.jsx
// Teknik çizim placeholder thumbnail'ı. Çizim eşleşmediyse uyarı yer tutucusu.
import React from 'react';
import { FileQuestion } from 'lucide-react';
import { DRAWING_SHAPES } from './constants';

export default function DrawingThumb({ shape, size = 56, className = '' }) {
    const svg = shape && DRAWING_SHAPES[shape];
    if (!svg) {
        return (
            <div
                className={`flex flex-col items-center justify-center bg-amber-50 border border-dashed border-amber-300 rounded text-amber-600 ${className}`}
                style={{ width: size, height: Math.round(size * 0.8) }}
            >
                <FileQuestion size={Math.round(size * 0.32)} strokeWidth={1.6} />
            </div>
        );
    }
    return (
        <div
            className={`flex items-center justify-center bg-white border border-stone-200 rounded ${className}`}
            style={{ width: size, height: Math.round(size * 0.8) }}
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}
