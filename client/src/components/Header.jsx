import { Link, NavLink } from 'react-router-dom';
import { CartIcon, CupIcon, MoonIcon, SunIcon, GridIcon } from './Icons.jsx';

export default function Header({ cartCount, onCartOpen, theme, onToggleTheme, variant = 'customer' }) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand" aria-label="Ground and Grain home">
          <span className="brand__mark" aria-hidden="true">
            <CupIcon size={22} />
          </span>
          <span className="brand__text">
            <span className="brand__name">Ground &amp; Grain</span>
            <span className="brand__tag">Coffee Roasters · Est. 2019</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Main">
          {variant === 'customer' ? (
            <>
              <NavLink to="/" className="site-nav__link" end>
                Menu
              </NavLink>
              <NavLink to="/staff" className="site-nav__link">
                Staff
              </NavLink>
            </>
          ) : (
            <NavLink to="/staff" className="site-nav__link site-nav__link--active">
              <GridIcon size={16} /> Dashboard
            </NavLink>
          )}
        </nav>

        <div className="site-header__actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            aria-pressed={theme === 'dark'}
          >
            <span className="theme-toggle__thumb" aria-hidden="true" />
            <span className="theme-toggle__icon theme-toggle__icon--sun" aria-hidden="true">
              <SunIcon size={14} />
            </span>
            <span className="theme-toggle__icon theme-toggle__icon--moon" aria-hidden="true">
              <MoonIcon size={14} />
            </span>
          </button>

          {variant === 'customer' && (
            <button type="button" className="cart-btn" onClick={onCartOpen} aria-label={`Open cart, ${cartCount} items`}>
              <CartIcon size={20} />
              <span className="cart-btn__text">Cart</span>
              {cartCount > 0 && <span className="cart-btn__count">{cartCount}</span>}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
