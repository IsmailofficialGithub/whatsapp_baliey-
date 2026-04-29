import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initWhatsApp } from './whatsapp.js';
import routes from './routes.js';
import v1Routes from './v1.routes.js';
import './lib/supabase.js';
import { supabaseAdmin } from './lib/supabase.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.includes(origin) ||
      allowedOrigins.includes('*') ||
      origin.startsWith('http://localhost:');

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS Blocked Origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', routes);
app.use('/v1', v1Routes);

// QR Code page
app.get('/qr', (req, res) => {
  res.sendFile(path.join(__dirname, 'qr.html'));
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'WhatsApp Baileys Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      sendMessage: 'POST /api/send-message',
      status: 'GET /api/status',
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Start server
async function startServer() {
  try {
    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`\n🚀 WhatsApp SaaS Service running on port ${PORT}`);
      console.log(`📱 Public API: http://localhost:${PORT}/v1/send/:appId`);
    });

    // Auto-reconnect previously connected apps
    console.log('Checking for active WhatsApp sessions to reconnect...');
    const { data: apps, error } = await supabaseAdmin
      .from('applications')
      .select('id')
      .eq('status', 'connected');

    if (error) {
      console.error('Failed to fetch active sessions:', error);
    } else if (apps && apps.length > 0) {
      console.log(`Found ${apps.length} active sessions. Reconnecting...`);
      for (const app of apps) {
        initWhatsApp(app.id).catch(err =>
          console.error(`Failed to reconnect app ${app.id}:`, err.message)
        );
      }
    } else {
      console.log('No active sessions to reconnect.');
    }

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();
