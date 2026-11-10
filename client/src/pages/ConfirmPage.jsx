import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '../components/Header.jsx';
import { Button, StatusPill, ErrorBanner, Spinner } from '../components/ui.jsx';
import { CheckIcon, ClockIcon, ArrowLeftIcon, CupIcon } from '../components/Icons.jsx';
import { api } from '../api.js';
import { useTheme } from '../lib/useTheme.js';
import { formatMoney, formatTime, STATUS_ORDER, STATUS_LABELS } from '../lib/format.js';

const TRACKER_COPY = {
  pending: 'We have your order. The barista will start shortly.',
  preparing: 'Your order is being made right now.',
  ready: 'Ready at the counter — come and collect.',
  collected: 'Collected. Enjoy it.',
};

export default function ConfirmPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;
    let timer;

    async function fetchOrder(showSpinner = true) {
      if (showSpinner) setState('loading');
      try {
        const data = await api.orders.get(id);
        if (cancelled) return;
        setOrder(data);
        setState('ready');
        setError('');
        if (data.status !== 'collected') {
          timer = window.setTimeout(() => fetchOrder(false), 10000);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
        setState('error');
      }
    }

    fetchOrder();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [id]);

  const currentStep = order ? STATUS_ORDER.indexOf(order.status) : -1;

  return (
    <div className="page">
      <Header
        cartCount={0}
        onCartOpen={() => {}}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="confirm">
        {state === 'loading' && (
          <div className="confirm__loading">
            <Spinner label="Loading your order" />
          </div>
        )}

        {state === 'error' && (
          <div className="confirm__inner">
            <ErrorBanner message={error} />
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        )}

        {state === 'ready' && order && (
          <div className="confirm__inner">
            <div className="confirm__hero">
              <span className="confirm__check" aria-hidden="true">
                <CheckIcon size={26} />
              </span>
              <p className="eyebrow eyebrow--muted">Order confirmed</p>
              <h1 className="confirm__number">{order.orderNumber}</h1>
              <p className="confirm__lede">
                Thanks {order.customerName.split(' ')[0]}. We&apos;ll call your name when it&apos;s
                ready — no need to wait at the counter.
              </p>
              <div className="confirm__meta">
                <span>
                  <ClockIcon size={15} /> Placed {formatTime(order.createdAt)}
                </span>
                <StatusPill status={order.status} />
              </div>
            </div>

            <section className="tracker" aria-labelledby="tracker-title">
              <h2 className="sr-only" id="tracker-title">
                Order progress
              </h2>
              <ol className="tracker__steps">
                {STATUS_ORDER.map((status, index) => {
                  const done = index < currentStep;
                  const current = index === currentStep;
                  return (
                    <li
                      key={status}
                      className={`tracker__step ${done ? 'is-done' : ''} ${current ? 'is-current' : ''}`.trim()}
                      aria-current={current ? 'step' : undefined}
                    >
                      <span className="tracker__dot" aria-hidden="true">
                        {done ? <CheckIcon size={13} /> : index + 1}
                      </span>
                      <span className="tracker__label">{STATUS_LABELS[status]}</span>
                    </li>
                  );
                })}
              </ol>
              <p className="tracker__copy" aria-live="polite">
                {TRACKER_COPY[order.status]}
              </p>
            </section>

            <section className="receipt" aria-labelledby="receipt-title">
              <header className="receipt__head">
                <h2 id="receipt-title">
                  <CupIcon size={18} /> Your items
                </h2>
                <span className="receipt__count">
                  {order.items.reduce((sum, line) => sum + line.qty, 0)} items
                </span>
              </header>

              <ul className="receipt__lines">
                {order.items.map((line) => (
                  <li key={line.itemId}>
                    <span className="receipt__qty">{line.qty}×</span>
                    <span className="receipt__name">{line.name}</span>
                    <span className="receipt__price">{formatMoney(line.lineTotalCents)}</span>
                  </li>
                ))}
              </ul>

              {order.note && (
                <p className="receipt__note">
                  <strong>Note:</strong> {order.note}
                </p>
              )}

              <div className="receipt__total">
                <span>Total due at counter</span>
                <strong>{formatMoney(order.totalCents)}</strong>
              </div>
            </section>

            <div className="confirm__actions">
              <Link to="/" className="btn btn--secondary btn--md">
                <ArrowLeftIcon size={16} />
                <span className="btn__label">Back to the menu</span>
              </Link>
              <Link to="/" className="btn btn--primary btn--md">
                <span className="btn__label">Order something else</span>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
