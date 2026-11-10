# Cart drawer override

Overrides `MASTER.md` for `client/src/components/CartDrawer.jsx`.

## Density — dense, transactional

The cart is a checkout surface, not a marketing surface. Drop the hero rhythm.

- Panel width `min(448px, 100%)`; body padding `20px 22px 28px`.
- Line items use a 4-column grid: name | stepper | line total | remove.
  Never stack the price under the name on desktop.

## Motion

- Panel slides in from the right over 380ms with `--ease`.
- Backdrop fades over 220ms with a 3px blur.
- Closing is instant on Escape; focus returns to the cart button.

## Feedback

- Quantity changes are immediate — no spinner, no confirm.
- `aria-live="polite"` on the quantity value so a screen reader hears the new count.
- Field errors sit inline under the input **and** are referenced with `aria-describedby`.
- Server errors (for example `ITEM_UNAVAILABLE`) appear in a `role="alert"` banner above
  the submit button, never in a toast that can be missed.

## Type

- Total: `--font-display` at 26px — the loudest element in the panel.
- Unit prices: 12px muted. Line totals: 14px bold, tabular numerals.
