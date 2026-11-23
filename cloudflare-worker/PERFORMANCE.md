# Cloudflare Worker scalability optimization

The public read-only `GET /api/status` response is derived from Worker environment configuration and now runs on the Worker itself, avoiding the globally shared VoiceSessionGuard Durable Object.

The security-sensitive `POST /api/live-token` route still goes through VoiceSessionGuard for consent checks, cooldown, quota enforcement, and token issuance. No limits or customer-facing behavior are increased.

Check the code without production credentials:

```sh
node --test .github/scripts/cloudflare-status-qa.mjs
```

GitHub Actions runs the test independently from deployment. Workers can still require a separate authenticated `npx wrangler deploy --config wrangler.jsonc` because the GitHub deployment workflow needs Cloudflare credentials.

This reduces a needless backend hop per status request. It does not increase memory, Cloudflare plan quotas, or provider session limits, and should not be presented as measured speed-up until production metrics are collected.
