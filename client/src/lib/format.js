const currency = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
});

export const formatMoney = (cents) => currency.format((cents || 0) / 100);

const timeFormat = new Intl.DateTimeFormat('en-ZA', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export const formatTime = (iso) => (iso ? timeFormat.format(new Date(iso)) : '—');

export const formatDate = (iso) =>
  iso
    ? new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short' }).format(new Date(iso))
    : '—';

export const STATUS_LABELS = {
  pending: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready',
  collected: 'Collected',
};

export const STATUS_ORDER = ['pending', 'preparing', 'ready', 'collected'];

export const NEXT_STATUS = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'collected',
  collected: null,
};

export const CATEGORY_LABELS = {
  coffee: 'Coffee',
  tea: 'Tea',
  pastry: 'Pastries',
  other: 'Kitchen',
};

export const CATEGORY_ORDER = ['coffee', 'tea', 'pastry', 'other'];

export const pluralise = (count, singular, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;
