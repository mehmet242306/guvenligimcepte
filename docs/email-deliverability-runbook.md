# RiskNova Email Deliverability Runbook

Last updated: 2026-05-13

## Current Findings

- `getrisknova.com` has SPF for Natro only.
- `_dmarc.getrisknova.com` exists, but policy is `p=none`.
- Hosted Supabase Auth is still sending the default confirmation email if the user sees the subject `Confirm Your Signup`.
- Local Supabase config has a branded confirmation template, but hosted Supabase must be updated from the Dashboard or Management API.

## Required Production Setup

1. Use a dedicated transactional sending identity.
   - Recommended From: `RiskNova <noreply@getrisknova.com>` or `RiskNova <noreply@mail.getrisknova.com>`.
   - Keep auth/transactional email separate from marketing email.

2. Configure Supabase Auth custom SMTP.
   - Supabase Dashboard -> Authentication -> SMTP Settings.
   - Provider: Resend, Postmark, AWS SES, SendGrid, or another reputable SMTP provider.
   - Sender name: `RiskNova`.
   - Sender email: the verified From address above.

3. Verify sending domain in the email provider.
   - Add the provider's SPF record.
   - Add the provider's DKIM records.
   - Add/customize return-path if supported.
   - Do not overwrite existing DNS records blindly; merge SPF includes into the single SPF record.

4. Tighten DMARC gradually.
   - Start with:
     `v=DMARC1; p=none; rua=mailto:dmarc@getrisknova.com; adkim=s; aspf=s`
   - After SPF/DKIM pass consistently, move to:
     `v=DMARC1; p=quarantine; pct=25; rua=mailto:dmarc@getrisknova.com; adkim=s; aspf=s`
   - Then raise `pct` and eventually use `p=reject`.

5. Apply branded Supabase Auth templates.
   - Supabase Dashboard -> Authentication -> Email Templates -> Confirm signup.
   - Subject: `RiskNova e-posta onayi`
   - HTML source: `supabase/templates/confirmation.html`

## DNS Notes

Only one SPF TXT record is allowed per domain. If the email provider asks for an SPF include, merge it into the existing SPF record instead of creating a second SPF record.

Example shape:

```txt
v=spf1 include:_spfcls.natrohost.com include:_netblockshalon.natrohost.com include:<provider-spf> ~all
```

Replace `<provider-spf>` with the exact include from the provider dashboard.

## Verification

After DNS propagation:

1. Send a signup confirmation to Gmail, Outlook/Hotmail, and a corporate mailbox.
2. Check the raw message headers.
3. Confirm:
   - SPF: PASS
   - DKIM: PASS
   - DMARC: PASS
   - From domain aligns with the authenticated domain.
4. Confirm the template is no longer the default `Confirm Your Signup` email.
