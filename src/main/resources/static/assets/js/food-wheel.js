(function (root) {
    'use strict';
    // Keep classification separate from categoryId: the existing categories mix cakes and drinks.
    // Explicit type/taste metadata, when available, takes precedence over these name rules.
    const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
    const validTypes = ['food', 'drink'];
    const validTastes = ['savory', 'sweet', 'plain'];
    function classify(product) {
        const name = fold(product.name);
        const drink = /\b(tra|ca phe|coffee|latte|nuoc|sinh to|juice|smoothie|soda|milk tea|cacao|cocoa|sua tuoi|coco matcha|bac xiu)\b/;
        const food = /\b(banh|cake|cheesecake|chesse|burrito|thit|heo|com|mi|pizza|yen mach|dorayaki|chocolate)\b/;
        const savory = /\b(thit|heo|bo|ga|xuc xich|burrito|pizza|man|cha|ca|hai san)\b/;
        const sweet = /\b(ngot|cheesecake|chesse|bong lan|que cuon|dorayaki|chuoi|socola|chocolate|matcha|yen mach ngam|cookie|pancake|kem|banh flan)\b/;
        const explicitType = validTypes.includes(product.type) ? product.type : null;
        // Food names take precedence over beverage ingredients, e.g. bánh trà xanh.
        const type = explicitType || (/\b(banh|cake|cheesecake|burrito)\b/.test(name) ? 'food' : drink.test(name) ? 'drink' : food.test(name) ? 'food' : 'unknown');
        let taste = validTastes.includes(product.taste) ? product.taste : 'unknown';
        if (taste === 'unknown') {
            if (type === 'drink') taste = /\b(nuoc loc|nuoc khoang|khong duong)\b/.test(name) ? 'plain' : /\b(sua|sinh to|juice|smoothie|soda|ngot|duong|tra chanh|latte|coco matcha|bac xiu)\b/.test(name) ? 'sweet' : 'unknown';
            else if (savory.test(name)) taste = 'savory';
            else if (sweet.test(name)) taste = 'sweet';
        }
        return { type, taste };
    }
    function filterProducts(products, type = 'all', taste = 'all') {
        return products.filter(product => {
            const group = classify(product);
            return (type === 'all' || group.type === type) && (taste === 'all' || group.taste === taste);
        });
    }
    function rotationFor(current, index, count) {
        const target = (360 - (index + .5) * 360 / count) % 360;
        return current + 360 * 5 + (target - current % 360 + 360) % 360;
    }
    function chooseIndex(count, random = Math.random) {
        return count > 0 ? Math.floor(random() * count) : -1;
    }
    function chooseNextIndex(count, previous = -1, random = Math.random) {
        if (count <= 1 || previous < 0 || previous >= count) return chooseIndex(count, random);
        const index = chooseIndex(count - 1, random);
        return index >= previous ? index + 1 : index;
    }
    const typeLabels = { food: 'Món ăn', drink: 'Đồ uống', unknown: 'Chưa phân loại' };
    const tasteLabels = { savory: 'Mặn', sweet: 'Ngọt', plain: 'Không ngọt', unknown: 'Chưa rõ vị' };
    let products = [], ready = false, failed = false, spinning = false, rotation = 0, lastId = null, timer;
    let ui;
    function buildWheel(items) {
        const svg = ui.wheel;
        svg.replaceChildren();
        const ns = 'http://www.w3.org/2000/svg';
        const colors = ['#f9ccd6', '#ffedd7', '#dfebdc', '#e2dbed', '#f7e2b4', '#e0ecec'];
        const point = angle => [200 + 190 * Math.cos(angle), 200 + 190 * Math.sin(angle)];
        const count = items.length || 1;
        for (let i = 0; i < count; i++) {
            const start = -Math.PI / 2 + i * 2 * Math.PI / count;
            const end = start + 2 * Math.PI / count;
            const shape = document.createElementNS(ns, count === 1 ? 'circle' : 'path');
            if (count === 1) { shape.setAttribute('cx', 200); shape.setAttribute('cy', 200); shape.setAttribute('r', 190); }
            else {
                const a = point(start), b = point(end);
                shape.setAttribute('d', `M200 200 L${a[0]} ${a[1]} A190 190 0 ${count === 2 ? 0 : +(end - start > Math.PI)} 1 ${b[0]} ${b[1]} Z`);
            }
            shape.setAttribute('fill', items.length ? colors[i % colors.length] : '#f0e8e8');
            shape.setAttribute('stroke', '#fff8f1'); shape.setAttribute('stroke-width', '2'); svg.appendChild(shape);
            if (items.length) {
                const text = document.createElementNS(ns, 'text');
                const angle = start + Math.PI / count;
                text.setAttribute('x', 200 + 142 * Math.cos(angle)); text.setAttribute('y', 200 + 142 * Math.sin(angle));
                text.setAttribute('text-anchor', 'middle'); text.setAttribute('dominant-baseline', 'central');
                text.textContent = String(i + 1); svg.appendChild(text);
            }
        }
    }
    function currentItems() { return filterProducts(products, ui.type.value, ui.taste.value); }
    function reset() {
        if (!ui) return;
        clearTimeout(timer); lastId = null; spinning = false; ui.type.disabled = false; ui.taste.disabled = false;
        if (ui.result.open) ui.result.close(); ui.link.removeAttribute('href');
        const items = currentItems();
        ui.spin.disabled = !ready || !items.length;
        ui.spin.textContent = 'Quay giúp em chọn món ♡';
        ui.retry.hidden = !failed;
        ui.status.textContent = !ready ? (failed ? 'Chưa tải được thực đơn. Em thử tải lại nhé.' : 'Đang lấy thực đơn cho vòng quay…') : items.length ? `${items.length} món phù hợp · Mỗi món có cơ hội được chọn như nhau.` : 'Nhóm này chưa có món trong thực đơn. Em thử đổi loại món hoặc khẩu vị nhé.';
        ui.list.replaceChildren();
        const groups = new Map();
        items.forEach((product, index) => {
            const classification = classify(product);
            const label = `${typeLabels[classification.type]} · ${tasteLabels[classification.taste]}`;
            if (!groups.has(label)) groups.set(label, []);
            groups.get(label).push({ product, index });
        });
        groups.forEach((entries, label) => {
            const section = document.createElement('section');
            const heading = document.createElement('h4'); heading.textContent = `${label} (${entries.length})`;
            const list = document.createElement('ul');
            entries.forEach(({ product, index }) => {
                const row = document.createElement('li');
                const number = document.createElement('span'); number.className = 'wheel-number'; number.textContent = String(index + 1);
                const link = document.createElement('a'); link.href = `/product-detail.html?id=${encodeURIComponent(product.id)}`; link.textContent = product.name;
                row.append(number, link); list.appendChild(row);
            });
            section.append(heading, list); ui.list.appendChild(section);
        });
        // Rebuilds represent a new pool, so do not animate from the previous selection.
        ui.wheel.style.transition = 'none'; rotation = 0; ui.wheel.style.transform = 'rotate(0deg)';
        buildWheel(items);
    }
    function setProducts(rows) {
        const seen = new Set();
        products = (Array.isArray(rows) ? rows : []).filter(p => p && Number.isSafeInteger(Number(p.id)) && Number(p.id) > 0 && typeof p.name === 'string' && p.name.trim() && !seen.has(String(p.id)) && seen.add(String(p.id)));
        ready = true; failed = false; reset();
    }
    function setError() { ready = false; failed = true; products = []; reset(); }
    function spin() {
        if (spinning || !ready) return;
        const items = currentItems();
        if (!items.length) return;
        spinning = true; ui.spin.disabled = true; ui.type.disabled = true; ui.taste.disabled = true; if (ui.result.open) ui.result.close();
        ui.spin.textContent = 'Đang chọn món cho em…'; ui.status.textContent = 'Chờ một chút, món ngon đang tới…';
        const index = chooseNextIndex(items.length, items.findIndex(product => String(product.id) === lastId));
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const duration = reducedMotion ? 0 : 4200;
        rotation = rotationFor(rotation, index, items.length);
        ui.wheel.style.transition = duration ? 'transform 4.2s cubic-bezier(.12,.72,.12,1)' : 'none';
        ui.wheel.style.transform = `rotate(${rotation}deg)`;
        timer = setTimeout(() => {
            const product = items[index];
            lastId = String(product.id);
            ui.name.textContent = product.name;
            ui.promise.textContent = classify(product).type === 'drink' ? 'Em chọn ngày nhé, anh dẫn em đi uống món này. ♡' : 'Món ngon đã chọn xong! Anh sẽ nấu hoặc dẫn em đi ăn, mình cùng chọn ngày nhé. ♡';
            ui.link.href = checkoutUrl(product);
            ui.result.showModal();
            celebrate();
            ui.status.textContent = `Vòng quay chọn món số ${index + 1}: ${product.name}.`;
            spinning = false; ui.type.disabled = false; ui.taste.disabled = false; ui.spin.disabled = false; ui.spin.textContent = 'Quay thêm một lần ♡';
        }, duration);
    }
    function init() {
        if (!document.getElementById('food-wheel')) return;
        const byId = id => document.getElementById(id);
        ui = { type: byId('wheel-type'), taste: byId('wheel-taste'), wheel: byId('wheel-svg'), spin: byId('wheel-spin'), status: byId('wheel-status'), list: byId('wheel-candidates'), result: byId('wheel-result'), name: byId('wheel-winner'), promise: byId('wheel-promise'), link: byId('wheel-product-link'), retry: byId('wheel-retry'), again: byId('wheel-again'), fireworks: byId('wheel-fireworks') };
        ui.type.addEventListener('change', reset); ui.taste.addEventListener('change', reset);
        ui.spin.addEventListener('click', spin);
        ui.again.addEventListener('click', () => { ui.result.close(); spin(); });
        ui.result.addEventListener('close', () => { clearTimeout(fireworksTimer); ui.fireworks.replaceChildren(); });
        ui.retry.addEventListener('click', loadMenu);
        reset();
        loadMenu();
    }
    async function loadMenu() {
        failed = false; ready = false; reset();
        try {
            const response = await fetch('/api/products', { credentials: 'include' });
            if (!response.ok) throw Error('Menu unavailable');
            const rows = await response.json();
            if (!Array.isArray(rows)) throw Error('Invalid menu');
            setProducts(rows);
        } catch (_) { setError(); }
    }
    function checkoutUrl(product) {
        return `/checkout.html?productId=${encodeURIComponent(product.id)}&quantity=1`;
    }
    let fireworksTimer;
    function celebrate() {
        clearTimeout(fireworksTimer); ui.fireworks.replaceChildren();
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const colors = ['#ff5b88', '#dfaa35', '#79bb9a', '#a994de', '#69bad2'];
        [[18, 25], [82, 22], [50, 12]].forEach(([x, y], burst) => {
            for (let i = 0; i < 24; i++) {
                const spark = document.createElement('i'); spark.className = 'wheel-spark';
                const angle = i * Math.PI * 2 / 24;
                spark.style.left = `${x}%`; spark.style.top = `${y}%`;
                spark.style.setProperty('--spark-x', `${Math.cos(angle) * (100 + i % 3 * 25)}px`);
                spark.style.setProperty('--spark-y', `${Math.sin(angle) * (100 + i % 3 * 25)}px`);
                spark.style.color = colors[i % colors.length]; spark.style.animationDelay = `${burst * 150}ms`;
                ui.fireworks.appendChild(spark);
            }
        });
        fireworksTimer = setTimeout(() => ui.fireworks.replaceChildren(), 2000);
    }
    const api = { classify, filterProducts, rotationFor, chooseIndex, chooseNextIndex, checkoutUrl, setProducts, setError };
    root.FoodWheel = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init);
})(typeof window !== 'undefined' ? window : globalThis);
