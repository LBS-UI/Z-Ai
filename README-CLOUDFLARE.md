# Zimelia — Cloudflare Pages

## Why it failed
Cloudflare tried `wrangler deploy` (Workers).  
This is a static site, so it needs **Pages**.

## Correct deploy command
```bash
npx wrangler pages deploy . --project-name=zimelia
```

## Or (easiest)
1. Cloudflare Dashboard → Workers & Pages → Create → Pages → **Upload assets**
2. Drag this folder (or its contents so `index.html` is at the root)
3. Deploy

## After it’s live
Open the site → Settings → Fish Audio Voice → paste your API key → Save.

Sprites + talking north-smile work the same.
