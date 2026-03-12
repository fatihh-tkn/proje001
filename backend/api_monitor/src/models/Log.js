import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  timestamp: { type: Date, default: Date.now, index: true },
  projectId: { type: String, required: true, index: true },
  environment: { type: String, default: 'production' },

  // Provider bilgileri
  provider: { type: String, required: true, index: true },
  model: { type: String, required: true, index: true },

  // Request & Response content
  prompt: { type: String },
  response: { type: String },

  // Token kullanımı
  promptTokens: { type: Number, default: 0 },
  completionTokens: { type: Number, default: 0 },
  totalTokens: { type: Number, default: 0 },

  // Performans
  duration: { type: Number, required: true }, // milliseconds

  // Sonuç
  status: { type: String, enum: ['success', 'error', 'failed'], required: true, index: true },
  statusCode: { type: Number },
  error: { type: mongoose.Schema.Types.Mixed },

  // Maliyet
  cost: { type: Number, default: 0 },

  // Metadata
  metadata: { type: mongoose.Schema.Types.Mixed },

  // Streaming flag
  streaming: { type: Boolean, default: false },
}, {
  timestamps: true,
  collection: 'llm_logs'
});

// Compound indexes for common queries
logSchema.index({ projectId: 1, timestamp: -1 });
logSchema.index({ provider: 1, model: 1, timestamp: -1 });
logSchema.index({ status: 1, timestamp: -1 });

export const Log = mongoose.model('Log', logSchema);
