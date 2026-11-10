import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './Icons.jsx';

export function Button({ variant = 'primary', size = 'md', loading = false, children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`btn btn--${variant} btn--${size} ${className}`.trim()}
      disabled={loading || props.disabled}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      <span className="btn__label">{children}</span>
    </button>
  );
}

export function IconButton({ label, children, className = '', ...props }) {
  return (
    <button {...props} type={props.type || 'button'} className={`icon-btn ${className}`.trim()} aria-label={label}>
      {children}
    </button>
  );
}

export function TextField({ label, id, error, hint, as = 'input', className = '', inputRef, ...props }) {
  const describedBy =
    [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;

  const shared = {
    id,
    ref: inputRef,
    className: `field__input ${className}`.trim(),
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': describedBy,
    ...props,
  };

  return (
    <div className={`field ${error ? 'field--invalid' : ''}`.trim()}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {as === 'textarea' ? <textarea {...shared} /> : <input {...shared} />}
      {hint && (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function StatusPill({ status }) {
  const labels = { pending: 'Pending', preparing: 'Preparing', ready: 'Ready', collected: 'Collected' };
  return <span className={`pill pill--${status}`}>{labels[status] || status}</span>;
}

export function Spinner({ label = 'Loading' }) {
  return (
    <span className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton--chip" />
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--line" />
      <div className="skeleton skeleton--line short" />
      <div className="skeleton skeleton--footer" />
    </div>
  );
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state__icon">{icon}</div>}
      <h3 className="empty-state__title">{title}</h3>
      {description && <p className="empty-state__text">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="banner banner--error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="banner__action" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Modal({ open, onClose, title, description, children, footer }) {
  const dialogRef = useRef(null);
  // Keep the latest callback without making it an effect dependency: an inline
  // arrow from the parent would otherwise re-run this effect on every keystroke,
  // which steals focus from the field the user is typing in.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement;
    const focusables = () =>
      [
        ...(dialogRef.current?.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) || []),
      ].filter((el) => el.getClientRects().length > 0);

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    const frame = requestAnimationFrame(() => {
      // Focus the first form field, not the header close button.
      const field = dialogRef.current?.querySelector(
        'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
      );
      (field || dialogRef.current)?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="modal-layer">
      <div className="modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? 'modal-description' : undefined}
        ref={dialogRef}
        tabIndex={-1}
      >
        <header className="modal__header">
          <div>
            <h2 className="modal__title" id="modal-title">
              {title}
            </h2>
            {description && (
              <p className="modal__description" id="modal-description">
                {description}
              </p>
            )}
          </div>
          <IconButton label="Close dialog" onClick={onClose}>
            <CloseIcon size={18} />
          </IconButton>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}
