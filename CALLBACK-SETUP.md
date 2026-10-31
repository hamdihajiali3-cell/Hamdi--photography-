# Hamdi AI — Automatic callback setup

This branch adds the server-side post-call callback flow. It does not activate calls until the Cloudflare secrets, KV namespace, Bland webhook, and a valid destination number are configured.

## Flow

1. A customer calls the Bland inbound number.
2. Bland posts the completed call payload to `/api/bland/post-call`.
3. The Worker verifies the HMAC-SHA256 `X-Webhook-Signature` using `BLAND_WEBHOOK_SECRET`.
4. A KV record prevents duplicate webhook deliveries from generating duplicate callbacks.
5. The Worker calls `POST https://api.bland.ai/v1/calls` and asks Hamdi AI to summarize the customer call in Arabic.

## 1. Create the Cloudflare KV namespace

From the repository root, run:

```bash
npx wrangler kv namespace create CALLBACKS
```

Copy the returned namespace ID into `wrangler.jsonc`, replacing `REPLACE_WITH_CLOUDFLARE_KV_NAMESPACE_ID`.

## 2. Add secrets (never commit these values)

Run each command and enter the value when prompted:

```bash
npx wrangler secret put BLAND_API_KEY
npx wrangler secret put BLAND_WEBHOOK_SECRET
npx wrangler secret put OWNER_PHONE_NUMBER
```

- `BLAND_API_KEY`: API key from Bland dashboard.
- `BLAND_WEBHOOK_SECRET`: the signing secret configured for Bland's webhook signatures.
- `OWNER_PHONE_NUMBER`: Hamdi's own mobile number in E.164 format, for example `+905xxxxxxxxx`.

Do not put these values in GitHub, HTML, JavaScript, or this document.

## 3. Deploy the Worker

```bash
npx wrangler deploy
```

The deployed Worker URL will be similar to:

```
https://hamdi--photography.<your-workers-subdomain>.workers.dev
```

Check:

```
GET https://hamdi--photography.<your-workers-subdomain>.workers.dev/api/health
```

The response must include `"callback_ready": true`.

## 4. Configure Bland

1. In Bland, open the inbound phone number that receives customer calls.
2. Set its post-call webhook URL to:
   `https://hamdi--photography.<your-workers-subdomain>.workers.dev/api/bland/post-call`
3. Enable webhook signing and use the same signing secret saved as `BLAND_WEBHOOK_SECRET`.
4. Confirm Bland sends the `X-Webhook-Signature` HMAC-SHA256 header.
5. Make a short test call to the Bland inbound number and check the Bland call log and Worker logs.

If the Bland account UI uses a different signature header or signing format, do not disable verification; adapt the verifier to Bland's exact documented format first.

## Important phone-number limitation

Bland's Agent Phone Plan is currently described as US/Canada only. Before enabling the workflow, confirm with Bland support that the account can place outbound calls to the Turkish `+90` destination and that the inbound number can receive customer calls from the intended region. The Worker will return a Bland API error instead of pretending a callback succeeded if the account blocks the destination.

## Privacy and operational notes

- The callback includes customer contact details and a short call summary. Limit access to Worker logs and Bland call history.
- Do not enable recording unless the required notice and consent process is in place.
- The AI must identify itself as an automated assistant.
- The AI report is informational; Hamdi confirms availability and bookings personally.
- The Worker never exposes API keys or the owner's phone number to the website.
