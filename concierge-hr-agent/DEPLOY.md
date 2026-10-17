# Deploying the Concierge AI HR Agent to Cloudflare

This deploys the HR assistant (employee "Ask a Question" page + HR Admin panel) as a
Cloudflare Worker with a Durable Object for storage. It runs on the **Workers Free plan**.
Total time: about 10 minutes.

## What's in this folder

| File | Purpose |
|---|---|
| `src/gadget.js` | Your original `server.js` — the Durable Object that stores documents and finds answers (unchanged) |
| `src/index.js` | Worker entry: serves the web page and routes `/api/<method>` calls to the Durable Object; enforces the admin password |
| `public/index.html` | The web page |
| `public/client.js` | Your original UI, with the admin password check moved to the server |
| `public/gadget-shim.js` | Makes `gadget.findAnswer(...)` etc. call the Worker API |
| `wrangler.jsonc` | Cloudflare configuration |
| `.dev.vars` | Local-only test password (`hradmin-local`) — never uploaded |

## One-time setup

1. **Install Node.js** (LTS version) from https://nodejs.org if you don't have it.
2. **Create a free Cloudflare account** at https://dash.cloudflare.com/sign-up.
3. Unzip this folder, open a terminal in it, and run:

   ```bash
   npm install
   npx wrangler login
   ```

   `wrangler login` opens your browser — click **Allow**.

## Deploy

```bash
npm run deploy
```

Wrangler prints your live URL, e.g. `https://concierge-hr-agent.<your-subdomain>.workers.dev`.

Then set the HR Admin password (you'll be prompted to type it — it's stored encrypted on Cloudflare, not in the code):

```bash
npm run set-password
```

Until the password is set, the HR Admin panel stays locked for everyone.

## First use

1. Open the URL → **HR Admin** tab → enter the password you set.
2. Pick **Singapore** or **Switzerland**, paste or upload a policy document, click **Upload / Add Q&A**.
3. Switch to **Ask a Question**, choose the same location, and ask something like
   "How many days of annual leave do I get?"

## Test locally first (optional)

```bash
npm run dev
```

Open http://localhost:8787 — admin password is `hradmin-local` (from `.dev.vars`).
Local data is kept in `.wrangler/` and is separate from the live site.

## Updating later

Edit files, then run `npm run deploy` again. Uploaded HR documents are kept between deploys.

## Good to know

- **Who can do what:** anyone with the link can ask questions; uploading, viewing and clearing
  documents require the admin password, checked on the server.
- **Size limit:** each location's documents are stored together; keep the total per location
  under ~1 MB of text (plenty for a POC with several policy documents).
- **No AI model yet:** answers come from keyword matching, exactly as before. Adding Claude or
  Gemini later only touches `findAnswer` in `src/gadget.js`.
- **Custom domain:** Cloudflare dashboard → Workers & Pages → concierge-hr-agent →
  Settings → Domains & Routes.
- **Restrict to staff (optional):** Cloudflare Zero Trust → Access can put an email-based login
  in front of the URL at no cost for small teams.
