import express from 'express';
import { sendMessage, getConnectionStatus } from './whatsapp.js';

const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  const status = getConnectionStatus();
  res.json({
    status: 'ok',
    whatsapp_connected: status.connected,
    whatsapp_connecting: status.connecting,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Send WhatsApp message endpoint
 * POST /api/send-message
 * Body: { phone: string, message: string }
 */
router.post('/send-message', async (req, res) => {
  try {
    const { phone, message } = req.body;

    // Validate input
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    // Check connection status
    const status = getConnectionStatus();
    if (!status.connected) {
      return res.status(503).json({
        success: false,
        error: 'WhatsApp not connected. Please wait for connection to be established.',
        connecting: status.connecting,
      });
    }

    // Send message
    const result = await sendMessage(phone, message);

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error in send-message endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send message',
    });
  }
});

/**
 * Get connection status endpoint
 */
router.get('/status', (req, res) => {
  const status = getConnectionStatus();
  res.json({
    success: true,
    data: status,
  });
});

export default router;
