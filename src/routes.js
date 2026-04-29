import express from 'express';
import { sendMessage, getConnectionStatus, disconnectWhatsApp, initWhatsApp, getInstance } from './whatsapp.js';
import { supabaseAdmin } from './lib/supabase.js';

const router = express.Router();

/**
 * Middleware to verify Supabase User Auth
 */
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });

  req.user = user;
  next();
};

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Application Management ---

/**
 * List all applications for the logged-in user
 */
router.get('/apps', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Create a new application
 */
router.post('/apps', requireAuth, async (req, res) => {
  try {
    const { name, webhook_url } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const { data, error } = await supabaseAdmin
      .from('applications')
      .insert([{
        user_id: req.user.id,
        name,
        webhook_url,
        status: 'disconnected'
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Delete an application
 */
router.delete('/apps/:appId', requireAuth, async (req, res) => {
  try {
    const { appId } = req.params;
    
    // Ensure app belongs to user
    const { data: app } = await supabaseAdmin
      .from('applications')
      .select('id')
      .eq('id', appId)
      .eq('user_id', req.user.id)
      .single();

    if (!app) return res.status(404).json({ error: 'Application not found' });

    // Disconnect if active
    const instance = getInstance(appId);
    if (instance && instance.sock) {
       await instance.sock.logout();
    }

    const { error } = await supabaseAdmin
      .from('applications')
      .delete()
      .eq('id', appId);

    if (error) throw error;
    res.json({ success: true, message: 'Application deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- WhatsApp Controls (Protected) ---

/**
 * Connect/Initialize WhatsApp for a specific app
 */
router.post('/connect/:appId', requireAuth, async (req, res) => {
  try {
    const { appId } = req.params;
    
    // Security check: verify ownership
    const { data: app } = await supabaseAdmin
      .from('applications')
      .select('id')
      .eq('id', appId)
      .eq('user_id', req.user.id)
      .single();

    if (!app) return res.status(404).json({ error: 'Application not found' });

    await initWhatsApp(appId);
    res.json({ success: true, message: 'Initialization started' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get connection status for a specific app
 */
router.get('/status/:appId', requireAuth, async (req, res) => {
  const { appId } = req.params;
  
  // Security check: verify ownership
  const { data: app } = await supabaseAdmin
    .from('applications')
    .select('id')
    .eq('id', appId)
    .eq('user_id', req.user.id)
    .single();

  if (!app) return res.status(404).json({ error: 'Application not found' });

  const instance = getInstance(appId);
  res.json({
    success: true,
    data: instance ? instance.status : { connected: false, connecting: false, qr: null }
  });
});

export default router;
