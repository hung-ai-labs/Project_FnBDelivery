const { test } = require('node:test');
const assert = require('node:assert/strict');
const wheel = require('../src/main/resources/static/assets/js/food-wheel.js');
const foods = [
    { id: 1, name: 'Bánh bao bò ngô phô mai', categoryId: 1 },
    { id: 7, name: 'Bánh chuối yến mạch socola', categoryId: 3 },
    { id: 8, name: 'Bánh yến mạch matcha', categoryId: 3 },
    { id: 15, name: 'Thịt heo chiên giòn', categoryId: 2 },
    { id: 16, name: 'Bánh cheesecake chanh vàng' },
    { id: 17, name: 'Bánh bông lan kem chanh vàng' },
    { id: 18, name: 'Bánh quế cuộn' },
    { id: 19, name: 'Trà sữa' }, { id: 20, name: 'Nước lọc' }
];
test('classifies savory cakes and sweet cakes independently of legacy category IDs', () => {
    assert.deepEqual(wheel.classify(foods[0]), { type: 'food', taste: 'savory' });
    for (const index of [1, 2, 4, 5, 6]) assert.deepEqual(wheel.classify(foods[index]), { type: 'food', taste: 'sweet' });
    assert.equal(wheel.classify({name: 'Bánh trà xanh'}).type, 'food');
});
test('combines food/drink and taste filters without falling back to unrelated dishes', () => {
    assert.deepEqual(wheel.filterProducts(foods, 'food', 'savory').map(p => p.id), [1, 15]);
    assert.deepEqual(wheel.filterProducts(foods, 'drink', 'sweet').map(p => p.id), [19]);
    assert.deepEqual(wheel.filterProducts(foods, 'drink', 'plain').map(p => p.id), [20]);
    assert.deepEqual(wheel.filterProducts(foods, 'drink', 'savory'), []);
    assert.deepEqual(wheel.filterProducts(foods.slice(0, 7), 'drink'), []);
});
test('honors explicit classification and keeps unknown dishes out of specific taste pools', () => {
    const custom = { name: 'Món đặc biệt', type: 'drink', taste: 'savory' };
    assert.deepEqual(wheel.classify(custom), { type: 'drink', taste: 'savory' });
    assert.deepEqual(wheel.filterProducts([{name: 'Món chưa biết'}], 'food', 'sweet'), []);
    assert.equal(wheel.filterProducts([{name: 'Món chưa biết'}]).length, 1);
    assert.equal(wheel.classify({name:'Trà không đường'}).taste, 'plain');
});
test('every selected sector stops with its center under the top pointer, including repeat spins', () => {
    let rotation = 0;
    for (const count of [1, 2, 7, 9, 16]) {
        for (let i = 0; i < count; i++) {
            const next = wheel.rotationFor(rotation, i, count);
            assert.ok(next - rotation >= 1800);
            const center = (i + .5) * 360 / count;
            const offset = (next + center) % 360;
            assert.ok(Math.min(offset, 360 - offset) < 1e-8);
            rotation = next;
        }
    }
    assert.equal(wheel.chooseIndex(0), -1);
    assert.equal(wheel.chooseIndex(7, () => 0), 0);
    assert.equal(wheel.chooseIndex(7, () => .999999), 6);
});
test('all four new beverages appear in the sweet drink pool', () => {
    const drinks = ['Trà chanh vàng', 'Matcha latte', 'Coco matcha', 'Bạc xỉu'].map((name, index) => ({id: index + 19, name}));
    assert.equal(wheel.filterProducts(drinks, 'drink', 'sweet').length, 4);
    assert.equal(wheel.filterProducts(drinks, 'food').length, 0);
    assert.equal(wheel.classify({name:'Bạc xỉu không đường'}).taste, 'plain');
});
test('order action opens checkout with the selected product and quantity one', () => {
    assert.equal(wheel.checkoutUrl({id:22}), '/checkout.html?productId=22&quantity=1');
});
test('reroll picks another product when alternatives exist, and handles a single matching item', () => {
    for (let previous=0; previous<4; previous++) {
        for (const random of [0,.2,.5,.999]) {
            const selected=wheel.chooseNextIndex(4,previous,()=>random);
            assert.notEqual(selected,previous);
            assert.ok(selected>=0 && selected<4);
        }
    }
    assert.equal(wheel.chooseNextIndex(1,0),0);
    assert.equal(wheel.chooseNextIndex(0),-1);
});

// Cream in a savory pasta name must not move it into desserts.
test('new pasta, dumplings and broccoli all appear in savory food spins', () => {
    const dishes = ['Mì Ý', 'Mì sốt kem nấm', 'Sủi cảo tôm thịt', 'Há cảo tôm súp lơ'].map(name => ({name}));
    assert.equal(wheel.filterProducts(dishes, 'food', 'savory').length, 4);
    assert.equal(wheel.filterProducts(dishes, 'food', 'sweet').length, 0);
});

test('homepage and wheel load the same current food classifier', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const versions = ['index.html', 'food-wheel.html'].map(file => {
        const html = fs.readFileSync(path.join(__dirname, '../src/main/resources/static', file), 'utf8');
        return html.match(/food-wheel\.js\?v=(\d+)/)[1];
    });
    assert.equal(versions[0], versions[1]);
});
