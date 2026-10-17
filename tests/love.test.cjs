const { test } = require('node:test');
const assert = require('node:assert/strict');
const love = require('../src/main/resources/static/assets/js/love.js');
function storage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
test('counts elapsed calendar days in Vietnam, including midnight and leap years', () => {
    assert.equal(love.daysTogether(new Date('2024-07-21T17:00:00Z')), 0);
    assert.equal(love.daysTogether(new Date('2024-07-22T16:59:59Z')), 0);
    assert.equal(love.daysTogether(new Date('2024-07-22T17:00:00Z')), 1);
    assert.equal(love.daysTogether(new Date('2026-10-17T05:00:00Z')), 817);
    assert.equal(love.daysTogether(new Date('2028-07-22T05:00:00Z')), 1461);
    assert.equal(love.daysTogether(new Date('2024-01-01')), 0);
});
test('keeps one reward per checkout and persists it across reloads', () => {
    const store = storage();
    const now = new Date('2026-10-17T05:00:00Z');
    const first = love.issueTicket(store, 'order-1', now, () => 0);
    assert.deepEqual(love.issueTicket(store, 'order-1', now, () => .99), first);
    assert.equal(love.readWallet(store).length, 1);
    assert.equal(love.issueTicket(store, 'order-2', now, () => .99).reward, 2);
    assert.equal(love.readWallet(store).length, 2);
});
test('handles damaged or inaccessible browser storage without rendering invalid tickets', () => {
    for (const data of ['bad JSON', '{}', '[null, {"id":"a","reward":100}]']) {
        assert.deepEqual(love.readWallet(storage({'chi-hung-date-tickets-v1': data})), []);
    }
    assert.deepEqual(love.readWallet({ getItem() { throw Error('disabled'); } }), []);
});
test('provides individual notes for all four new dishes and a fallback', () => {
    const names = ['Thịt heo chiên giòn', 'Bánh cheesecake chanh vàng', 'Bánh bông lan kem chanh vàng', 'Bánh quế cuộn'];
    assert.equal(new Set(names.map(love.messageFor)).size, 4);
    assert.ok(love.messageFor('Món mới').includes('anh thương em'));
});
