# The Abyss — EmailJS setup

The website already stores subscribers in Neon (or Vercel Blob in local development). **Keep this database as the source of truth for the mailing group**. EmailJS sends one private, personalized email to each active subscriber; it is not a mailing-list campaign manager.

## 1. Create one sending service

1. Sign in at https://dashboard.emailjs.com/.
2. **Email Services → Add New Service**. Choose a verified sending service, ideally a transactional provider for production; personal Gmail/Outlook accounts are suitable for testing and very low volume only.
3. The Gmail service shown in your EmailJS dashboard has Service ID **`service_59u3x2h`** (Primary). Copy that exact value into the Vercel environment variable `EMAILJS_SERVICE_ID`.
4. In **Account → Security**, enable API requests from non-browser applications (required because The Abyss sends from its Next.js server, not a reader's browser). Find the **Public Key** and **Private Key** in Account settings. Never expose the private key in frontend code.

## 2. Create exactly two Email Templates

**Template A: Welcome**
- Actual Template ID: `template_hx9pl8s`
- Subject: `Welcome to The Abyss — You're on the list`
- To Email: `{{to_email}}`
- From Name: `The Abyss`
- Body: paste all of `email-templates/emailjs-welcome.html` into the HTML/code editor.
- Dynamic parameters: `to_email`, `site_url`, `latest_article_title`, `latest_article_url`, `unsubscribe_url`.

**Template B: New Article**
- Actual Template ID: `template_k04dawk`
- Subject: `New from The Abyss: {{article_title}}`
- To Email: `{{to_email}}`
- From Name: `The Abyss`
- Body: paste all of `email-templates/emailjs-new-article.html`.
- Dynamic parameters: `to_email`, `site_url`, `article_title`, `article_excerpt`, `article_url`, `article_code`, `published_date`, `unsubscribe_url`.

## Exact EmailJS Content-tab fields

The **Contact Us** default fields shown by EmailJS are **not** suitable for subscriber email. For both the Welcome and New Article templates, set these fields explicitly:

| Field | Welcome template | New article template |
|---|---|---|
| Subject | `Welcome to The Abyss — You're on the list` | `New from The Abyss: {{article_title}}` |
| To Email | `{{to_email}}` | `{{to_email}}` |
| From Name | `The Abyss` | `The Abyss` |
| From Email | Check "Use Default Email Address" (your connected Gmail) | Same |
| Reply To | `corrections.theabyss@gmail.com` | Same |
| CC / BCC | Blank | Blank |
| Auto-Reply tab | No linked template | No linked template |

**Critical:** Do not leave the default **To Email** set to `corrections.theabyss@gmail.com`: that would send every subscriber notification to the editorial inbox. Do not use `{{name}}` or `{{email}}` in these template fields; this backend passes the recipient in `{{to_email}}`. You can use EmailJS's *Test It* dialog with your own address and sample dynamic values to validate.

The EmailJS editor preview may show a broken logo before `{{site_url}}` is populated. In *Test It*, provide your actual public site URL as `site_url`, along with a test `to_email` and the template's other variables. The logo file is `/brand/abyss-logo.png`, referenced through the website's absolute URL. Confirm the public asset is reachable before expecting it to appear in readers' email clients.

Leave Cc and Bcc empty. The backend sends the same template separately to each subscriber so addresses and unique unsubscribe links stay private. The HTML references the **existing** `/brand/abyss-logo.png` asset; no new images are required.

EmailJS can optionally save contacted addresses in the **Contacts** tab of each template. Keep contacts for reference only: unsubscribes are controlled by the website database, not by an EmailJS Contacts export.

## 3. Configure Vercel

Set the following under **Vercel → Project → Settings → Environment Variables**, for Production (and Preview only if needed):

```dotenv
SITE_URL=https://theabyssos.com
DATA_BACKEND=neon
CRON_SECRET=YOUR_SECRET
EMAILJS_SERVICE_ID=service_59u3x2h
EMAILJS_PUBLIC_KEY=YOUR_PUBLIC_KEY
EMAILJS_PRIVATE_KEY=YOUR_PRIVATE_KEY
EMAILJS_WELCOME_TEMPLATE_ID=template_hx9pl8s
EMAILJS_ARTICLE_TEMPLATE_ID=template_k04dawk
```

The Gmail service and template IDs are configured in Vercel production. An encrypted CRON_SECRET has also been installed. Only the EmailJS Public and Private Keys still need to be entered by the account owner. You only need to set the Public and Private Keys in Vercel; service/template IDs have safe project defaults and can be overridden through environment variables. If all five EmailJS settings are present, the website uses EmailJS for welcome and new-article emails. Otherwise it preserves the earlier Resend fallback (`RESEND_API_KEY`), or logs unsent messages in the admin outbox.

**Do not put email credentials in Git, client-side `NEXT_PUBLIC_` variables, or browser code.** Redeploy after adding environment variables.

## 4. Sending behavior and limits

- New subscription: one welcome email after the subscriber is successfully inserted.
- Repeated signup for an existing active subscriber: no duplicate welcome email.
- Draft → published, or a newly created published article: one new-article notification to every active subscriber.
- Editing an already published article: no re-send.
- Unsubscribed addresses: excluded. An unsubscribe link opens a **confirmation page**; only the confirmation POST opts the subscriber out, so mailbox security scanners do not inadvertently unsubscribe them.
- Visit `/admin/subscribers` to verify active subscribers, missing EmailJS configuration, template IDs, Gmail service match and recent send logs.
- If email delivery fails, article publication still succeeds but the editor shows a warning; review failed rows in the outbox. A successful EmailJS API response means accepted by the service, not necessarily inbox delivery.
- **Persistent mailing queue:** On initial publication, one record is added for each opted-in reader to the Neon delivery queue, with a unique article/subscriber key. The sender starts automatically after the editor saves the article.
- **Resume and recovery:** An authenticated daily Vercel cron and Admin → Subscribers manual controls process remaining batches. The worker serializes requests (approximately one every 1.15 seconds) and processes up to 95 per run; remaining recipients stay queued.
- **Limits:** Vercel Hobby cron jobs can only run daily, and EmailJS/Gmail account quotas still apply. A request that was interrupted after sending remains marked sending for human review, avoiding risky automatic duplicate attempts.
- **Historical records:** Messages logged before EmailJS was configured are not silently resent.
- EmailJS free plan currently allows 2 templates and 200 requests per month. One welcome or one subscriber notification counts as one request.
- The website's manual **Email latest articles** digest remains a Resend-only function; it is not secretly sent using the Article template.
- Avoid importing non-consenting addresses. Use your existing explicit newsletter signups.

## 5. Safe verification

1. Create both templates and use EmailJS's built-in **Test** feature to send *only to your own address*.
2. Subscribe with a separate test address; confirm one welcome email and an unsubscribe link.
3. Publish a test article (draft → published) while only your test subscription is active; confirm one notification with the article title, URL, and unsubscribe link.
4. Edit that already published article; confirm no second notification.
5. Unsubscribe the test account and publish another test article; confirm the address is excluded.
6. Check `/admin/subscribers` → Outbox for each attempt.

## References

- https://www.emailjs.com/docs/rest-api/send/
- https://www.emailjs.com/docs/user-guide/creating-email-templates/
- https://www.emailjs.com/docs/user-guide/collecting-contacts/
- https://www.emailjs.com/pricing/

## Status of your setup

Your screenshots confirm the two template IDs and the connected Gmail service `service_59u3x2h`. It does **not** establish that the two EmailJS templates or the Vercel account keys are configured. Create both templates in EmailJS, copy their actual template IDs into Vercel, enable the server/API security configuration, redeploy, and test on your own email address before relying on automatic notifications. EmailJS Free includes 200 requests/month and 2 templates; Gmail is best for low volume, not large-scale email marketing.

## Verified mapping from the EmailJS screenshots

- **Welcome (rename from Contact Us)** — template_hx9pl8s
- **New Article (rename from Contact Us)** — template_k04dawk
- **Gmail service** — service_59u3x2h
- In both templates set To Email to `{{to_email}}`, From Name to `The Abyss`, Reply To to `corrections.theabyss@gmail.com`, leave CC/BCC blank, and keep the default Gmail From Email enabled.
- Your private and public EmailJS account keys are the only required uncommitted secrets. Vercel team authorization is required before ChatGPT can inspect or set them.
