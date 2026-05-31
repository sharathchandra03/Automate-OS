# Production Deployment Checklist

## Environment Variables (Vercel → Settings → Environment Variables)

### Required
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] NEXT_PUBLIC_APP_URL (e.g. https://app.yourdomain.com)

### Stripe (Week 5)
- [ ] STRIPE_SECRET_KEY (sk_live_...)
- [ ] STRIPE_WEBHOOK_SECRET (whsec_...)
- [ ] STRIPE_PRICE_STARTER
- [ ] STRIPE_PRICE_GROWTH
- [ ] STRIPE_PRICE_PRO
- [ ] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (pk_live_...)

### WhatsApp (Week 3)
- [ ] WHATSAPP_VERIFY_TOKEN
- [ ] WHATSAPP_APP_SECRET

### AI (Week 7)
- [ ] ANTHROPIC_API_KEY or GEMINI_API_KEY

### Monitoring (Week 8)
- [ ] NEXT_PUBLIC_SENTRY_DSN
- [ ] SENTRY_AUTH_TOKEN
- [ ] SENTRY_ORG
- [ ] SENTRY_PROJECT

### n8n (Week 2)
- [ ] N8N_API_URL
- [ ] N8N_API_KEY
- [ ] N8N_WEBHOOK_SECRET

## Supabase Setup
- [ ] Run `supabase/schema.sql` in SQL editor (all migrations applied)
- [ ] `daily_lead_counts` function created (Week 7)
- [ ] `deduct_credits` RPC function created (Week 1)
- [ ] `encrypt_credential` / `decrypt_credential` functions created (Week 2)
- [ ] RLS enabled on all tables
- [ ] Storage bucket `org-assets` created with public read policy (Week 6)
- [ ] Auth redirect URLs set to production domain

## Stripe Setup
- [ ] Webhook endpoint registered: `https://<domain>/api/webhooks/stripe`
- [ ] Events subscribed: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

## WhatsApp Setup
- [ ] Webhook URL registered: `https://<domain>/api/webhooks/whatsapp`
- [ ] Verify token matches `WHATSAPP_VERIFY_TOKEN`

## Vercel Deployment
- [ ] Connect GitHub repo to Vercel project
- [ ] Root directory: `app` (monorepo — Next.js app lives in `/app`)
- [ ] Build command: `npm run build`
- [ ] Output: `.next`
- [ ] Node.js 20.x runtime

## Final Checks
- [ ] `npm run build` succeeds locally with 0 errors
- [ ] `npm test` passes all tests
- [ ] Sign up → onboarding flow works end-to-end in staging
- [ ] Stripe test checkout completes and subscription row appears in DB
- [ ] WhatsApp test message appears in inbox
- [ ] AI assistant returns a response
- [ ] Error boundary shows on simulated crash (add `throw new Error("test")` temporarily)
- [ ] Mobile layout checked on iPhone SE size (375px wide)
- [ ] Rate limiting verified: >60 requests/min from same IP returns 429 on leads webhook
