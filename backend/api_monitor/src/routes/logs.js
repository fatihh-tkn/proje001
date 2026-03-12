import express from 'express';
import { Log } from '../models/Log.js';

const router = express.Router();

// Fallback: In-memory storage (MongoDB bağlantısı yoksa)
global.memoryLogs = global.memoryLogs || [];

// Yeni log kaydet (SDK'dan gelecek)
router.post('/', async (req, res) => {
    try {
        const logData = {
            ...req.body,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        let savedLog;

        // MongoDB'ye kaydet
        try {
            savedLog = await Log.create(logData);
            console.log('✅ Log saved to MongoDB:', {
                provider: savedLog.provider,
                model: savedLog.model,
                tokens: savedLog.totalTokens,
                duration: savedLog.duration + 'ms'
            });
        } catch (dbError) {
            // MongoDB hatası varsa in-memory'ye kaydet
            console.warn('⚠️  MongoDB save failed, using in-memory storage:', dbError.message);
            savedLog = { ...logData, _id: logData.id };
            global.memoryLogs.unshift(savedLog);

            // Max 1000 log tut
            if (global.memoryLogs.length > 1000) {
                global.memoryLogs.pop();
            }
        }

        // Real-time broadcast (websocket varsa)
        if (global.io) {
            global.io.to(`project:${savedLog.projectId}`).emit('new-log', savedLog);
        }

        res.status(201).json({ success: true, id: savedLog.id || savedLog._id });
    } catch (error) {
        console.error('❌ Log save error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Logları filtrele ve getir
router.get('/', async (req, res) => {
    try {
        const {
            projectId,
            provider,
            model,
            status,
            startDate,
            endDate,
            limit = 100,
            skip = 0,
        } = req.query;

        // Filter query oluştur
        const filter = {};
        if (projectId) filter.projectId = projectId;
        if (provider) filter.provider = provider;
        if (model) filter.model = model;
        if (status) filter.status = status;
        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = new Date(startDate);
            if (endDate) filter.timestamp.$lte = new Date(endDate);
        }

        let logs, total;

        // MongoDB'den çek
        try {
            logs = await Log.find(filter)
                .sort({ timestamp: -1 })
                .skip(parseInt(skip))
                .limit(parseInt(limit))
                .lean();

            total = await Log.countDocuments(filter);

            console.log(`📊 Fetched ${logs.length} logs from MongoDB`);
        } catch (dbError) {
            // MongoDB hatası varsa in-memory'den getir
            console.warn('⚠️  MongoDB fetch failed, using in-memory storage:', dbError.message);
            let filteredLogs = [...global.memoryLogs];

            if (projectId) filteredLogs = filteredLogs.filter(log => log.projectId === projectId);
            if (provider) filteredLogs = filteredLogs.filter(log => log.provider === provider);
            if (model) filteredLogs = filteredLogs.filter(log => log.model === model);
            if (status) filteredLogs = filteredLogs.filter(log => log.status === status);

            total = filteredLogs.length;
            logs = filteredLogs.slice(parseInt(skip), parseInt(skip) + parseInt(limit));
        }

        res.json({
            logs,
            total,
            limit: parseInt(limit),
            skip: parseInt(skip),
        });
    } catch (error) {
        console.error('❌ Fetch error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Tek bir log'u ID ile getir
router.get('/:id', async (req, res) => {
    try {
        let log;

        // MongoDB'den getir
        try {
            log = await Log.findOne({ id: req.params.id }).lean();
        } catch (dbError) {
            // Fallback to in-memory
            log = global.memoryLogs.find(log => log.id === req.params.id);
        }

        if (!log) {
            return res.status(404).json({ error: 'Log not found' });
        }

        res.json(log);
    } catch (error) {
        console.error('❌ Fetch error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

export default router;
