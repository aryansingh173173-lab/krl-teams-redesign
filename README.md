# KRL Teams — Smart Farming Command Centre

Operational prototype for the Krishi Ratna League Bengal programme.

Product identity: **KRL Teams** / Smart Farming Command Centre.  
This repository is independent of KRL Media Connect.

## Hierarchy
West Bengal → District → Assembly Constituency → Team → Agent → Farmer → Farm 360°

## Numbers
- 5,000 farmers = programme target
- 360 / 413 / 120 = demo book volumes
- 15 official teams + 5 identity-pending slots
- 294 assembly constituencies

## Run locally
```
python -m http.server 8788
```

## Architecture
Vanilla HTML / CSS / JS. No framework, no database.

## Design

The redesign follows the [BKS Pujo sponsor briefing](https://bks-pujo-demo.vercel.app/)
and its source palette: midnight `#0D0D0D`, burgundy `#710912`, espresso
`#362822`, champagne `#EFE5D2`, and antique gold `#C28D39`. Rounded glass cards,
gold gradients, glowing borders, original team logos and cinematic artwork carry
through the homepage and all working screens. KRL's programme records and routes
remain in place.

- `editorial.css`: responsive visual theme, homepage and shared component styles.
- `command.css`: base layouts and original component structure.
- `typography.css`: larger Outfit typography, responsive spacing and original logo treatments.
- `command.js`: views, routing, search, filters and mobile navigation.
- `command-data.js`: existing programme records (unchanged by the redesign).
- `fonts/outfit-*`: the repository's locally served Outfit family, used throughout the English site.
- Bengali text uses the repository's Noto Sans Bengali family.
- `images/teams/`: all fifteen original official team logos, used across the site.
- `images/krl-logo.png`: original KRL logo used for the header, footer and favicon.
- `images/gold/`: two illustrative artworks and a shared icon sprite. Earlier
  presentation-emblem experiments remain on disk but are not used. See `ASSET-NOTES.md`.

The homepage distinguishes programme targets from authored records. Field photos
are labelled as editorial context. The EN/Bangla switch retains the original
partial translation support, with translated homepage headline and actions.

Search opens with `/` and closes with Escape. On smaller screens, Menu exposes
all nine sections; the bottom bar provides shortcuts to the farm and field work.

The homepage's regional selector browses the team's geography. Pause motion
stops the cinematic image movement and entrance effects and persists locally.
System reduced-motion preferences also disable those effects. Documentary
archive photos retain their source captions; generated artwork is labelled as
concept illustration. Body text is 18px, with labels at least 14px and larger
headings, controls and cards adjusted for narrow screens.
