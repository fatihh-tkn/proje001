// Yapay zeka ile konuşacak fonksiyonlar

const BASE = "http://localhost:8000/api/chat/";

/**
 * Düz metin mesajı gönderir (genel RAG).
 */
export const sendMessageToAI = async (message) => {
  try {
    const response = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
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
 * Belirli bir dosya üzerinde soru sorar.
 * fileName: sürüklenen dosyanın adı (ör. "rapor.pdf")
 * collectionName: ChromaDB koleksiyonu (opsiyonel)
 */
export const sendMessageWithFile = async (message, fileName, collectionName = null) => {
  try {
    const body = { message, file_name: fileName };
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