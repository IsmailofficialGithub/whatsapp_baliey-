import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initWhatsApp } from './whatsapp.js';
import routes from './routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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
    // Initialize WhatsApp connection
    console.log('Initializing WhatsApp connection...');
    await initWhatsApp();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`\n🚀 WhatsApp Service running on port ${PORT}`);
      console.log(`📱 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📨 Send message: POST http://localhost:${PORT}/api/send-message\n`);
    });
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
