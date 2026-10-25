# Hamdi Photography AI Worker

This Worker keeps the OpenAI API key on the server. Never place the key in the website, GitHub files, browser storage, or a chat message.

## Set up and deploy

1. Install Node.js, then open a terminal in `cloudflare-worker`.
2. Run `npx wrangler login` and sign in to your Cloudflare account.
3. Create a **new** OpenAI API key after revoking any key shared in a message or repository.
4. Run `npx wrangler secret put OPENAI_API_KEY`. Paste the new key into the terminal's hidden prompt. Do not paste it into GitHub or this conversation.
5. Run `npx wrangler deploy`. Wrangler prints the public Worker address, for example `https://hamdi-photography-ai.<your-account>.workers.dev`.
6. Set `window.HAMDI_AI_ENDPOINT` in the repository's `ai-config.js` to that address plus `/api/chat`, then publish the site.

The website only sends chat text to this Worker. The OpenAI key stays in Cloudflare's encrypted secret storage. The Worker allows requests only from the GitHub Pages site, limits message size and history, uses the cost-efficient GPT-6 Luna model, and applies a Cloudflare per-IP rate limit of 10 requests per minute. Cloudflare's rate limit is approximate and can be shared by visitors behind the same network.

## Local development

For local testing only, create `.dev.vars` in this folder with:

```dotenv
OPENAI_API_KEY="your-new-key"
```

Delete it after use. The repository ignores `.dev.vars`; never commit the key. 