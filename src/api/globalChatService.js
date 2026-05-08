const BASE = '/api/global-chat';

export async function fetchChannels() {
    const res = await fetch(`${BASE}/kanallar`);
    if (!res.ok) throw new Error('Kanallar alınamadı');
    return res.json();
}

export async function createChannel(name, description = '') {
    const res = await fetch(`${BASE}/kanallar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Kanal oluşturulamadı');
    }
    return res.json();
}

export async function fetchMessages(channelId, limit = 80, before = null) {
    let url = `${BASE}/mesajlar/${channelId}?limit=${limit}`;
    if (before) url += `&before=${encodeURIComponent(before)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Mesajlar alınamadı');
    return res.json();
}

export async function deleteMessage(messageId, userId) {
    const res = await fetch(`${BASE}/mesajlar/${messageId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
    });
    return res.ok;
}

export function buildWsUrl(channelId, userId, userName) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const base  = `${proto}//${window.location.host}`;
    const params = new URLSearchParams({
        user_id:   userId   || '',
        user_name: userName || 'Kullanıcı',
    });
    return `${base}/api/global-chat/ws/${channelId}?${params}`;
}
