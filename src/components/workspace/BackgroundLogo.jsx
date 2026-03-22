import React from 'react';
import FullLogoImage from '../../assets/logo-acik.png';
import { useBackendStatus } from '../../hooks/useBackendStatus';

export const BackgroundLogo = () => {
    const { isOnline, progress } = useBackendStatus();

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
            <div className="relative w-[70%] max-w-[800px] aspect-video flex items-center justify-center transition-all duration-500">
                {/* Alt Katman: Soluk Gri Base */}
                <img
                    src={FullLogoImage}
                    alt="Yılgenci Base Logo"
                    className={`absolute inset-0 w-full h-full object-contain workspace-base-logo transition-all duration-1000 ease-in-out ${
                        isOnline
                            ? 'opacity-5 grayscale scale-100'
                            : 'opacity-[0.03] grayscale brightness-50 scale-100'
                    }`}
                />

                {/* Üst Katman: Dolan Ön Dolgu (Maskeleme ile) */}
                {!isOnline && (
                    <img
                        src={FullLogoImage}
                        alt="Yılgenci Progress Logo"
                        className="absolute inset-0 w-full h-full object-contain opacity-40 transition-all duration-[100ms] ease-linear"
                        style={{
                            clipPath: `inset(0% ${Math.max(0, 100 - (progress * 1.15))}% 0% 0%)`,
                            filter: 'saturate(1.2) brightness(0.9)',
                        }}
                    />
                )}
            </div>
        </div>
    );
};
