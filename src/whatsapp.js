import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { supabaseAdmin } from './lib/supabase.js';
import { DatabaseService } from './services/database.service.js';
import fs from 'fs';
import path from 'path';

const instances = new Map();
const SESSIONS_DIR = path.resolve('./sessions');

if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

/**
 * Total Session Cleanup
 */
async function clearSession(applicationId) {
  console.log(`[${applicationId}] 🧹 Performing deep cleanup...`);
  // 1. Clear local
  const sessionPath = path.join(SESSIONS_DIR, applicationId);
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
  }
  // 2. Clear Supabase
  await supabaseAdmin.from('sessions').delete().eq('application_id', applicationId);
  // 3. Clear Instance
  instances.delete(applicationId);
}

async function syncSessionToSupabase(applicationId) {
  try {
    const sessionPath = path.join(SESSIONS_DIR, applicationId);
    if (!fs.existsSync(sessionPath)) return;

    const files = fs.readdirSync(sessionPath);
    for (const file of files) {
      const filePath = path.join(sessionPath, file);
      if (!fs.existsSync(filePath)) continue;

      const data = fs.readFileSync(filePath, 'utf-8');
      await supabaseAdmin.from('sessions').upsert({
        application_id: applicationId,
        key: file,
        data: JSON.parse(data)
      }, { onConflict: 'application_id, key' });
    }
  } catch (err) {
    console.error(`[${applicationId}] Sync Error:`, err.message);
  }
}

async function restoreSessionFromSupabase(applicationId) {
  const sessionPath = path.join(SESSIONS_DIR, applicationId);
  if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

  const { data: rows } = await supabaseAdmin.from('sessions').select('key, data').eq('application_id', applicationId);
  if (rows && rows.length > 0) {
    for (const row of rows) {
      fs.writeFileSync(path.join(sessionPath, row.key), JSON.stringify(row.data));
    }
    return true;
  }
  return false;
}

export async function initWhatsApp(applicationId) {
  if (instances.has(applicationId)) return instances.get(applicationId).sock;

  try {
    // Attempt restoration
    const hasSession = await restoreSessionFromSupabase(applicationId);

    const { state, saveCreds } = await useMultiFileAuthState(path.join(SESSIONS_DIR, applicationId));
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      version,
      printQRInTerminal: false,
      browser: ['WA SaaS', 'Chrome', '1.0.0'],
      connectTimeoutMs: 60000,
    });

    const instance = { sock, applicationId, status: { connected: false, connecting: true, qr: null } };
    instances.set(applicationId, instance);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        instance.status.qr = qr;
        console.log(`[${applicationId}] 🎯 QR Generated Successfully`);
      }

      if (connection === 'open') {
        console.log(`[${applicationId}] ✅ CONNECTED!`);
        instance.status.connected = true;
        instance.status.connecting = false;
        instance.status.qr = null;
        await syncSessionToSupabase(applicationId);
        await supabaseAdmin.from('applications').update({ status: 'connected', phone_number: sock.user.id.split(':')[0] }).eq('id', applicationId);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error)?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;

        instance.status.connected = false;
        instance.status.connecting = false;
        await supabaseAdmin.from('applications').update({ status: 'disconnected' }).eq('id', applicationId);

        if (!isLoggedOut) {
          console.log(`[${applicationId}] ❌ Disconnected. Retrying...`);
          setTimeout(() => initWhatsApp(applicationId), 5000);
        } else {
          console.log(`[${applicationId}] 🚪 Logged out or Session Corrupted. Cleaning up.`);
          await clearSession(applicationId);
        }
      }
    });

    sock.ev.on('creds.update', async () => {
      await saveCreds();
      syncSessionToSupabase(applicationId);
    });

    return sock;
  } catch (error) {
    console.error(`[${applicationId}] ❌ Boot Error:`, error);
    await clearSession(applicationId);
    throw error;
  }
}

export async function disconnectWhatsApp(applicationId) {
  const instance = instances.get(applicationId);
  if (instance) {
    await clearSession(applicationId);
  }
}

export function getConnectionStatus(applicationId) {
  const inst = instances.get(applicationId);
  return inst ? inst.status : { connected: false, connecting: false, qr: null };
}

export function getInstance(applicationId) { return instances.get(applicationId); }

export async function sendMessage(applicationId, phone, message) {
  const instance = instances.get(applicationId);
  if (!instance || !instance.status.connected) throw new Error('Not connected');
  const jid = phone.replace(/[^\d]/g, '') + '@s.whatsapp.net';
  return await instance.sock.sendMessage(jid, { text: message });
}
