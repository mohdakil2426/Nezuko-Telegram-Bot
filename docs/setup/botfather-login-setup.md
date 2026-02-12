# BotFather Setup Guide for Telegram Login Widget

This guide explains how to configure your Telegram bot for use with the **Telegram Login Widget** on the Nezuko Dashboard.

## Prerequisites

- A Telegram account
- Access to @BotFather on Telegram
- Your dashboard domain (e.g., `localhost:3000` for development, `dashboard.yourdomain.com` for production)

---

## Step 1: Create or Select a Bot

If you don't have a bot yet:

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` command
3. Follow the prompts to name your bot
4. Save the **bot token** (e.g., `123456789:ABCdefGHIjklmnopQRSTuvwxyz`)

If you already have a bot (like Nezuko), you can use the same bot for login.

---

## Step 2: Configure Domain for Login Widget

The Telegram Login Widget requires your domain to be registered with BotFather.

### For Production

1. Open @BotFather
2. Send `/setdomain`
3. Select your bot
4. Enter your production domain: `dashboard.yourdomain.com`

   > ⚠️ **Important**: Do NOT include `https://` or trailing slashes

### For Local Development

Telegram requires HTTPS domains, so local development requires a tunnel service.

#### Option A: Using ngrok (Recommended)

1. Install ngrok: https://ngrok.com/download
2. Start your dashboard: `cd apps/web && bun dev`
3. In a new terminal: `ngrok http 3000`
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. In @BotFather:
   - Send `/setdomain`
   - Select your bot
   - Enter: `abc123.ngrok.io`

#### Option B: Using Cloudflare Tunnel

1. Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/
2. Run: `cloudflared tunnel --url http://localhost:3000`
3. Copy the generated URL
4. Configure in BotFather as above

---

## Step 3: Configure Environment Variables

### apps/api/.env

```bash
# Your bot token from Step 1
LOGIN_BOT_TOKEN=123456789:ABCdefGHIjklmnopQRSTuvwxyz

# Your Telegram user ID (the owner who can access dashboard)
# Find it by messaging @userinfobot on Telegram
BOT_OWNER_TELEGRAM_ID=123456789

# Encryption key for storing bot tokens
# Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY=your-generated-fernet-key

# Session expiry in hours (default: 24)
SESSION_EXPIRY_HOURS=24
```

### apps/web/.env.local

```bash
# Your bot's username (without @)
NEXT_PUBLIC_LOGIN_BOT_USERNAME=NezukoDashboardBot
```

---

## Step 4: Finding Your Telegram ID

Your Telegram ID is needed for `BOT_OWNER_TELEGRAM_ID`:

1. Open Telegram and search for **@userinfobot**
2. Send any message to the bot
3. It will reply with your user ID

---

## Step 5: Test the Login Flow

1. Ensure all services are running:

   ```bash
   # Terminal 1 - API
   cd apps/api && python -m uvicorn src.main:app --reload --port 8080

   # Terminal 2 - Web
   cd apps/web && bun dev
   ```

2. Navigate to your dashboard URL (e.g., `http://localhost:3000`)
3. You should be redirected to `/login`
4. Click the Telegram Login button
5. Confirm in Telegram app
6. You should be redirected to `/dashboard`

---

## Troubleshooting

### "Domain invalid" Error

- Ensure the domain is set correctly in BotFather (no `https://`)
- Make sure you're accessing the dashboard via the exact domain registered

### "Auth data is outdated" Error

- Telegram login data expires after 5 minutes
- Try logging in again

### "Owner only" Error

- Your Telegram ID doesn't match `BOT_OWNER_TELEGRAM_ID`
- Double-check your ID with @userinfobot

### Login Button Not Appearing

- Check browser console for script loading errors
- Verify `NEXT_PUBLIC_LOGIN_BOT_USERNAME` is set correctly
- Ensure the bot is not deactivated

### ngrok URL Changes

- Free ngrok URLs change on restart
- Update BotFather with the new domain each time
- Consider ngrok paid plan for stable URLs

---

## Security Notes

1. **Never commit tokens**: Keep `.env` files in `.gitignore`
2. **Session cookies**: HTTP-only, SameSite=Strict, Secure (in production)
3. **Token encryption**: Bot tokens are encrypted with Fernet before storage
4. **Single owner**: Only one Telegram ID can access the dashboard

---

## Related Files

| File                                              | Purpose                       |
| :------------------------------------------------ | :---------------------------- |
| `apps/api/src/services/telegram_auth_service.py`  | HMAC verification logic       |
| `apps/api/src/api/v1/endpoints/telegram_auth.py`  | Auth API endpoints            |
| `apps/web/src/components/auth/telegram-login.tsx` | Login widget component        |
| `apps/web/src/proxy.ts`                           | Session validation middleware |

---

_Last Updated: 2026-02-04_
