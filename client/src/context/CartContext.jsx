import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'ground-grain.cart.v1';
const MAX_QTY = 20;

function readStored() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((line) => line?.itemId && line.qty > 0) : [];
  } catch {
    return [];
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'add': {
      const { item } = action;
      const existing = state.find((line) => line.itemId === item.id);
      if (existing) {
        return state.map((line) =>
          line.itemId === item.id ? { ...line, qty: Math.min(MAX_QTY, line.qty + 1) } : line
        );
      }
      return [
        ...state,
        {
          itemId: item.id,
          name: item.name,
          priceCents: item.priceCents,
          qty: 1,
        },
      ];
    }
    case 'setQty': {
      if (action.qty <= 0) return state.filter((line) => line.itemId !== action.itemId);
      return state.map((line) =>
        line.itemId === action.itemId
          ? { ...line, qty: Math.min(MAX_QTY, action.qty) }
          : line
      );
    }
    case 'remove':
      return state.filter((line) => line.itemId !== action.itemId);
    case 'clear':
      return [];
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [lines, dispatch] = useReducer(reducer, undefined, readStored);

  // Keep the stored copy in lockstep with the UI so a refresh does not lose the cart.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* storage may be blocked; the cart still works for this session */
    }
  }, [lines]);

  const add = useCallback(
    (item) => dispatch({ type: 'add', item }),
    []
  );
  const setQty = useCallback(
    (itemId, qty) => dispatch({ type: 'setQty', itemId, qty }),
    []
  );
  const remove = useCallback((itemId) => dispatch({ type: 'remove', itemId }), []);
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);

  const value = useMemo(() => {
    const count = lines.reduce((sum, line) => sum + line.qty, 0);
    const totalCents = lines.reduce((sum, line) => sum + line.priceCents * line.qty, 0);
    return { lines, count, totalCents, add, setQty, remove, clear, maxQty: MAX_QTY };
  }, [lines, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
