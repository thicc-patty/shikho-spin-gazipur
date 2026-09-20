# Shikho spin

<!-- impeccable:product-schema 1 -->

## Platform
web

## Users and purpose
Bangla-speaking GPA5 students on mobile at Prothom Alo and Shikho celebrations. Register name, phone and study group, spin once per phone across the campaign, collect a prize and enter the separate national EduTab draw.

## Confirmed rules, September 10, 2026
- Configurable locations. Chattogram is the first event.
- Groups: science, humanities, business studies, madrasah, technical, other.
- HSC 28 discounts of 20%, 30%, 40%, 50%, 60%, valid for 72 hours after winning.
- Starting odds: 41%, 28%, 18%, 8%, 3%, book 1.5%, bag 0.5%. The 1% removed from books is allocated to the 20% discount.
- Three EduTab winners in a national live draw in mid-October. EduTab is not a wheel prize.
- Gesture speed controls animation, never probability. Server selection and persistent phone uniqueness.
- Physical prizes collected at the nearby Shikho stall. Ask students to explore; no invented directions.
- Store registration, outcomes and funnel events without another paid analytics service.
- CRM upsert by phone refreshes name, Class 11, group and passing year 2028. A separate filterable completion event records the campaign, venue and exact prize.
- Community: https://www.facebook.com/groups/shikhocommunity
- App: https://play.google.com/store/apps/details?id=tech.shikho.android&hl=en

## Brand commitments
Bright, bouncy celebration-ticket journey. Bangla, genuine Shikho logo, canonical brand colours and fonts. Working coded experience first approved by the COO.

## Open details
Physical stock counts not provided. Optional event caps; absent caps mean approved odds without a stock limit. CRM delivery uses the production API and a durable retry queue. No OTP provider; phone uniqueness is not proof of ownership. Cloudflare Turnstile protects registration when its production keys are configured, with five attempts per IP per ten minutes and one campaign entry per phone.

## Internal demo
The COO requested a reusable demo URL for internal play. `/demo` uses the same journey and odds with repeat play, no saved registration data, and no live prizes or CRM records. The removed feedback form no longer exposes a public write endpoint; historical feedback remains visible only in Operations.
