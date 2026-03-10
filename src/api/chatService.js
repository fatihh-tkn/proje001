// Yapay zeka ile konuşacak fonksiyonlar
export const sendMessageToAI = async (message) => {
  console.log("AI'ye mesaj gönderiliyor:", message);
  try {
    const response = await fetch("http://localhost:8000/api/chat/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: message }),
    });

    if (!response.ok) {
      throw new Error(`Sunucu Hatası: ${response.status}`);
    }

    const data = await response.json();
    return { success: data.success, reply: data.reply };
  } catch (error) {
    console.error("Mesaj gönderilirken hata oluştu:", error);
    return { success: false, reply: "Bağlantı hatası: Backend çalışmıyor olabilir." };
  }
};