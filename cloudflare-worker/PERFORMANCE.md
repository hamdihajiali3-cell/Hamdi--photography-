# Cloudflare Worker scalability optimization

The public read-only `GET /api/status` response is derived from Worker environment configuration and now runs on the Worker itself, avoiding the globally shared VoiceSessionGuard Durable Object.

The security-sensitive `POST /api/live-token` route still goes through VoiceSessionGuard for consent checks, cooldown, quota enforcement, and token issuance. No limits or customer-facing behavior are increased.

Check the code without production credentials:

```sh
node --test .github/scripts/cloudflare-status-qa.mjs
```

GitHub Actions runs the test independently from deployment. Workers can still require a separate authenticated `npx wrangler deploy --config wrangler.jsonc` because the GitHub deployment workflow needs Cloudflare credentials.

This reduces a needless backend hop per status request. It does not increase memory, Cloudflare plan quotas, or provider session limits, and should not be presented as measured speed-up until production metrics are collected.

## Edge caching for fixed booking prompts

Studio-authored speech prompt URLs (`GET /api/order/prompt/...`) now use the Cloudflare Cache API when supported by the runtime. Successful complete WAV responses with immutable caching headers are cached per edge location. This avoids repeated trips to the globally shared prompt Durable Object for popular, versioned audio clips.

Range/partial responses, personalized bookings, session tokens, voice tokens, errors, and POST routes never use this cache. On cache unavailability or cache write failure, the original Durable Object path still works.

Tests: `node --test .github/scripts/cloudflare-edge-cache-qa.mjs`.

The cache is best-effort and per data center; it does **not** increase the number of permitted audio transcriptions, emails, voice sessions, or Cloudflare account request limits.
