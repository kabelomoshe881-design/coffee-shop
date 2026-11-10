import { PlusIcon, CheckIcon } from './Icons.jsx';
import { CATEGORY_LABELS, formatMoney } from '../lib/format.js';

export default function MenuCard({ item, onAdd, index = 0 }) {
  const available = item.available;

  return (
    <article
      className={`menu-card ${available ? '' : 'menu-card--soldout'}`.trim()}
      style={{ '--stagger': `${Math.min(index, 12) * 35}ms` }}
    >
      <div className="menu-card__top">
        <span className={`chip chip--${item.category}`}>{CATEGORY_LABELS[item.category] || item.category}</span>
        {!available && <span className="chip chip--muted">Sold out</span>}
      </div>

      <h3 className="menu-card__name">{item.name}</h3>
      <p className="menu-card__desc">{item.description || 'Freshly prepared to order.'}</p>

      <div className="menu-card__footer">
        <span className="menu-card__price">{formatMoney(item.priceCents)}</span>
        <button
          type="button"
          className="add-btn"
          onClick={() => onAdd(item)}
          disabled={!available}
          aria-label={available ? `Add ${item.name} to cart` : `${item.name} is sold out`}
        >
          {available ? <PlusIcon size={16} /> : <CheckIcon size={16} />}
          <span>{available ? 'Add' : 'Unavailable'}</span>
        </button>
      </div>
    </article>
  );
}
