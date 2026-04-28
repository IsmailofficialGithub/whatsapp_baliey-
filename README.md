# WhatsApp Baileys Service

A powerful, standalone Node.js service for WhatsApp integration using Baileys. Features a premium web interface for QR code authentication and a robust REST API for automated messaging.

## 🚀 Features

- **Premium Web Interface**: Interactive `/qr` page for easy authentication.
- **REST API**: Simple endpoints for sending messages and checking status.
- **Webhook Support**: Receive incoming WhatsApp messages in your own backend.
- **Session Persistence**: Auth state is saved locally to maintain connection across restarts.
- **Auto-Formatting**: Smart phone number parsing for global compatibility.
- **Lightweight & Fast**: Built with Express and Baileys.

## 🛠️ Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   Create a `.env` file in the root directory:
   ```env
   PORT=3001
   WEBHOOK_URL=https://your-api.com/webhook
   WHATSAPP_SESSION_PATH=./sessions
   ```

3. **Start the service**:
   ```bash
   npm start
   ```
   For development:
   ```bash
   npm run dev
   ```

## 📱 Web Interface

To link your WhatsApp account, simply navigate to:
`http://localhost:3001/qr`

This premium interface provides:
- Real-time QR code generation.
- Connection status updates (Waiting, Generating, Connected).
- Visual feedback once the device is successfully linked.

## 📡 API Endpoints

### `POST /api/send-message`
Send a WhatsApp message.
- **Body**: `{ "phone": "+1234567890", "message": "Hello World" }`
- **Notes**: Supports various phone formats; will auto-format to E.164.

### `GET /api/status`
Returns the current connection state.
- **Response**: 
  ```json
  {
    "success": true,
    "data": {
      "connected": true,
      "connecting": false,
      "qr": null
    }
  }
  ```

### `POST /api/logout`
Disconnects the current WhatsApp account and clears session files.
- **Notes**: Useful for switching accounts or resetting the connection.

### `GET /api/health`
Quick health check for monitoring tools.

## 🔗 Webhook Integration

Configure `WEBHOOK_URL` in your `.env` to receive incoming messages. The service will POST a JSON payload:

```json
{
  "sender": "1234567890@s.whatsapp.net",
  "message": "Hello from WhatsApp!",
  "timestamp": 1625000000,
  "pushName": "John Doe",
  "messageId": "ABC123XYZ"
}
```

## 🔒 Security & Persistence

- **Sessions**: Stored in `./sessions/` by default. Protect this directory as it contains your login credentials.
- **CORS**: Enabled for all origins by default (recommended to restrict in production).

## 📄 License
ISC
