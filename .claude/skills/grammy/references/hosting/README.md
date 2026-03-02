# Hosting Guides

Deploy grammY bots to various platforms.

## Serverless & PaaS

| Platform | File | Notes |
|----------|------|-------|
| Deno Deploy | [deno-deploy.md](./deno-deploy.md) | Edge functions with Deno |
| Cloudflare Workers | [cloudflare-workers.md](./cloudflare-workers.md) | Edge computing with Web Standard APIs |
| Cloudflare Workers (Node) | [cloudflare-workers-nodejs.md](./cloudflare-workers-nodejs.md) | Node.js compatibility mode |
| Vercel | [vercel.md](./vercel.md) | Serverless functions |
| Firebase | [firebase.md](./firebase.md) | Cloud Functions |
| Supabase | [supabase.md](./supabase.md) | Edge functions |
| Zeabur (Deno) | [zeabur-deno.md](./zeabur-deno.md) | Container platform |
| Zeabur (Node) | [zeabur-nodejs.md](./zeabur-nodejs.md) | Container platform |

## PaaS (Always-On)

| Platform | File | Notes |
|----------|------|-------|
| Fly.io | [fly.md](./fly.md) | Docker containers |
| Heroku | [heroku.md](./heroku.md) | Classic PaaS |

## VPS

| Platform | File | Notes |
|----------|------|-------|
| General VPS | [vps.md](./vps.md) | Self-managed servers |

## Comparison

See [comparison.md](./comparison.md) for pricing and feature comparison.

## Quick Start

Most hosting guides follow this pattern:

1. Create webhook handler using `webhookCallback()`
2. Export the handler for your platform
3. Set the webhook URL via `bot.api.setWebhook()`

```ts
import { Bot, webhookCallback } from "grammy";

const bot = new Bot(process.env.BOT_TOKEN);

// Platform-specific export
export default webhookCallback(bot, "std/http");
```

---

Choose your platform above for detailed deployment instructions.
