// Server Entry Point - Last Updated: Restart Trigger for Delete Route
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Routes
import logsRouter from './routes/logs.js';
import metricsRouter from './routes/metrics.js';
import sessionsRouter from './routes/sessions.js';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: '*' }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (dashboard)
app.use(express.static('public'));

// MongoDB bağlantısı
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 30000, // 30 seconds
            socketTimeoutMS: 45000, // 45 seconds
            maxPoolSize: 10,
        });
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        console.log('⚠️  Server will continue without database (logs will fail)');
    }
};

// API Routes
app.get('/', (req, res) => {
    res.json({
        name: 'LLM Dashboard Backend API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            logs: '/api/logs',
            metrics: '/api/metrics',
            sessions: '/api/sessions',
        }
    });
});

app.use('/api/logs', logsRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/sessions', sessionsRouter);

// WebSocket için real-time updates
global.io = io;

io.on('connection', (socket) => {
    console.log('🔌 Dashboard connected:', socket.id);

    socket.on('subscribe:project', (projectId) => {
        socket.join(`project:${projectId}`);
        console.log(`📡 Subscribed to project: ${projectId}`);
    });

    socket.on('disconnect', () => {
        console.log('❌ Dashboard disconnected:', socket.id);
    });
});

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    await connectDB();

    httpServer.listen(PORT, () => {
        console.log('');
        console.log('🚀 ================================');
        console.log('🚀 LLM Dashboard Backend Running!');
        console.log('🚀 ================================');
        console.log(`📍 Server: http://localhost:${PORT}`);
        console.log(`📊 API Docs: http://localhost:${PORT}/`);
        console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
        console.log('🚀 ================================');
        console.log('');
    });
};

startServer();
