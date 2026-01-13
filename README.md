# WhatsApp Baileys Backend Service

A standalone Node.js service for sending WhatsApp messages using Baileys. This service runs independently and exposes REST API endpoints for the expense management app.

## Features

- WhatsApp Web connection using Baileys
- REST API for sending messages
- Session persistence (auth state saved)
- CORS enabled for all origins
- Health check endpoint

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Start the service:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Initial WhatsApp Connection

1. Start the server
2. Check the console for a QR code
3. Open WhatsApp on your phone
4. Go to Settings → Linked Devices → Link a Device
5. Scan the QR code displayed in the console
6. The session will be saved and persist across restarts

## API Endpoints

### POST /api/send-message

Send a WhatsApp message to a phone number.

**Request Body:**
```json
{
  "phone": "+1234567890",
  "message": "Your message text here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "whatsapp_connected": true
}
```

## Phone Number Format

Phone numbers should be in E.164 format (e.g., `+1234567890`) with country code. The service will attempt to format numbers automatically if needed.

## Deployment

This service can be deployed on any Node.js hosting platform:

- **Vercel**: Use serverless functions
- **Railway**: Direct Node.js deployment
- **Heroku**: Standard Node.js buildpack
- **DigitalOcean**: App Platform or Droplet
- **AWS**: EC2 or Lambda (with modifications)

### Environment Variables

- `PORT`: Server port (default: 3001)
- `WHATSAPP_SESSION_PATH`: Path to store WhatsApp session files (default: ./sessions)
- `LOG_LEVEL`: Logging level (default: info)

### Session Persistence

The WhatsApp session is stored in the `sessions/` directory. Make sure this directory is:
- Included in your deployment
- Has write permissions
- Is backed up (session loss requires re-authentication)

## Error Handling

- All errors are logged to console
- API returns appropriate HTTP status codes
- WhatsApp connection errors are handled gracefully

## Security Notes

- This service allows CORS from all origins (configure for production)
- Consider adding authentication/API keys for production use
- Session files contain sensitive authentication data - keep secure
"# whatsapp_baliey-" 
