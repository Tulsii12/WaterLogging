import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import incidentRoutes from './routes/incidents.js';
import supabase from './config/supabase.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/incidents', incidentRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Test Supabase connection
        const { data, error } = await supabase
            .from('incidents')
            .select('id')
            .limit(1);

        res.json({
            status: 'OK',
            message: 'Monsoon Backend API is running',
            database: error ? 'Disconnected' : 'Connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            status: 'OK',
            message: 'Monsoon Backend API is running',
            database: 'Error',
            timestamp: new Date().toISOString()
        });
    }
});

// Test Supabase connection on startup
async function testSupabaseConnection() {
    try {
        const { data, error } = await supabase
            .from('incidents')
            .select('id')
            .limit(1);

        if (error) {
            console.error('❌ Supabase connection error:', error.message);
            console.log('⚠️  Please check your Supabase configuration in .env file');
            console.log('   Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set correctly');
        } else {
            console.log('✅ Connected to Supabase');
            console.log(`📚 Supabase URL: ${process.env.SUPABASE_URL}`);
        }
    } catch (error) {
        console.error('❌ Supabase connection test failed:', error.message);
    }
}

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API endpoint: http://localhost:${PORT}/api/incidents`);
    console.log(`\n🌧️  Delhi Monsoon Incident Reporting API Ready!`);
    await testSupabaseConnection();
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n⏸️  Shutting down gracefully...');
    process.exit(0);
});

export default app;
