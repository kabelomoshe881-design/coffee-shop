import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../api.js';
import { formatMoney } from '../lib/format.js';
import { Button, TextField, EmptyState, IconButton } from './ui.jsx';
import { CartIcon, CloseIcon, MinusIcon, PlusIcon, TrashIcon, ArrowRightIcon, BagIcon } from './Icons.jsx';

export default function CartDrawer({ open, onClose }) {
  const { lines, count, totalCents, setQty, remove, clear, maxQty } = useCart();
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const panelRef = useRef(null);
  const nameRef = useRef(null);
  const navigate = useNavigate();
  const { push } = useToast();

  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    setServerError('');

    if (name.trim().length < 2) {
      setFieldError('Enter the name the order should be called out under.');
      nameRef.current?.focus();
      return;
    }
    setFieldError('');
    setSubmitting(true);

    try {
      const order = await api.orders.create({
        customerName: name.trim(),
        note: note.trim() || undefined,
        items: lines.map((line) => ({ itemId: line.itemId, qty: line.qty })),
      });

      clear();
      setName('');
      setNote('');
      onClose();
      push(`Order ${order.orderNumber} placed`);
      navigate(`/order/${order.id}`);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="drawer-layer">
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        ref={panelRef}
        tabIndex={-1}
      >
        <header className="drawer__header">
          <div className="drawer__heading">
            <CartIcon size={20} />
            <h2 id="cart-title">Your order</h2>
            {count > 0 && <span className="drawer__count">{count}</span>}
          </div>
          <IconButton label="Close cart" onClick={onClose}>
            <CloseIcon size={18} />
          </IconButton>
        </header>

        {lines.length === 0 ? (
          <div className="drawer__body drawer__body--empty">
            <EmptyState
              icon={<BagIcon size={28} />}
              title="Nothing in the cup yet"
              description="Add something from the menu and it will appear here."
              action={
                <Button variant="secondary" onClick={onClose}>
                  Browse the menu
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="drawer__body">
              <ul className="cart-list">
                {lines.map((line) => (
                  <li className="cart-line" key={line.itemId}>
                    <div className="cart-line__main">
                      <p className="cart-line__name">{line.name}</p>
                      <p className="cart-line__unit">{formatMoney(line.priceCents)} each</p>
                    </div>

                    <div className="stepper" role="group" aria-label={`Quantity for ${line.name}`}>
                      <button
                        type="button"
                        className="stepper__btn"
                        onClick={() => setQty(line.itemId, line.qty - 1)}
                        aria-label={`Decrease quantity of ${line.name}`}
                      >
                        <MinusIcon size={14} />
                      </button>
                      <span className="stepper__value" aria-live="polite">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        className="stepper__btn"
                        onClick={() => setQty(line.itemId, line.qty + 1)}
                        disabled={line.qty >= maxQty}
                        aria-label={`Increase quantity of ${line.name}`}
                      >
                        <PlusIcon size={14} />
                      </button>
                    </div>

                    <span className="cart-line__total">{formatMoney(line.priceCents * line.qty)}</span>

                    <IconButton
                      label={`Remove ${line.name} from cart`}
                      className="cart-line__remove"
                      onClick={() => remove(line.itemId)}
                    >
                      <TrashIcon size={16} />
                    </IconButton>
                  </li>
                ))}
              </ul>

              <button type="button" className="link-btn" onClick={clear}>
                Clear cart
              </button>

              <form className="checkout" onSubmit={handleSubmit} noValidate>
                <TextField
                  inputRef={nameRef}
                  id="customer-name"
                  label="Name for the order"
                  placeholder="e.g. Thabo"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (fieldError) setFieldError('');
                  }}
                  error={fieldError}
                  autoComplete="name"
                  maxLength={60}
                />

                <TextField
                  id="order-note"
                  as="textarea"
                  rows={2}
                  label="Notes for the barista"
                  hint="Optional — allergies, milk choice, extra hot."
                  placeholder="Oat milk, no sugar"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={200}
                />

                {serverError && (
                  <div className="banner banner--error" role="alert">
                    <p>{serverError}</p>
                  </div>
                )}

                <div className="checkout__summary">
                  <span>Total</span>
                  <strong>{formatMoney(totalCents)}</strong>
                </div>

                <Button type="submit" size="lg" loading={submitting} className="checkout__submit">
                  Place order <ArrowRightIcon size={18} />
                </Button>
                <p className="checkout__note">Pay at the counter when you collect.</p>
              </form>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
