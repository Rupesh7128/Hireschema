## Summary
We will diagnose why payment verification returns false, fix environment and URL mismatches, improve server-side verification, and make the app resilient by exposing clear diagnostics. Then we’ll redeploy to the production domain.

## Diagnosis & Visibility
- Add richer responses from `/api/verify-payment` (status, reason, provider text) and surface them in App.tsx error to quickly pinpoint: 401 (secret missing), 404 (wrong environment or paymentId), product mismatch, or unknown.
- Log the raw values parsed from query (`payment_id`, `paymentId`, `session_id`, `session`) and what is actually sent to `/api/verify-payment`.
- In `/api/dodo-webhook`, log verified payload type (`payment.succeeded`) and the `payment_id`/`status` for support.

## Environment & URL Corrections
- Set production envs in Vercel (Production):
  - `DODO_PAYMENTS_API_KEY` (secret)
  - `DODO_PAYMENTS_WEBHOOK_SECRET` (signing secret)
  - `VITE_DODO_PRODUCT_ID` (product id `pdt_...`)
  - `VITE_DODO_ENV` = `live` or `test`
- Update Webhook URL in Dodo Dashboard to `https://hireschema.vercel.app/api/dodo-webhook` (ensure trailing `k`).
- Ensure client calls `/api/verify-payment` on `hireschema.vercel.app` (already done by using relative path).

## Server Verification Improvements
- In `/api/verify-payment`, return explicit codes and reason strings to client; include `product_id` and `status`.
- If `404` or `401` on the selected environment, add a safe retry to the other environment domain (test↔live) once, to catch mismatched `payment_id` origins.
- Validate product id match only when `VITE_DODO_PRODUCT_ID` is set; include both expected and actual ids in the response for faster fixes.

## Redirect Parameter Robustness
- Expand App.tsx detection to include additional keys (`redirect_status`, `checkout_session`, `id` if present) and normalize values.
- If no id is present but redirect indicates success, proceed with a grace unlock and show a banner recommending manual verification (already partially implemented).

## Webhook Behavior
- Keep signature verification as implemented and return 200 quickly.
- Optionally add minimal logging (no PII) to confirm event receipt and status for support.

## Manual Verification UX
- Improve manual verify errors to display the server-provided reason and status.
- After successful manual verify, set `isPaid` and clean URL.

## Testing
- Use test mode with a known `payment_id` to validate `/api/verify-payment` returns `isPaid=true` and product match.
- Trigger a Dodo test webhook and confirm `200 OK` (no retries) in Delivery Stats.

## Deploy
- Redeploy to `https://hireschema.vercel.app` after code updates.
- Validate both auto-verify (redirect path) and manual verify in production.

## Expected Outcome
- Payment verification succeeds reliably; failures display clear cause (secret missing, wrong environment, or product mismatch).
- Webhook deliveries succeed (no more failed attempts).
- Premium unlock works automatically after checkout or manually via Payment ID.