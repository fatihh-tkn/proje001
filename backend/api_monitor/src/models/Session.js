import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
    // Temel Bilgiler
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    projectId: { type: String, required: true, index: true },

    // LLM Bilgileri
    provider: { type: String },
    model: { type: String },

    // Zaman Bilgileri
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    lastActivity: { type: Date, default: Date.now },

    // Mesajlar
    messages: [{
        id: String,
        timestamp: Date,
        role: { type: String, enum: ['user', 'assistant', 'system'] },
        content: String,
        promptTokens: Number,
        completionTokens: Number,
        cost: Number,
        duration: Number
    }],

    // Özet Metrikler
    totalTokens: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    totalDuration: { type: Number, default: 0 },
    messageCount: { type: Number, default: 0 },

    // Durum
    status: {
        type: String,
        enum: ['active', 'completed', 'abandoned'],
        default: 'active',
        index: true
    },

    // Ek Bilgiler
    metadata: { type: mongoose.Schema.Types.Mixed }
}, {
    timestamps: true,
    collection: 'llm_sessions'
});

// Compound indexes for common queries
sessionSchema.index({ projectId: 1, startTime: -1 });
sessionSchema.index({ userId: 1, startTime: -1 });
sessionSchema.index({ status: 1, lastActivity: -1 });

export const Session = mongoose.model('Session', sessionSchema);
