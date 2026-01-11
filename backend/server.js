import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import supabase from './config/supabase.js';

// Import routes (Ensure these files exist and use export default)
import wardRoutes from './routes/wards.js';
import incidentRoutes from './routes/incidents.js';
import alertRoutes from './routes/alerts.js';

// Import middleware
import errorHandler from './middleware/errorHandler.js';
import rateLimiter from './middleware/rateLimiter.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Routes
app.use('/api/wards', wardRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/alerts', alertRoutes);

// Health check with Supabase test
app.get('/health', async (req, res) => {
    try {
        const { error } = await supabase.from('incidents').select('id').limit(1);
        res.json({
            status: 'OK',
            message: 'Delhi Water-Logging API is running',
            database: error ? 'Disconnected' : 'Connected',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ status: 'Error', message: err.message });
    }
});

// WebSocket connection
io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
    });
});

// Error handling
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
    console.log('=================================');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 WebSocket enabled`);
    console.log(`🌐 API: http://localhost:${PORT}`);
    console.log('=================================');
});

export default app;