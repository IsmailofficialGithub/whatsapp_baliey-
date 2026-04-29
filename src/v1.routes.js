import express from 'express';
import { sendMessage, getInstance } from './whatsapp.js';
import { supabaseAdmin } from './lib/supabase.js';

const router = express.Router();

/**
 * Middleware to validate API Key and Application ID
 */
const validateApiKey = async (req, res, next) => {
  const { appId } = req.params;
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'API Key is required in x-api-key header' });
  }

  try {
    const { data: app, error } = await supabaseAdmin
      .from('applications')
      .select('id, api_key, status')
      .eq('id', appId)
      .single();

    if (error || !app) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    if (app.api_key !== apiKey) {
      return res.status(403).json({ success: false, error: 'Invalid API Key' });
    }

    // Attach app info to request
    req.appInfo = app;
    next();
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Public Send Message Endpoint
 * POST /v1/send/:appId
 */
router.post('/send/:appId', validateApiKey, async (req, res) => {
  const { appId } = req.params;
  const { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ success: false, error: 'Phone and message are required' });
  }

  try {
    // 1. Check if instance is connected in memory
    const instance = getInstance(appId);
    if (!instance || !instance.status.connected) {
      return res.status(503).json({ 
        success: false, 
        error: 'WhatsApp instance is not connected. Please connect via dashboard first.' 
      });
    }

    // 2. Send Message
    const result = await sendMessage(appId, phone, message);

    // 3. Track Usage (Async - don't block response)
    supabaseAdmin.rpc('increment_api_usage', { app_id: appId }).catch(() => {
        // Fallback if RPC isn't created: manually increment
        supabaseAdmin
          .from('applications')
          .update({ 
              api_usage_count: (req.appInfo.api_usage_count || 0) + 1,
              last_used_at: new Date().toISOString()
          })
          .eq('id', appId);
    });

    // 4. Log API Hit
    await supabaseAdmin.from('api_logs').insert({
      application_id: appId,
      endpoint: `/v1/send/${appId}`,
      status_code: 200,
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: result
    });

  } catch (error) {
    console.error(`[Public API] Error sending message for ${appId}:`, error);
    
    // Log failed hit
    await supabaseAdmin.from('api_logs').insert({
      application_id: appId,
      endpoint: `/v1/send/${appId}`,
      status_code: 500,
      ip_address: req.ip
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send message'
    });
  }
});

export default router;
