# Celebration ticket

Students are outdoors with friends and one free hand. A colourful celebration ticket frames the wheel, the main interaction.

- Canonical indigo #384090, magenta #C02080, sunrise #E0A010 with documented tints. White and indigo tint surfaces for daylight.
- Hind Siliguri for Bangla and Poppins for Latin. Real Shikho logo on white.
- Welcome: big local greeting, wheel, illustrated prizes, one start action. EduTab draw separately explained.
- Registration: two short form screens, first name and phone, then study group and consent. Inline errors and a visible next action.
- Play: large touch target, fixed pointer, velocity-sensitive inertia, button alternative.
- Result: four guided screens with horizontal transitions: colourful gift reveal, collection code and Dhaka expiry, EduTab draw, then app and one sharing action. Primary navigation fits small phone viewports. The saved PNG exports the same branded gift component with the winner's unique code, without their name or phone number.
- Desktop: two-column composition with mobile note; mouse and keyboard remain usable.
- Reduced motion: no confetti or inertia; reveal the same committed outcome quickly.
- Ops: standard login, tabs, funnel table and redemption form. No public participant data.

EduTab uses the actual Shikho shop campaign image, with its dark indigo science imagery, product front/back views and learning app screen. The draw panel carries that artwork intact, paired with a separate three-winner strip.
Source: https://shop.shikho.com/products/walton-tablet-c190404a?category=tablet&pId=69438f612c163fa242796a4a
Asset: https://res.cloudinary.com/cross-border-education-technologies-pte-ltd/image/upload/v1766036405/spgtndvgyq91axd5r0eh

Landing refinement: a single settling wheel animation invites play, and tapping the preview starts registration. The greeting, three-step explanation, wheel and CTA stay grouped; the EduTab teaser fits the first viewport. Reduced-motion users see a still wheel.

The homepage EduTab teaser uses the campaign's near-black navy, electric indigo and magenta glow. It rises into view once after the main wheel settles; reduced-motion users see it immediately. The saved gift replaces the campaign URL with the winner's unique redemption code.

EduTab has a dark full-width screen, official artwork and four specs from the shop's second product image: Helio G99, 4 GB RAM / 128 GB storage, 8.6-inch HD screen and 6,000 mAh battery. The final community invitation uses the COO-provided 40 lakh learning community figure, not a claim about Facebook group membership. Demo copy mirrors production while requests and prizes remain isolated.

Expiry readability: Noto Sans Bengali for small collection text and the gift seal. Show the deadline in a separate high-contrast panel with Latin digits, a full Bangla date, 12-hour AM/PM time and an explicit Bangladesh timezone label. Keep the actual 72-hour validity unchanged. The export seal wraps its text in a non-shrinking, no-wrap span to prevent browser-specific flex wrapping.

Copy voice: short, conversational Bangla guided by Shikho social captions. Give each screen one instruction; remove abstract adventure language and repeated celebration lines. Keep consent purposes, one-spin eligibility, unequal odds, validity and national-draw timing explicit. Expiry and community text are centre-aligned. Form fields retain conventional left-aligned labels.

Team review follow-up: registration explicitly precedes spinning. The registered wheel supports an accessible centre button alongside gesture and footer-button controls. Browser history tracks form and result steps without storing personal information; revisiting earlier steps cannot reroll an awarded entry. Demo replay alone restarts registration. Discounts explain representative callbacks while physical gifts retain stall collection. Community membership has an explicit button-style link; the final return action reads “তোমার উপহার দেখো”. CRM delivery runs from a durable outbox after registration and prize commitment.
## 2026-09-10 landing height adaptation

- Keep the EduTab teaser in the content flow directly after the wheel controls.
- Do not use spare viewport height as a gap between related actions.
- Short, regular, and tall phones must keep a compact gap and show the full teaser without horizontal overflow.

## 2026-09-10 mobile journey audit

- Group each screen's content with its next action so tall phones do not create artificial gaps between them.
- Let screens scroll vertically on short phones, reset each new screen to the top, and keep every primary action visible at 360 x 640 and above.
- Keep visible touch targets at least 44 pixels tall and small Bangla supporting text at 13 pixels or larger.
- Use safe-area padding at the bottom of mobile screens.
- Load the two journey-critical EduTab images eagerly and retain a branded fallback surface while they load.
- Keep the four result screens focused: gift reveal, claim instructions, EduTab draw, then app, community and sharing.
