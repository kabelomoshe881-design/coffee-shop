import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { createFileStore } from '../src/store/file.js';
import { createApp } from '../src/app.js';

const appConfig = {
  isProduction: false,
  frontendUrl: ['http://localhost:5173'],
  jwtSecret: 'test-secret',
  jwtExpiresIn: '1h',
  staffUsername: 'staff',
  staffPasswordHash: '',
};

let app;
let token;
let itemId;

async function login() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'staff', password: 'coffee123' });
  return res.body.data.token;
}

beforeEach(async () => {
  const store = await createFileStore(path.join(os.tmpdir(), `coffee-test-${randomUUID()}.json`));
  app = createApp({ store, config: appConfig });
  token = await login();

  const created = await request(app)
    .post('/api/menu')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Test Latte', description: 'For tests', priceCents: 3000, category: 'coffee' });
  itemId = created.body.data.id;
});

describe('health', () => {
  it('reports the store driver', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.dependencies.store.driver).toBe('file');
  });
});

describe('menu', () => {
  it('lists seeded items publicly', async () => {
    const res = await request(app).get('/api/menu');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('rejects writes without a token', async () => {
    const res = await request(app).post('/api/menu').send({ name: 'Nope' });
    expect(res.status).toBe(401);
  });

  it('validates the payload', async () => {
    const res = await request(app)
      .post('/api/menu')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X', priceCents: -5, category: 'soup' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('returns 404 for an unknown item', async () => {
    const res = await request(app).get('/api/menu/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('orders', () => {
  it('recomputes totals from server prices', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        customerName: 'Thabo',
        items: [{ itemId, qty: 2 }],
        totalCents: 1, // ignored on purpose
      });

    expect(res.status).toBe(201);
    expect(res.body.data.totalCents).toBe(6000);
    expect(res.body.data.orderNumber).toMatch(/^ORD-\d{4,}$/);
    expect(res.body.data.status).toBe('pending');
  });

  it('rejects an unavailable item', async () => {
    await request(app)
      .put(`/api/menu/${itemId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ available: false });

    const res = await request(app)
      .post('/api/orders')
      .send({ customerName: 'Thabo', items: [{ itemId, qty: 1 }] });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ITEM_UNAVAILABLE');
  });

  it('enforces forward-only status transitions', async () => {
    const order = await request(app)
      .post('/api/orders')
      .send({ customerName: 'Naledi', items: [{ itemId, qty: 1 }] });

    const id = order.body.data.id;

    const skipped = await request(app)
      .patch(`/api/orders/${id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'collected' });
    expect(skipped.status).toBe(409);

    const ok = await request(app)
      .patch(`/api/orders/${id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'preparing' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe('preparing');
  });

  it('blocks deleting an item used by an open order', async () => {
    await request(app)
      .post('/api/orders')
      .send({ customerName: 'Sipho', items: [{ itemId, qty: 1 }] });

    const res = await request(app)
      .delete(`/api/menu/${itemId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ITEM_IN_USE');
  });

  it('returns a daily summary', async () => {
    await request(app)
      .post('/api/orders')
      .send({ customerName: 'Lerato', items: [{ itemId, qty: 3 }] });

    const res = await request(app)
      .get('/api/orders/summary/today')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.orderCount).toBe(1);
    expect(res.body.data.revenueCents).toBe(9000);
    expect(res.body.data.byStatus.pending).toBe(1);
  });
});
