import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let sock = null;
let isConnecting = false;
let connectionStatus = {
  connected: false,
  connecting: false,
  qr: null,
};

/**
 * Format phone number to WhatsApp format (E.164)
 * @param {string} phone - Phone number in any format
 * @returns {string} - Formatted phone number
 */
export function formatPhoneNumber(phone) {
  if (!phone) return null;
  
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If it doesn't start with +, assume it needs country code
  // Default to +1 (US) if no country code detected
  if (!cleaned.startsWith('+')) {
    // Try to detect if it already has country code (starts with 1 for US)
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      cleaned = '+' + cleaned;
    } else if (cleaned.length === 10) {
      // Assume US number, add +1
      cleaned = '+1' + cleaned;
    } else {
      // Try to add + if it looks like it might have country code
      cleaned = '+' + cleaned;
    }
  }
  
  return cleaned;
}

/**
 * Clear invalid session files (for 401 errors)
 */
function clearSession() {
  try {
    const sessionPath = process.env.WHATSAPP_SESSION_PATH || join(__dirname, '../sessions');
    if (existsSync(sessionPath)) {
      console.log('Clearing invalid session files...');
      rmSync(sessionPath, { recursive: true, force: true });
      console.log('Session files cleared. Please scan QR code again.');
    }
  } catch (error) {
    console.error('Error clearing session:', error);
  }
}

/**
 * Initialize WhatsApp connection
 */
export async function initWhatsApp() {
  if (isConnecting) {
    console.log('WhatsApp connection already in progress...');
    return;
  }

  if (sock && connectionStatus.connected) {
    console.log('WhatsApp already connected');
    return sock;
  }

  isConnecting = true;
  connectionStatus.connecting = true;

  try {
    // Get session path from environment or use default
    const sessionPath = process.env.WHATSAPP_SESSION_PATH || join(__dirname, '../sessions');
    
    // Create sessions directory if it doesn't exist
    if (!existsSync(sessionPath)) {
      mkdirSync(sessionPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      version,
      generateHighQualityLinkPreview: true,
    });

    // Handle QR code
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        connectionStatus.qr = qr;
        console.log('\n=== WhatsApp QR Code ===');
        qrcode.generate(qr, { small: true });
        console.log('Scan this QR code with WhatsApp to connect\n');
      }

      if (connection === 'close') {
        const error = lastDisconnect?.error;
        const statusCode = error?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const isUnauthorized = statusCode === 401;

        console.log(
          'Connection closed due to ',
          lastDisconnect?.error,
          ', reconnecting ',
          !isLoggedOut
        );

        connectionStatus.connected = false;
        connectionStatus.connecting = false;
        isConnecting = false;
        sock = null;

        // If unauthorized (401), clear session and reconnect
        if (isUnauthorized) {
          console.log('⚠️  Session expired or invalid. Clearing session files...');
          clearSession();
          // Reconnect after clearing session (will show QR code)
          setTimeout(() => {
            console.log('Reconnecting with new session...');
            initWhatsApp();
          }, 2000);
        } else if (!isLoggedOut) {
          // Reconnect for other errors (but not if logged out)
          setTimeout(() => {
            initWhatsApp();
          }, 5000);
        } else {
          console.log('Session logged out. Please restart the service to reconnect.');
        }
      } else if (connection === 'open') {
        console.log('WhatsApp connected successfully!');
        connectionStatus.connected = true;
        connectionStatus.connecting = false;
        isConnecting = false;
        connectionStatus.qr = null;
      }
    });

    // Save credentials when updated
    sock.ev.on('creds.update', saveCreds);

    // Handle connection errors
    sock.ev.on('connection.update', (update) => {
      if (update.connection === 'connecting') {
        connectionStatus.connecting = true;
      }
    });

    return sock;
  } catch (error) {
    console.error('Error initializing WhatsApp:', error);
    connectionStatus.connected = false;
    connectionStatus.connecting = false;
    isConnecting = false;
    throw error;
  }
}

/**
 * Get WhatsApp socket instance
 */
export function getSocket() {
  return sock;
}

/**
 * Get connection status
 */
export function getConnectionStatus() {
  return {
    ...connectionStatus,
    hasSocket: !!sock,
  };
}

/**
 * Send WhatsApp message
 * @param {string} phone - Phone number (will be formatted)
 * @param {string} message - Message text
 * @returns {Promise<object>} - Send result
 */
export async function sendMessage(phone, message) {
  if (!sock || !connectionStatus.connected) {
    throw new Error('WhatsApp not connected. Please wait for connection.');
  }

  if (!phone || !message) {
    throw new Error('Phone number and message are required');
  }

  try {
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone) {
      throw new Error('Invalid phone number format');
    }

    // Remove + and @s.whatsapp.net if present, then add @s.whatsapp.net
    const jid = formattedPhone.replace('+', '').replace('@s.whatsapp.net', '') + '@s.whatsapp.net';

    console.log(`Sending message to ${formattedPhone} (${jid})`);

    const result = await sock.sendMessage(jid, {
      text: message,
    });

    console.log('Message sent successfully:', result.key.id);

    return {
      success: true,
      messageId: result.key.id,
      phone: formattedPhone,
    };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}
