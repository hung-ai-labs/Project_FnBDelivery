document.addEventListener('DOMContentLoaded', () => {
    const nav = document.createElement('details');
    nav.className = 'quick-nav';
    if (!document.querySelector('header')) {
        nav.classList.add('quick-nav-standalone');
        document.body.classList.add('has-quick-nav-standalone');
    }
    nav.innerHTML = `<summary>☰ <span>Góc của hai đứa</span></summary>
        <nav aria-label="Góc của hai đứa">
            <a href="/">🍰 <span>Thực đơn<small>Chọn món em thích</small></span></a>
            <a href="/food-wheel.html">🎡 <span>Vòng quay<small>Để anh chọn giúp em</small></span></a>
            <a href="/#our-tickets">💌 <span>Phiếu hẹn hò<small>Những cuộc hẹn của mình</small></span></a>
        </nav>`;
    const wheelPage = window.location.pathname.endsWith('/food-wheel.html');
    nav.querySelector(wheelPage ? 'a[href="/food-wheel.html"]' : 'a[href="/"]').setAttribute('aria-current', wheelPage || window.location.pathname === '/' || window.location.pathname.endsWith('/index.html') ? 'page' : 'false');
    nav.addEventListener('keydown', event => { if (event.key === 'Escape') { nav.open = false; nav.querySelector('summary').focus(); } });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { nav.open = false; }));
    document.addEventListener('click', event => { if (!nav.contains(event.target)) nav.open = false; });
    document.body.appendChild(nav);
});
