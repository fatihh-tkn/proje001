// Yapay zeka ile konuşacak fonksiyonlar

const BASE = "/api/chat/";
const STREAM_BASE = "/api/chat/stream";

const getDeviceId = () => {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = 'node_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
};

// ── Klasik (tek seferlik) fonksiyonlar ──────────────────────────────────────

/**
 * Düz metin mesajı gönderir (genel RAG).
 */
export const sendMessageToAI = async (message, sessionId = "default_chat") => {
  try {
    const response = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, session_id: sessionId, mac: getDeviceId() }),
    });
    if (!response.ok) throw new Error(`Sunucu Hatası: ${response.status}`);
    const data = await response.json();
    return {
      success: data.success,
      reply: data.reply,
      rag_used: data.rag_used ?? false,
      rag_sources: data.rag_sources ?? [],
    };
  } catch (error) {
    console.error("Mesaj gönderilirken hata oluştu:", error);
    return { success: false, reply: "Bağlantı hatası: Backend çalışmıyor olabilir.", rag_used: false, rag_sources: [] };
  }
};

/**
 * Belirli bir dosya üzerinde soru sorar (klasik).
 */
export const sendMessageWithFile = async (message, fileName, collectionName = null, sessionId = "default_chat") => {
  try {
    const body = { message, file_name: fileName, session_id: sessionId, mac: getDeviceId() };
    if (collectionName) body.collection_name = collectionName;

    const response = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Sunucu Hatası: ${response.status}`);
    const data = await response.json();
    return {
      success: data.success,
      reply: data.reply,
      rag_used: data.rag_used ?? false,
      rag_sources: data.rag_sources ?? [],
    };
  } catch (error) {
    console.error("Dosyalı mesaj gönderilirken hata:", error);
    return { success: false, reply: "Bağlantı hatası: Backend çalışmıyor olabilir.", rag_used: false, rag_sources: [] };
  }
};

// ── Streaming fonksiyonlar ───────────────────────────────────────────────────

/**
 * SSE stream ile yanıt alır.
 * @param {string}   message
 * @param {string}   sessionId
 * @param {object}   callbacks  - { onChunk(text), onDone({rag_used, rag_sources}), onError(text) }
 * @param {object}   fileOpts   - { fileName, collectionName } (opsiyonel)
 */
export const sendMessageStream = async (
  message,
  sessionId = "default_chat",
  { onChunk, onDone, onError } = {},
  fileOpts = null,
) => {
  try {
    const body = {
      message,
      session_id: sessionId,
      mac: getDeviceId(),
    };
    if (fileOpts?.fileName) body.file_name = fileOpts.fileName;
    if (fileOpts?.collectionName) body.collection_name = fileOpts.collectionName;

    const response = await fetch(STREAM_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      onError?.(`Sunucu Hatası: ${response.status}`);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE satırlarını işle — her olay "data: {...}\n\n" formatında
      const lines = buffer.split("\n");
      buffer = lines.pop(); // Son yarım satırı beklet

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const raw = trimmed.slice(5).trim();
        if (!raw) continue;

        try {
          const evt = JSON.parse(raw);
          if (evt.type === "chunk") onChunk?.(evt.text);
          else if (evt.type === "done") onDone?.({ rag_used: evt.rag_used, rag_sources: evt.rag_sources ?? [] });
          else if (evt.type === "error") onError?.(evt.text);
        } catch (_) { /* JSON parse hatası — yoksay */ }
      }
    }
  } catch (error) {
    console.error("Streaming sırasında hata:", error);
    onError?.("Bağlantı hatası: Backend çalışmıyor olabilir.");
  }
};
