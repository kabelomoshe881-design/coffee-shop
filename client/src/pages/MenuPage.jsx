import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '../components/Header.jsx';
import MenuCard from '../components/MenuCard.jsx';
import CartDrawer from '../components/CartDrawer.jsx';
import { Button, SkeletonCard, ErrorBanner, EmptyState } from '../components/ui.jsx';
import { ArrowRightIcon, ClockIcon, SearchIcon, SparkIcon, CupIcon } from '../components/Icons.jsx';
import { api } from '../api.js';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useTheme } from '../lib/useTheme.js';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../lib/format.js';

export default function MenuPage() {
  const [items, setItems] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);

  const menuRef = useRef(null);
  const { count, add } = useCart();
  const { push } = useToast();
  const { theme, toggleTheme } = useTheme();

  const load = useCallback(async (signal) => {
    setState('loading');
    setError('');
    try {
      const data = await api.menu.list({}, signal);
      setItems(data);
      setState('ready');
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message);
      setState('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const categories = useMemo(() => {
    const present = new Set(items.map((item) => item.category));
    return CATEGORY_ORDER.filter((key) => present.has(key));
  }, [items]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = category === 'all' || item.category === category;
      const matchesQuery =
        !needle ||
        item.name.toLowerCase().includes(needle) ||
        item.description.toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [items, category, query]);

  function handleAdd(item) {
    add(item);
    push(`${item.name} added to your order`);
  }

  function scrollToMenu() {
    menuRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="page">
      <Header cartCount={count} onCartOpen={() => setCartOpen(true)} theme={theme} onToggleTheme={toggleTheme} />

      <main>
        <section className="hero">
          <div className="hero__content">
            <p className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              Open today until 18:00
            </p>
            <h1 className="hero__title">
              Good coffee,
              <br />
              <em>no queue.</em>
            </h1>
            <p className="hero__lede">
              Order ahead from Ground &amp; Grain. We roast in-house, bake at five in the morning,
              and have your cup waiting at the counter.
            </p>
            <div className="hero__actions">
              <Button size="lg" onClick={scrollToMenu}>
                Browse the menu <ArrowRightIcon size={18} />
              </Button>
              <button type="button" className="link-btn" onClick={() => setCartOpen(true)}>
                View order {count > 0 ? `(${count})` : ''}
              </button>
            </div>

            <dl className="hero__stats">
              <div className="hero__stat">
                <dt>Ready in</dt>
                <dd>~8 min</dd>
              </div>
              <div className="hero__stat">
                <dt>On the menu</dt>
                <dd>{state === 'ready' ? `${items.length} items` : '—'}</dd>
              </div>
              <div className="hero__stat">
                <dt>Roasted</dt>
                <dd>In-house</dd>
              </div>
            </dl>
          </div>

          <div className="hero__art" aria-hidden="true">
            <div className="hero__orb" />
            <div className="hero__ring" />
            <div className="hero__card">
              <div className="hero__card-row">
                <span className="dot dot--ready" />
                Order ORD-0042
              </div>
              <p className="hero__card-title">Ready for collection</p>
              <div className="hero__card-bars">
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className="hero__card hero__card--small">
              <SparkIcon size={16} />
              <span>Baked at 05:30</span>
            </div>
            <div className="hero__cup">
              <CupIcon size={64} />
            </div>
          </div>
        </section>

        <section className="menu-section" ref={menuRef} id="menu" aria-labelledby="menu-heading">
          <div className="menu-section__head">
            <div>
              <p className="eyebrow eyebrow--muted">Today&apos;s board</p>
              <h2 className="section-title" id="menu-heading">
                The menu
              </h2>
            </div>

            <div className="menu-search">
              <SearchIcon size={18} />
              <label className="sr-only" htmlFor="menu-search">
                Search the menu
              </label>
              <input
                id="menu-search"
                type="search"
                placeholder="Search coffee, tea, pastries…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          <div className="filter-bar" role="group" aria-label="Filter by category">
            <button
              type="button"
              className={`filter-pill ${category === 'all' ? 'is-active' : ''}`}
              onClick={() => setCategory('all')}
              aria-pressed={category === 'all'}
            >
              Everything
            </button>
            {categories.map((key) => (
              <button
                key={key}
                type="button"
                className={`filter-pill ${category === key ? 'is-active' : ''}`}
                onClick={() => setCategory(key)}
                aria-pressed={category === key}
              >
                {CATEGORY_LABELS[key]}
              </button>
            ))}
          </div>

          {state === 'error' && <ErrorBanner message={error} onRetry={() => load()} />}

          {state === 'loading' && (
            <div className="menu-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          )}

          {state === 'ready' && visible.length === 0 && (
            <EmptyState
              icon={<SearchIcon size={26} />}
              title="Nothing matches that"
              description="Try a different word, or clear the filters to see the whole board."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery('');
                    setCategory('all');
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          )}

          {state === 'ready' && visible.length > 0 && (
            <div className="menu-grid">
              {visible.map((item, index) => (
                <MenuCard key={item.id} item={item} index={index} onAdd={handleAdd} />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <div className="site-footer__inner">
          <div>
            <p className="site-footer__brand">Ground &amp; Grain</p>
            <p className="site-footer__text">24 Roastery Lane, Braamfontein · Mon–Sat 07:00–18:00</p>
          </div>
          <div className="site-footer__meta">
            <span>
              <ClockIcon size={15} /> Collection only
            </span>
            <a href="/staff">Staff dashboard</a>
          </div>
        </div>
      </footer>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
