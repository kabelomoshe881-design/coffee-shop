# Menu page override

Overrides `MASTER.md` for the customer menu — `client/src/pages/MenuPage.jsx`.

## Density — spacious

- Section padding: `20px 24px 96px`; card padding `22px`; grid gap `18px`.
- Grid: `repeat(auto-fill, minmax(272px, 1fr))`.
- One idea per card. No badges beyond the category chip and the sold-out chip.

## Hero

- Display type `clamp(46px, 7vw, 88px)`, line-height `0.96`, tracking `-0.035em`.
- Second line is italic in `--primary`. That italic is the only ornament in the hero.
- Exactly one primary CTA plus one text link. The generated "Funnel" pattern applies
  here: menu → cart → confirmation, with a mini-CTA on every card.
- Art is CSS only (orb, dashed ring, two floating cards). No stock photography —
  the anti-pattern list forbids poor food photos, and a fake photo is worse than none.

## Rules

- Sold out: card `opacity: .62`, button disabled, label reads "Unavailable".
- Price uses `--font-display` at 21px. Never mono — mono is reserved for order numbers.
- Category colour appears **only** in the chip. Do not tint the whole card.
- Filter bar is sticky under the 68px header, with a gradient fade rather than a hard edge.

## Motion

- Card entrance: 14px translate + fade, 380ms, `35ms` stagger capped at 12 cards.
- Hover: `translateY(-4px)` + `--shadow-lg` over 220ms. No layout shift.
- All of it collapses under `prefers-reduced-motion`.
