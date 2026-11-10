import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import {
  Button,
  IconButton,
  TextField,
  Modal,
  StatusPill,
  EmptyState,
  ErrorBanner,
  Spinner,
} from '../components/ui.jsx';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  RefreshIcon,
  GridIcon,
  ListIcon,
  MenuBookIcon,
  LogOutIcon,
  TrendIcon,
  BagIcon,
  ArrowRightIcon,
  CupIcon,
} from '../components/Icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useTheme } from '../lib/useTheme.js';
import { api } from '../api.js';
import {
  formatMoney,
  formatTime,
  STATUS_LABELS,
  STATUS_ORDER,
  NEXT_STATUS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
} from '../lib/format.js';

const TABS = [
  { id: 'overview', label: 'Overview', Icon: GridIcon },
  { id: 'orders', label: 'Orders', Icon: ListIcon },
  { id: 'menu', label: 'Menu', Icon: MenuBookIcon },
];

const EMPTY_FORM = { name: '', description: '', price: '', category: 'coffee', available: true };

export default function StaffDashboard() {
  const { token, username, isStaff, logout } = useAuth();
  const { push } = useToast();
  const { theme, toggleTheme } = useTheme();

  const [tab, setTab] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [editor, setEditor] = useState(null); // { mode: 'create' | 'edit', item }
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(
    async ({ silent = false } = {}) => {
      if (!token) return;
      if (!silent) setLoading(true);
      try {
        const [summaryData, ordersData, menuData] = await Promise.all([
          api.orders.summary(token),
          api.orders.list({}, token),
          api.menu.list({}),
        ]);
        setSummary(summaryData);
        setOrders(ordersData);
        setMenu(menuData);
        setError('');
      } catch (err) {
        if (err.status === 401 || err.status === 403) {
          logout();
          return;
        }
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [token, logout]
  );

  useEffect(() => {
    refresh();
    const timer = window.setInterval(() => refresh({ silent: true }), 15000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders;
    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  const grouped = useMemo(() => {
    const groups = Object.fromEntries(STATUS_ORDER.map((status) => [status, []]));
    for (const order of orders) groups[order.status]?.push(order);
    return groups;
  }, [orders]);

  if (!isStaff) return <Navigate to="/staff/login" replace />;

  async function advance(order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    try {
      const updated = await api.orders.setStatus(order.id, next, token);
      setOrders((current) => current.map((row) => (row.id === order.id ? updated : row)));
      push(`${order.orderNumber} moved to ${STATUS_LABELS[next]}`);
      refresh({ silent: true });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function toggleAvailability(item) {
    try {
      const updated = await api.menu.update(item.id, { available: !item.available }, token);
      setMenu((current) => current.map((row) => (row.id === item.id ? updated : row)));
      push(`${item.name} is now ${updated.available ? 'available' : 'sold out'}`);
    } catch (err) {
      push(err.message, 'error');
    }
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setEditor({ mode: 'create', item: null });
  }

  function openEdit(item) {
    setForm({
      name: item.name,
      description: item.description,
      price: (item.priceCents / 100).toFixed(2),
      category: item.category,
      available: item.available,
    });
    setFormErrors({});
    setEditor({ mode: 'edit', item });
  }

  async function saveItem(event) {
    event.preventDefault();
    const nextErrors = {};
    if (form.name.trim().length < 2) nextErrors.name = 'Name must be at least 2 characters.';
    const price = Number(form.price);
    if (!Number.isFinite(price) || price <= 0) nextErrors.price = 'Enter a price greater than zero.';
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      priceCents: Math.round(price * 100),
      category: form.category,
      available: form.available,
    };

    setSaving(true);
    try {
      if (editor.mode === 'create') {
        await api.menu.create(payload, token);
        push(`${payload.name} added to the menu`);
      } else {
        await api.menu.update(editor.item.id, payload, token);
        push(`${payload.name} updated`);
      }
      setEditor(null);
      refresh({ silent: true });
    } catch (err) {
      if (err.details?.length) {
        setFormErrors(
          Object.fromEntries(err.details.map((detail) => [detail.field, detail.message]))
        );
      }
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.menu.remove(deleteTarget.id, token);
      setMenu((current) => current.filter((row) => row.id !== deleteTarget.id));
      push(`${deleteTarget.name} removed from the menu`);
      setDeleteTarget(null);
      refresh({ silent: true });
    } catch (err) {
      push(err.message, 'error');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const stats = [
    {
      label: 'Orders today',
      value: summary ? String(summary.orderCount) : '—',
      Icon: BagIcon,
      tone: 'ink',
    },
    {
      label: 'Revenue today',
      value: summary ? formatMoney(summary.revenueCents) : '—',
      Icon: TrendIcon,
      tone: 'brown',
    },
    {
      label: 'In progress',
      value: summary ? String(summary.byStatus.pending + summary.byStatus.preparing) : '—',
      Icon: CupIcon,
      tone: 'amber',
    },
    {
      label: 'Ready to collect',
      value: summary ? String(summary.byStatus.ready) : '—',
      Icon: ArrowRightIcon,
      tone: 'green',
    },
  ];

  return (
    <div className="page page--staff">
      <Header
        variant="staff"
        cartCount={0}
        onCartOpen={() => {}}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <div className="staff-shell">
        <aside className="staff-sidebar">
          <div className="staff-sidebar__identity">
            <span className="avatar" aria-hidden="true">
              {(username || 'S').slice(0, 1).toUpperCase()}
            </span>
            <div>
              <p className="staff-sidebar__name">{username || 'staff'}</p>
              <p className="staff-sidebar__role">Shift lead</p>
            </div>
          </div>

          <nav className="staff-nav" aria-label="Dashboard sections">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                className={`staff-nav__item ${tab === id ? 'is-active' : ''}`}
                onClick={() => setTab(id)}
                aria-current={tab === id ? 'page' : undefined}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>

          <div className="staff-sidebar__footer">
            <button type="button" className="staff-nav__item" onClick={() => refresh()}>
              <RefreshIcon size={18} />
              Refresh
            </button>
            <button type="button" className="staff-nav__item staff-nav__item--danger" onClick={logout}>
              <LogOutIcon size={18} />
              Sign out
            </button>
          </div>
        </aside>

        <main className="staff-main">
          <div className="staff-head">
            <div>
              <p className="eyebrow eyebrow--muted">
                {tab === 'overview' ? 'Today at a glance' : tab === 'orders' ? 'Order queue' : 'Menu management'}
              </p>
              <h1 className="staff-title">
                {tab === 'overview' ? 'Good morning' : tab === 'orders' ? 'Orders' : 'The menu'}
              </h1>
            </div>
            <div className="staff-head__actions">
              {tab === 'menu' && (
                <Button onClick={openCreate}>
                  <PlusIcon size={16} /> Add item
                </Button>
              )}
              {tab !== 'menu' && (
                <Button variant="secondary" onClick={() => refresh()} loading={loading && orders.length === 0}>
                  <RefreshIcon size={16} /> Refresh
                </Button>
              )}
            </div>
          </div>

          {error && <ErrorBanner message={error} onRetry={() => refresh()} />}

          {tab === 'overview' && (
            <>
              <div className="stat-grid">
                {stats.map(({ label, value, Icon, tone }) => (
                  <article className={`stat-card stat-card--${tone}`} key={label}>
                    <span className="stat-card__icon" aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    <p className="stat-card__label">{label}</p>
                    <p className="stat-card__value">{value}</p>
                  </article>
                ))}
              </div>

              <section className="board" aria-labelledby="board-title">
                <div className="board__head">
                  <h2 id="board-title" className="board__title">
                    Live board
                  </h2>
                  <span className="board__hint">Updates every 15 seconds</span>
                </div>

                <div className="board__columns">
                  {['pending', 'preparing', 'ready'].map((status) => (
                    <div className={`board-col board-col--${status}`} key={status}>
                      <header className="board-col__head">
                        <StatusPill status={status} />
                        <span className="board-col__count">{grouped[status].length}</span>
                      </header>

                      <div className="board-col__body">
                        {grouped[status].length === 0 && (
                          <p className="board-col__empty">Nothing here</p>
                        )}
                        {grouped[status].map((order) => (
                          <article className="order-card" key={order.id}>
                            <div className="order-card__head">
                              <strong>{order.orderNumber}</strong>
                              <span className="order-card__time">{formatTime(order.createdAt)}</span>
                            </div>
                            <p className="order-card__customer">{order.customerName}</p>
                            <ul className="order-card__items">
                              {order.items.map((line) => (
                                <li key={line.itemId}>
                                  <span>
                                    {line.qty}× {line.name}
                                  </span>
                                  <span>{formatMoney(line.lineTotalCents)}</span>
                                </li>
                              ))}
                            </ul>
                            {order.note && <p className="order-card__note">{order.note}</p>}
                            <div className="order-card__foot">
                              <span>{formatMoney(order.totalCents)}</span>
                              <button
                                type="button"
                                className="order-card__advance"
                                onClick={() => advance(order)}
                              >
                                {STATUS_LABELS[NEXT_STATUS[status]]}
                                <ArrowRightIcon size={14} />
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {tab === 'orders' && (
            <section className="panel" aria-labelledby="orders-title">
              <div className="panel__head">
                <h2 id="orders-title" className="panel__title">
                  All orders
                </h2>
                <div className="filter-bar filter-bar--tight" role="group" aria-label="Filter orders by status">
                  <button
                    type="button"
                    className={`filter-pill ${statusFilter === 'all' ? 'is-active' : ''}`}
                    onClick={() => setStatusFilter('all')}
                    aria-pressed={statusFilter === 'all'}
                  >
                    All
                  </button>
                  {STATUS_ORDER.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`filter-pill ${statusFilter === status ? 'is-active' : ''}`}
                      onClick={() => setStatusFilter(status)}
                      aria-pressed={statusFilter === status}
                    >
                      {STATUS_LABELS[status]}
                    </button>
                  ))}
                </div>
              </div>

              {loading && orders.length === 0 ? (
                <div className="panel__loading">
                  <Spinner label="Loading orders" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <EmptyState
                  icon={<BagIcon size={26} />}
                  title="No orders here"
                  description="New customer orders will appear in this list automatically."
                />
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col">Order</th>
                        <th scope="col">Customer</th>
                        <th scope="col">Items</th>
                        <th scope="col">Total</th>
                        <th scope="col">Placed</th>
                        <th scope="col">Status</th>
                        <th scope="col">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order.id}>
                          <td className="data-table__strong">{order.orderNumber}</td>
                          <td>{order.customerName}</td>
                          <td>{order.items.reduce((sum, line) => sum + line.qty, 0)}</td>
                          <td>{formatMoney(order.totalCents)}</td>
                          <td>{formatTime(order.createdAt)}</td>
                          <td>
                            <StatusPill status={order.status} />
                          </td>
                          <td className="data-table__action">
                            {NEXT_STATUS[order.status] ? (
                              <button
                                type="button"
                                className="text-action"
                                onClick={() => advance(order)}
                              >
                                Mark {STATUS_LABELS[NEXT_STATUS[order.status]].toLowerCase()}
                              </button>
                            ) : (
                              <span className="text-muted">Done</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {tab === 'menu' && (
            <section className="panel" aria-labelledby="menu-title">
              <div className="panel__head">
                <h2 id="menu-title" className="panel__title">
                  Menu items
                </h2>
                <span className="panel__meta">{menu.length} items</span>
              </div>

              {loading && menu.length === 0 ? (
                <div className="panel__loading">
                  <Spinner label="Loading menu" />
                </div>
              ) : menu.length === 0 ? (
                <EmptyState
                  icon={<MenuBookIcon size={26} />}
                  title="The menu is empty"
                  description="Add your first item to start taking orders."
                  action={<Button onClick={openCreate}>Add item</Button>}
                />
              ) : (
                <div className="admin-grid">
                  {menu.map((item) => (
                    <article className="admin-card" key={item.id}>
                      <div className="admin-card__head">
                        <span className={`chip chip--${item.category}`}>
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                        <div className="admin-card__tools">
                          <IconButton label={`Edit ${item.name}`} onClick={() => openEdit(item)}>
                            <PencilIcon size={16} />
                          </IconButton>
                          <IconButton
                            label={`Delete ${item.name}`}
                            className="icon-btn--danger"
                            onClick={() => setDeleteTarget(item)}
                          >
                            <TrashIcon size={16} />
                          </IconButton>
                        </div>
                      </div>

                      <h3 className="admin-card__name">{item.name}</h3>
                      <p className="admin-card__desc">{item.description}</p>

                      <div className="admin-card__foot">
                        <strong>{formatMoney(item.priceCents)}</strong>
                        <div className="switch-row">
                          <span className="switch-row__label">
                            {item.available ? 'Available' : 'Sold out'}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={item.available}
                            aria-label={`Toggle availability for ${item.name}`}
                            className={`switch ${item.available ? 'is-on' : ''}`}
                            onClick={() => toggleAvailability(item)}
                          >
                            <span className="switch__thumb" />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      <Modal
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        title={editor?.mode === 'create' ? 'Add menu item' : 'Edit menu item'}
        description="Changes appear on the customer menu immediately."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditor(null)}>
              Cancel
            </Button>
            <Button type="submit" form="menu-form" loading={saving}>
              {editor?.mode === 'create' ? 'Add item' : 'Save changes'}
            </Button>
          </>
        }
      >
        <form id="menu-form" className="form-grid" onSubmit={saveItem} noValidate>
          <TextField
            id="item-name"
            label="Name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            error={formErrors.name}
            maxLength={80}
          />

          <div className="form-grid__row">
            <TextField
              id="item-price"
              label="Price (R)"
              type="number"
              step="0.01"
              min="0.50"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              error={formErrors.price}
            />

            <div className="field">
              <label className="field__label" htmlFor="item-category">
                Category
              </label>
              <select
                id="item-category"
                className="field__input"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              >
                {CATEGORY_ORDER.map((key) => (
                  <option key={key} value={key}>
                    {CATEGORY_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <TextField
            id="item-description"
            as="textarea"
            rows={3}
            label="Description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            maxLength={300}
          />

          <label className="check-row">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(event) => setForm({ ...form, available: event.target.checked })}
            />
            <span>Available for ordering</span>
          </label>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete menu item?"
        description="This cannot be undone. Items used by open orders cannot be deleted."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Keep it
            </Button>
            <Button variant="danger" loading={deleting} onClick={confirmDelete}>
              Delete item
            </Button>
          </>
        }
      >
        <p className="confirm-text">
          <strong>{deleteTarget?.name}</strong> will be removed from the menu. Consider marking it
          sold out instead if you may bring it back.
        </p>
      </Modal>
    </div>
  );
}
