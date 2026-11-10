/**
 * The starting menu. Kept separate from the seed script so the API can
 * auto-seed an empty database on first boot (see src/index.js).
 */
export const MENU_ITEMS = [
  { name: 'Espresso', description: 'Double shot, house blend, served short and hot.', priceCents: 1800, category: 'coffee' },
  { name: 'Americano', description: 'Double espresso lengthened with hot water.', priceCents: 2200, category: 'coffee' },
  { name: 'Cappuccino', description: 'Espresso, steamed milk and a deep foam cap.', priceCents: 3200, category: 'coffee' },
  { name: 'Flat White', description: 'Ristretto shots with silky micro-foam.', priceCents: 3400, category: 'coffee' },
  { name: 'Caffe Latte', description: 'Smooth espresso with plenty of steamed milk.', priceCents: 3300, category: 'coffee' },
  { name: 'Mocha', description: 'Espresso, dark chocolate and steamed milk.', priceCents: 3800, category: 'coffee' },
  { name: 'Cold Brew', description: 'Steeped for 18 hours, served over ice.', priceCents: 3600, category: 'coffee' },
  { name: 'Rooibos Tea', description: 'Loose-leaf rooibos, brewed to order.', priceCents: 2000, category: 'tea' },
  { name: 'Chai Latte', description: 'Spiced black tea with steamed milk.', priceCents: 3500, category: 'tea' },
  { name: 'Jasmine Green Tea', description: 'Delicate jasmine-scented green tea.', priceCents: 2400, category: 'tea' },
  { name: 'Butter Croissant', description: 'Laminated 27 layers, baked this morning.', priceCents: 2800, category: 'pastry' },
  { name: 'Chocolate Croissant', description: 'Butter croissant filled with dark chocolate.', priceCents: 3200, category: 'pastry' },
  { name: 'Blueberry Muffin', description: 'Bursting with berries, crumble top.', priceCents: 2600, category: 'pastry' },
  { name: 'Almond Danish', description: 'Frangipane and toasted almonds.', priceCents: 3400, category: 'pastry' },
  { name: 'Breakfast Bagel', description: 'Cream cheese, tomato and rocket.', priceCents: 4800, category: 'other' },
  { name: 'Banana Bread', description: 'Toasted slice with salted butter.', priceCents: 3000, category: 'other' },
];
