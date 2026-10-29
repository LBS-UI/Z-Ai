# Zimelia — Cloudflare Worker + Secret (secure voice)

The API key never goes to the browser. The Worker uses a Cloudflare Secret.

## 1. Deploy
```bash
npx wrangler deploy
```

Or upload via the Cloudflare dashboard as a Worker with assets.

## 2. Set the secret (required for voice)
In the Cloudflare dashboard:
- Go to your Worker → Settings → Variables and Secrets
- Add a **Secret** named exactly: `FISH_API_KEY`
- Paste your Fish Audio API key
- (Optional) Add a plain Variable named `FISH_MODEL_ID` if you want to change the model later.  
  Default is already `0089dce5fefb4c6ba9b9f2f0debe1ddc`.

Or via CLI:
```bash
npx wrangler secret put FISH_API_KEY
```

## 3. Done
Open the site and chat.  
Zimelia will speak using the secret. The north-smile sprite shows while she’s talking.

Sprites are embedded, so they always work.
