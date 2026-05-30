-- =========================================================================
-- AutomateOS — Demo seed data (1 tenant, sample records)
-- Run AFTER schema.sql + policies.sql.
-- =========================================================================

-- Demo organization
insert into organizations (id, name, slug, industry, timezone, brand_color, business_hours)
values ('00000000-0000-0000-0000-000000000001', 'Acme Realty', 'acme', 'Real Estate', 'Asia/Kolkata', '#5B5BF7', 'Mon–Sat 9:00–19:00')
on conflict (id) do nothing;

-- Note: profiles depend on auth.users — create a user in Supabase Auth first,
-- then insert their profile row referencing the same UUID.

-- Sample leads
insert into leads (organization_id, name, email, phone, source, status, temperature, score, intent, tags)
values
  ('00000000-0000-0000-0000-000000000001','Aarav Sharma','aarav@example.com','+91 9876543210','Website Form','qualified','hot',86,'Ready to buy','{"premium","ready-to-close"}'),
  ('00000000-0000-0000-0000-000000000001','Saanvi Patel','saanvi@example.com','+91 9123456789','WhatsApp','contacted','warm',62,'Researching','{"budget-3br"}'),
  ('00000000-0000-0000-0000-000000000001','Rohan Mehta','rohan@example.com','+91 9988776655','Facebook Ads','new','cold',24,'Awareness','{"first-time-buyer"}')
on conflict do nothing;

-- Sample FAQ
insert into faq_items (organization_id, question, answer, tags)
values
  ('00000000-0000-0000-0000-000000000001','What are your business hours?','We are open Mon–Sat 9:00–19:00 IST.','{"hours"}'),
  ('00000000-0000-0000-0000-000000000001','How do I schedule a site visit?','Reply with the property name and your preferred date.','{"booking"}')
on conflict do nothing;

-- Sample integrations
insert into integrations (organization_id, provider, label, status, config)
values
  ('00000000-0000-0000-0000-000000000001','whatsapp','WhatsApp Business','connected','{"phone_number":"+91 80000 00000"}'),
  ('00000000-0000-0000-0000-000000000001','google_calendar','Google Calendar','connected','{"calendar_id":"primary"}')
on conflict do nothing;

-- ===== New tables seed =====

-- Sample contacts
insert into contacts (id, organization_id, name, phone, email, tags, opted_out, whatsapp_valid)
values
  ('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000001','Priya Nair','+919876540001','priya@example.com','{"vip","buyer"}',false,true),
  ('00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000001','Karan Verma','+919876540002',null,'{"prospect"}',false,true),
  ('00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000001','Meena Iyer','+919876540003','meena@example.com','{}',false,false)
on conflict do nothing;

-- Sample org channel (WhatsApp Cloud API)
-- NOTE: access_token and phone_number_id values below are placeholders.
--       Store real values encrypted (pgcrypto pgp_sym_encrypt) in production.
insert into org_channels (id, organization_id, provider, label, phone_number, waba_id, phone_number_id, access_token, status, connected_at)
values
  ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000001','whatsapp','Acme Realty WhatsApp','+918000000000','WABA_ID_PLACEHOLDER','PHONE_NUM_ID_PLACEHOLDER','ACCESS_TOKEN_PLACEHOLDER','active', now())
on conflict do nothing;

-- Wallet for demo org (one wallet per org)
insert into wallets (id, organization_id, conversation_credits, broadcast_credits)
values
  ('00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000001',500,1000)
on conflict do nothing;

-- Sample conversations
insert into conversations (id, organization_id, contact_id, org_channel_id, status, tags, last_message_at, last_message_preview, unread_count)
values
  ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000201',
   'open','{"property-inquiry"}', now() - interval '10 minutes','Hi, I am interested in the 3BHK listing.',2),
  ('00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000201',
   'resolved','{}', now() - interval '2 days','Thanks for your help!',0)
on conflict do nothing;

-- Sample messages
insert into messages (conversation_id, organization_id, direction, content_type, body, status)
values
  ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000001','inbound','text','Hi, I am interested in the 3BHK listing.','read'),
  ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000001','outbound','text','Hello Priya! Thanks for reaching out. Which locality are you looking at?','delivered'),
  ('00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000001','inbound','text','Thanks for your help!','read')
on conflict do nothing;
