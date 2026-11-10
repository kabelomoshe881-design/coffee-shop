# Staff dashboard override

Overrides `MASTER.md` for `client/src/pages/StaffDashboard.jsx` and `StaffLogin.jsx`.

The generated style was **Vibrant & Block-based** with a marketing funnel pattern.
That is correct for the customer side and wrong for staff, who need density and
legibility under time pressure. This override replaces it.

## Density — high (`--density 8`)

- Main padding `30px clamp(18px, 3vw, 40px) 64px`; card gaps `14px`; table cells `12px`.
- Display type caps at 40px. Nothing larger.
- No hero, no decorative art, no radial gradient blobs, no italic display type.

## Colour carries meaning

| Status | Token pair |
| --- | --- |
| Pending | `--warning-bg` / `--warning-ink` |
| Preparing | `--info-bg` / `--info-ink` |
| Ready | `--success-bg` / `--success-ink` |
| Collected | `--surface-2` / `--ink-muted` |

- Status colour is **always** paired with a text label in the pill. Colour alone fails WCAG 1.4.1.
- Stat cards tint only the icon chip, never the card background.
- Availability switch: green = on, neutral grey = off, plus a text label beside it.

## Layout

- 236px sticky sidebar; collapses to a horizontal scroll strip below 900px.
- Live board is 3 columns above 1080px, 1 column below.
- Tables scroll horizontally inside `.table-wrap`; the page itself never scrolls sideways.
- The board polls every 15s. Do not add a full-page spinner for background refreshes —
  only the first load shows a skeleton.

## Actions

- Status advancement is an explicit button ("Mark preparing"), never drag and drop.
  Drag is unreliable with a keyboard and on touch.
- Destructive actions always open a confirmation modal that names the item.
