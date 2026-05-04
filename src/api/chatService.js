// Yapay zeka ile konuşacak fonksiyonlar

const BASE = "/api/chat/";
const STREAM_BASE = "/api/chat/stream";

/**
 * PC parmak izi — localStorage'da kalıcı, aynı tarayıcı profili = aynı PC.
 * Farklı bilgisayarlarda farklı localStorage → farklı PC tanınır.
 */
const getPcFingerprint = () => {
  let fp = localStorage.getItem('_pc_fp');
  if (!fp) {
    fp = 'pc_' + Math.random().toString(36).substr(2, 12);
    localStorage.setItem('_pc_fp', fp);
  }
  return fp;
};

/**
 * Sekme token'ı — sessionStorage'da, her sekme/pencere ayrı oturum.
 * Sekme kapanınca düşer → backend idle cleanup ile aktif_mi=False yapılır.
 */
const getTabToken = () => {
  let tok = sessionStorage.getItem('_tab_tok');
  if (!tok) {
    tok = 'tab_' + Math.random().toString(36).substr(2, 12);
    sessionStorage.setItem('_tab_tok', tok);
  }
  return tok;
};

/** Eski kod uyumu için (mac alanı artık pc_id'yi taşıyor) */
const getDeviceId = getPcFingerprint;

// ── Klasik (tek seferlik) fonksiyonlar ──────────────────────────────────────

/**
 * Düz metin mesajı gönderir (genel RAG).
 */
export const sendMessageToAI = async (message, sessionId = "default_chat") => {
  try {
    const response = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        session_id: sessionId,
        mac: getPcFingerprint(),
        pc_id: getPcFingerprint(),
        tab_id: getTabToken(),
      }),
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
    const body = {
      message,
      file_name: fileName,
      session_id: sessionId,
      mac: getPcFingerprint(),
      pc_id: getPcFingerprint(),
      tab_id: getTabToken(),
    };
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
 *
 * Klasik (eski) akış event türleri: chunk, replace, done, error.
 * LangGraph (yeni) akışı bunlara ek olarak şunları yayar:
 *   - progress    {node, phase, elapsed_ms, intent?, plan?, reasoning?}
 *   - sources     {items: [...], score}
 *   - ui_action   {action: {...}}
 *   - n8n_action  {action: {workflow, status, detail}}
 *   - node_error  {node, text}
 * Bu event'ler için ilgili callback'ler opsiyonel; verilmezse sessizce yutulur.
 *
 * @param {string}   message
 * @param {string}   sessionId
 * @param {string|null} userId
 * @param {object}   callbacks  - {
 *      onChunk(text), onReplace(text),
 *      onDone({rag_used, rag_sources, ui_action, model, ...}),
 *      onError(text), onAbort(),
 *      onProgress({node, elapsed_ms, intent, plan, reasoning}),
 *      onSources({items, score}),
 *      onUiAction({action}), onN8nAction({action}),
 *      onNodeError({node, text})
 *   }
 * @param {object}   fileOpts   - { fileName, collectionName } (opsiyonel)
 */
export const sendMessageStream = async (
  message,
  sessionId = "default_chat",
  userId = null,
  {
    onChunk, onReplace, onDone, onError, onAbort,
    onProgress, onSources, onUiAction, onN8nAction, onNodeError,
  } = {},
  fileOpts = null,
  commandOpts = null,
  signal = null,
) => {
  try {
    const body = {
      message,
      session_id: sessionId,
      mac: getPcFingerprint(),
      pc_id: getPcFingerprint(),
      tab_id: getTabToken(),
    };
    if (userId) body.user_id = userId;
    if (fileOpts?.fileName) body.file_name = fileOpts.fileName;
    if (fileOpts?.fileNames?.length) body.file_names = fileOpts.fileNames;
    if (fileOpts?.collectionName) body.collection_name = fileOpts.collectionName;
    if (commandOpts?.commandId) body.command = commandOpts.commandId;

    const response = await fetch(STREAM_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });

    // 429 = oturum limiti aşıldı
    if (response.status === 429) {
      const err = await response.json().catch(() => ({}));
      onError?.(err.detail || "Bu bilgisayarda en fazla 5 eşzamanlı oturum açılabilir.");
      return;
    }

    if (!response.ok) {
      onError?.(`Sunucu Hatası: ${response.status}`);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    // Kullanıcı durdur butonuna basarsa reader'ı kapat — okuma döngüsü düşer.
    const onSignalAbort = () => {
      try { reader.cancel(); } catch (_) { /* yok say */ }
    };
    if (signal) {
      if (signal.aborted) onSignalAbort();
      else signal.addEventListener('abort', onSignalAbort, { once: true });
    }

    try {
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
            switch (evt.type) {
              case "chunk":
                onChunk?.(evt.text);
                break;
              case "replace":
                onReplace?.(evt.text);
                break;
              case "done":
                onDone?.({
                  rag_used: evt.rag_used,
                  rag_sources: evt.rag_sources ?? [],
                  ui_action: evt.ui_action ?? null,
                  model: evt.model ?? null,
                  provider: evt.provider ?? null,
                  prompt_tokens: evt.prompt_tokens ?? 0,
                  completion_tokens: evt.completion_tokens ?? 0,
                  duration_ms: evt.duration_ms ?? 0,
                  // LangGraph telemetrisi (klasik akışta yok, undefined kalır)
                  intent: evt.intent ?? null,
                  nodes_executed: evt.nodes_executed ?? null,
                  node_timings: evt.node_timings ?? null,
                });
                break;
              case "error":
                onError?.(evt.text);
                break;
              // ── LangGraph akışı ────────────────────────────────────
              case "progress":
                onProgress?.({
                  node: evt.node,
                  phase: evt.phase,
                  elapsed_ms: evt.elapsed_ms,
                  intent: evt.intent,
                  plan: evt.plan,
                  reasoning: evt.reasoning,
                });
                break;
              case "sources":
                onSources?.({ items: evt.items ?? [], score: evt.score ?? 0 });
                break;
              case "ui_action":
                onUiAction?.({ action: evt.action ?? null });
                break;
              case "n8n_action":
                onN8nAction?.({ action: evt.action ?? null });
                break;
              case "node_error":
                onNodeError?.({ node: evt.node, text: evt.text });
                break;
              default:
                /* bilinmeyen tip — yoksay */
                break;
            }
          } catch (_) { /* JSON parse hatası — yoksay */ }
        }
      }
    } finally {
      if (signal) signal.removeEventListener?.('abort', onSignalAbort);
    }

    if (signal?.aborted) onAbort?.();
  } catch (error) {
    if (error?.name === 'AbortError' || signal?.aborted) {
      onAbort?.();
      return;
    }
    console.error("Streaming sırasında hata:", error);
    onError?.("Bağlantı hatası: Backend çalışmıyor olabilir.");
  }
};
