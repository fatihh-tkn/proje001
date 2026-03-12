import express from 'express';
import { Session } from '../models/Session.js';

const router = express.Router();

// 1. Yeni Session Başlat
router.post('/', async (req, res) => {
    try {
        const session = await Session.create({
            sessionId: req.body.sessionId,
            userId: req.body.userId,
            projectId: req.body.projectId,
            provider: req.body.provider,
            model: req.body.model,
            metadata: req.body.metadata
        });

        console.log('✅ New session created:', session.sessionId);
        res.status(201).json({ success: true, session });
    } catch (error) {
        console.error('❌ Session creation error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// 2. Session'a Mesaj Ekle
router.post('/:sessionId/messages', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const message = {
            id: req.body.id,
            timestamp: new Date(),
            role: req.body.role,
            content: req.body.content,
            promptTokens: req.body.promptTokens || 0,
            completionTokens: req.body.completionTokens || 0,
            cost: req.body.cost || 0,
            duration: req.body.duration || 0
        };

        const session = await Session.findOneAndUpdate(
            { sessionId },
            {
                $push: { messages: message },
                $inc: {
                    totalTokens: (message.promptTokens + message.completionTokens),
                    totalCost: message.cost,
                    totalDuration: message.duration,
                    messageCount: 1
                },
                $set: { lastActivity: new Date() }
            },
            { new: true }
        );

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // WebSocket ile broadcast
        if (global.io) {
            global.io.to(`project:${session.projectId}`).emit('session-updated', session);
        }

        res.json({ success: true, session });
    } catch (error) {
        console.error('❌ Message add error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// 3. Session Detayları
router.get('/:sessionId', async (req, res) => {
    try {
        const session = await Session.findOne({ sessionId: req.params.sessionId });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Session Listesi (Filtreleme)
router.get('/', async (req, res) => {
    try {
        const {
            projectId,
            userId,
            status,
            startDate,
            endDate,
            limit = 50,
            skip = 0
        } = req.query;

        const filter = {};
        if (projectId) filter.projectId = projectId;
        if (userId) filter.userId = userId;
        if (status) filter.status = status;
        if (startDate || endDate) {
            filter.startTime = {};
            if (startDate) filter.startTime.$gte = new Date(startDate);
            if (endDate) filter.startTime.$lte = new Date(endDate);
        }

        const sessions = await Session.find(filter)
            .sort({ startTime: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .lean();

        const total = await Session.countDocuments(filter);

        res.json({ sessions, total, limit: parseInt(limit), skip: parseInt(skip) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. Session'ı Tamamla
router.patch('/:sessionId/complete', async (req, res) => {
    try {
        const session = await Session.findOneAndUpdate(
            { sessionId: req.params.sessionId },
            {
                $set: {
                    status: 'completed',
                    endTime: new Date()
                }
            },
            { new: true }
        );

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        console.log('✅ Session completed:', session.sessionId);
        res.json({ success: true, session });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 6. Session İstatistikleri
router.get('/stats/summary', async (req, res) => {
    try {
        const { projectId, startDate, endDate } = req.query;

        const filter = {};
        if (projectId) filter.projectId = projectId;
        if (startDate || endDate) {
            filter.startTime = {};
            if (startDate) filter.startTime.$gte = new Date(startDate);
            if (endDate) filter.startTime.$lte = new Date(endDate);
        }

        const stats = await Session.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalSessions: { $sum: 1 },
                    avgMessagesPerSession: { $avg: '$messageCount' },
                    avgCostPerSession: { $avg: '$totalCost' },
                    avgDurationPerSession: { $avg: '$totalDuration' },
                    totalCost: { $sum: '$totalCost' },
                    totalMessages: { $sum: '$messageCount' }
                }
            }
        ]);

        res.json(stats[0] || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 7. Session Sil
router.delete('/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await Session.findOneAndDelete({ sessionId });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        console.log('🗑️ Session deleted:', sessionId);
        res.json({ success: true, message: 'Session deleted successfully' });
    } catch (error) {
        console.error('❌ Session delete error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

export default router;
