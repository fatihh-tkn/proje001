import { useEffect } from 'react';

const EVENT_NAME = 'archive-changed';

export function dispatchArchiveChanged() {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function useArchiveChangedListener(callback) {
    useEffect(() => {
        window.addEventListener(EVENT_NAME, callback);
        return () => window.removeEventListener(EVENT_NAME, callback);
    }, [callback]);
}
