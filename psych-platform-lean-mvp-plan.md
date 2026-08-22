# Lean MVP Plan — Psychology Community + In-Clinic Booking Platform

## What changed from the full plan
- **No video calls** — biggest cost driver removed. Consultations happen in-person/by phone at your clinic; the platform just handles discovery + booking.
- **Free-tier infrastructure** — Supabase over a self-managed backend, Vercel for hosting, your existing domain.
- **No external psychologist verification workflow** — since you're only listing your own clinic's already-verified PhD holders, admin just adds/edits their profiles directly. No public "apply to be listed" queue needed for v1.
- **Payment reality check for Pakistan** — see below, this affects your launch timeline more than anything else.

---

## 1. The Stripe problem (important — check this first)

Stripe does not officially support Pakistan-registered businesses as of 2026 — Pakistan isn't on their supported-country list, and the "workaround" (incorporating a UK/US company to open a Stripe account) is real but adds legal/admin overhead you probably don't want for a v1. This is not a Claude-training-data-is-old issue — it's current.

Realistic options, cheapest/fastest first:
1. **No online payment gateway at v1** — user books a slot, pays cash or bank transfer/JazzCash at the clinic, admin marks the booking "paid" manually. Zero integration cost, zero approval wait. This is the fastest path to a *working version*.
2. **Local aggregator gateway** (e.g. Safepay, PayFast, Simpaisa) — these plug into JazzCash, EasyPaisa, and cards, built for Pakistani businesses. Requires business registration docs and an approval process before you can go live with real transactions — budget a few weeks for onboarding.
3. **Stripe via foreign incorporation** — skip this for a first version; it's overhead you don't need yet.

Recommendation: **launch with option 1** (manual payment confirmation), and wire in a local gateway once you've validated the platform actually gets bookings. Don't let payment-gateway approval delay your working version.

---

## 2. Lean tech stack (free tier first)

| Layer | Choice | Why free/cheap |
|---|---|---|
| Frontend + backend | **Next.js**, hosted on **Vercel (free tier)** | One codebase, generous free hosting, easy custom domain — point your existing domain at it for free |
| Database + Auth + Storage | **Supabase (free tier)** | Postgres DB, built-in authentication, and file storage (for psychologist photos/credentials) all in one — this replaces a lot of backend code you'd otherwise write yourself |
| Email (booking confirmations) | **Resend or Supabase's built-in SMTP** (free tier) | Enough for confirmation/reminder emails at low volume |
| Payments | **Manual confirmation at v1** → local gateway later | See section 1 |

Why Supabase over MongoDB here: bookings need real relational integrity (a slot shouldn't be double-booked, a payment should tie cleanly to one booking) — Postgres handles that naturally, and Supabase's free tier includes auth and storage, which saves you from building those separately.

**Free tier limits to know about**: Supabase free projects pause after a week of no activity (auto-resumes on next request, just a few seconds delay) and cap storage around 500MB — completely fine for an MVP with a small clinic's worth of psychologists and early community traffic. Vercel's free tier is generous for a site this size. You'll outgrow both eventually, but not before you've validated the idea.

---

## 3. Core features (v1 scope)

### Community
- Sign up / log in (Supabase Auth — email or Google)
- Create/edit posts, comment, like
- Basic tagging (anxiety, relationships, self-help, etc.)
- Report-a-post button → admin review queue

### Psychologist Directory (internal roster, not public applications)
- Admin adds each psychologist's profile: name, credentials, specialties, bio, photo
- Public profile page per psychologist

### Booking
- Psychologist availability set by admin (simple weekly schedule)
- User picks a slot → booking created with status "pending payment"
- Confirmation email to user + admin
- Admin marks "paid" once payment is confirmed at the clinic (or via gateway later)
- Basic cancellation/reschedule

### Admin Panel
- Add/edit psychologist profiles
- Manage availability
- View/manage bookings, mark paid
- Moderate reported community posts

---

## 4. Data model (video/payment-gateway tables removed for now)

```
User (id, email, password_hash, role[user|admin], profile)
Post (id, author_id, title, body, tags, status, created_at)
Comment (id, post_id, author_id, body)
Psychologist (id, name, credentials, specialties, bio, photo_url) -- admin-managed, no self-signup
Availability (id, psychologist_id, day, start_time, end_time)
Booking (id, user_id, psychologist_id, slot_time, status[pending|paid|cancelled|completed])
Report (id, target_type, target_id, reporter_id, reason, status)
```

---

## 5. Fastest path to a working version

| Step | Scope | Est. time* |
|---|---|---|
| 1 | Supabase + Next.js + Vercel setup, point domain, auth working | 2-4 days |
| 2 | Community: posts, comments, likes | 1-1.5 weeks |
| 3 | Psychologist profiles (admin-managed) + public directory pages | 3-5 days |
| 4 | Booking flow (availability, slot picking, pending/paid status) | 1-1.5 weeks |
| 5 | Admin panel (manage psychologists, bookings, moderation) | 1 week |
| 6 | Manual-payment flow polish, email confirmations, basic testing | 3-5 days |

*Solo developer, working steadily. This gets you to a real, usable working version — payment gateway and any future video-call feature are deliberately deferred, not missing by accident.

---

## 6. What to add later (not now)
- Automated local payment gateway (Safepay/PayFast/Simpaisa) once you're ready to handle the business-verification process
- Video consultations, if you ever want remote sessions instead of in-clinic only
- Public psychologist applications, if you expand beyond your own clinic's staff
- Search/analytics upgrades once traffic justifies them

---

## 7. Immediate next steps
1. Decide: fully manual payment at launch, or start the local gateway application now in parallel (it takes time to get approved, so starting the paperwork early doesn't block dev work).
2. Set up Supabase project + Vercel project, connect your domain.
3. Build Phase 1-2 (auth + community) first — same reasoning as before, it's the lowest-risk part and gets you a live, working site fastest.
