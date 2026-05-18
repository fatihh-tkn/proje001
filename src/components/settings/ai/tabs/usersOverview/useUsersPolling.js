import { useState, useCallback, useEffect } from 'react';
import { fetchWithTimeout } from '../../utils';

const POLL_MS = 10_000;
const AUTH_BASE = '/api/auth';
const API_BASE_PCS = '/api';

/**
 * useUsersPolling
 *
 * Kullanıcı listesini ve PC/oturum verilerini periyodik olarak çeker.
 * Döndürülen `fetchAll` fonksiyonu manuel yenileme için de kullanılabilir.
 */
export function useUsersPolling() {
    const [users, setUsers] = useState([]);
    const [pcs, setPcs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        try {
            const [uRes, pRes] = await Promise.all([
                fetchWithTimeout(`${AUTH_BASE}/users`),
                fetchWithTimeout(`${API_BASE_PCS}/pcs`),
            ]);
            const [uData, pData] = await Promise.all([uRes.json(), pRes.json()]);
            setUsers(uData || []);
            setPcs(pData.pcs || []);
        } catch (e) {
            console.error('Fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
        const t = setInterval(fetchAll, POLL_MS);
        return () => clearInterval(t);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return { users, setUsers, pcs, loading, fetchAll };
}
