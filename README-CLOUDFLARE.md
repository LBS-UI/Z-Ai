# Zimelia — Cloudflare Pages Deploy

This is a static site. Deploy it to Cloudflare Pages in under a minute.

## Option 1: Drag & Drop (easiest)
1. Unzip this folder.
2. Go to https://dash.cloudflare.com → Workers & Pages → Create application → Pages → Upload assets.
3. Drag the entire `Z-Ai-main` folder (or its contents so `index.html` is at the root).
4. Deploy. Done.

## Option 2: Wrangler CLI
```bash
cd Z-Ai-main
npx wrangler pages deploy . --project-name=zimelia
```

## After deploy
- Open the `*.pages.dev` URL.
- Click Settings → Fish Audio Voice → paste your API key → Save.
- Chat and she’ll use the sprites + Verity-like voice.

Sprites are in `assets/sprites/`. Talking shows `north-smile.png`.
