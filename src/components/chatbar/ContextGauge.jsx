import React from 'react';

const RADIUS = 9;
const STROKE = 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SIZE = (RADIUS + STROKE) * 2;

function gaugeColor(ratio) {
    if (ratio >= 1)   return '#DC2626'; // tam dolu — kırmızı
    if (ratio >= 0.8) return '#F59E0B'; // %80+ — sarı
    if (ratio >= 0.5) return '#378ADD'; // %50+ — mavi
    return '#A8A69E';                   // düşük — gri
}

export default function ContextGauge({ currentTurns, maxTurns, onCompact, isCompacting }) {
    if (!maxTurns || maxTurns === 0 || currentTurns === 0) return null;

    const ratio   = Math.min(currentTurns / maxTurns, 1);

    if (ratio < 0.5) return null;
    const offset  = CIRCUMFERENCE * (1 - ratio);
    const color   = gaugeColor(ratio);
    const isFull  = ratio >= 1;

    return (
        <button
            type="button"
            onClick={onCompact}
            disabled={isCompacting || currentTurns === 0}
            title={
                isCompacting
                    ? 'Özetleniyor…'
                    : currentTurns === 0
                        ? 'Henüz konuşma yok'
                        : `${currentTurns}/${maxTurns} tur — tıkla, şimdi özetle`
            }
            className="relative flex items-center justify-center shrink-0 focus:outline-none disabled:cursor-default group"
            style={{ width: SIZE, height: SIZE }}
        >
            <svg width={SIZE} height={SIZE} className="-rotate-90">
                {/* arka plan halkası */}
                <circle
                    cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
                    fill="none"
                    stroke="#E7E5E1"
                    strokeWidth={STROKE}
                />
                {/* doluluk yayı */}
                <circle
                    cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
                    fill="none"
                    stroke={color}
                    strokeWidth={STROKE}
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease' }}
                />
            </svg>

            {/* merkez içerik */}
            {isCompacting && (
                <span className="absolute inset-0 flex items-center justify-center">
                    <svg className="animate-spin" width={8} height={8} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5}>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                </span>
            )}

            {/* tam dolduğunda nabız efekti */}
            {isFull && !isCompacting && (
                <span
                    className="absolute inset-0 rounded-full animate-ping opacity-30"
                    style={{ backgroundColor: color }}
                />
            )}
        </button>
    );
}
