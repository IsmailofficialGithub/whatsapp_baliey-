# Environment Variables Setup

Create a `.env` file in the `backend-whatsapp-service` directory with the following variables:

```env
# Server Configuration
PORT=3001

# WhatsApp Session Storage
WHATSAPP_SESSION_PATH=./sessions

# Optional: Webhook for incoming messages
WEBHOOK_URL=https://your-webhook-url.com/callback

# Optional: Logging Level
LOG_LEVEL=info
```

## Notes

- `PORT`: The port the server will run on (default: 3001)
- `WHATSAPP_SESSION_PATH`: Directory where WhatsApp session files will be stored (default: ./sessions)
- `WEBHOOK_URL`: URL to be called when a new message is received.
- `LOG_LEVEL`: Logging verbosity (default: info)

The `.env` file should not be committed to version control (it's in `.gitignore`).
