/* Personal touches for Chì and Hung. Dates use the Vietnam calendar. */
(function (root) {
    'use strict';
    const START = Date.UTC(2024, 6, 22);
    const WALLET_KEY = 'chi-hung-date-tickets-v1';
    const LAST_KEY = 'chi-hung-last-ticket-v1';
    const rewards = [
        { title: 'Một bữa anh nấu', message: 'Em chọn món, anh vào bếp. Mình cùng ăn một bữa thật ngon nhé.' },
        { title: 'Hẹn hò món em thích', message: 'Dành một buổi cho hai đứa, đi ăn món em thích và kể nhau nghe đủ chuyện.' },
        { title: 'Một cái ôm thật lâu', message: 'Khi nào em cần, anh dành cho em một cái ôm và thời gian để lắng nghe.' }
    ];
    function daysTogether(now = new Date()) {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
        }).formatToParts(now);
        const value = type => Number(parts.find(part => part.type === type).value);
        return Math.max(0, Math.floor((Date.UTC(value('year'), value('month') - 1, value('day')) - START) / 86400000));
    }
    function messageFor(name = '') {
        const n = name.toLocaleLowerCase('vi');
        if (n.includes('heo')) return 'Một miếng giòn tan, một cái ôm thật chặt. Ăn ngon rồi nhớ kể anh nghe ngày của em nhé.';
        if (n.includes('cheesecake') || n.includes('chesse')) return 'Chanh có chút chua, bánh có chút ngọt, còn anh có rất nhiều thương em.';
        if (n.includes('chanh')) return 'Gửi em một chút nắng vàng và một lớp kem mềm. Mong hôm nay của em cũng thật dịu dàng.';
        if (n.includes('quế')) return 'Cuộn một chút quế thơm, gói thêm một chút nhớ. Chiếc bánh này có anh thương em ở trong.';
        if (n.includes('socola') || n.includes('chocolate')) return 'Một chút socola cho ngày ngọt hơn. Cảm ơn em vì đã ở bên anh.';
        return 'Món này có thêm một nguyên liệu bí mật: anh thương em. Chúc công chúa của anh ăn ngon nhé.';
    }
    function readWallet(storage) {
        try {
            const rows = JSON.parse(storage.getItem(WALLET_KEY) || '[]');
            return Array.isArray(rows) ? rows.filter(t => t && typeof t.id === 'string' && Number.isInteger(t.reward) && rewards[t.reward]) : [];
        } catch (_) { return []; }
    }
    function issueTicket(storage, id, now = new Date(), random = Math.random) {
        const wallet = readWallet(storage);
        const existing = wallet.find(ticket => ticket.id === id);
        if (existing) return existing;
        const ticket = { id, reward: Math.floor(random() * rewards.length), createdAt: now.toISOString() };
        wallet.push(ticket);
        storage.setItem(WALLET_KEY, JSON.stringify(wallet));
        return ticket;
    }
    function showGreeting() {
        if (document.getElementById('love-welcome')) return;
        const dialog = document.createElement('dialog');
        dialog.id = 'love-welcome';
        dialog.className = 'love-dialog';
        dialog.setAttribute('aria-labelledby', 'love-welcome-title');
        dialog.innerHTML = `<span class="love-kicker">MỘT CHÚT NGỌT NGÀO, DÀNH RIÊNG CHO EM</span>
            <div class="love-seal" aria-hidden="true">💌</div>
            <h2 id="love-welcome-title">Chào Khánh Chi,<br>công chúa của anh.</h2>
            <p>Từ ngày 22.07.2024, những ngày bình thường cũng trở nên đặc biệt vì có em.</p>
            <p>Mời em ghé tiệm nhỏ của hai đứa. Món ngon và một chút bất ngờ đang chờ em.</p>
            <form method="dialog"><button class="love-button" autofocus>Vào tiệm cùng anh nhé ♡</button></form>`;
        dialog.addEventListener('close', () => dialog.remove());
        document.body.appendChild(dialog);
        dialog.showModal();
    }
    function updateCounter() {
        document.querySelectorAll('[data-love-days]').forEach(el => {
            el.textContent = new Intl.NumberFormat('vi-VN').format(daysTogether());
        });
    }
    function renderTickets() {
        const list = document.getElementById('love-ticket-list');
        if (!list) return;
        let storage;
        try { storage = window.localStorage; } catch (_) { /* Storage may be disabled. */ }
        const wallet = storage ? readWallet(storage) : [];
        list.replaceChildren();
        if (!wallet.length) {
            const empty = document.createElement('p');
            empty.className = 'love-empty';
            empty.textContent = 'Sau mỗi lần đặt món thành công, một phiếu hẹn hò sẽ chờ em ở đây. Mình cùng tạo thêm kỷ niệm nhé.';
            list.appendChild(empty);
        }
        wallet.slice().reverse().forEach(ticket => {
            const reward = rewards[ticket.reward];
            const card = document.createElement('article');
            card.className = 'love-ticket';
            const label = document.createElement('span');
            label.className = 'love-kicker'; label.textContent = 'PHIẾU HẸN HÒ · DÀNH CHO KHÁNH CHI';
            const title = document.createElement('h3'); title.textContent = reward.title;
            const message = document.createElement('p'); message.textContent = reward.message;
            const button = document.createElement('button');
            button.className = 'love-button love-button-light'; button.textContent = 'Lưu phiếu về máy ↓';
            button.addEventListener('click', () => {
                const text = `Tiệm bánh của Chì và Hung\n${reward.title}\n\n${reward.message}\n\nEm chọn ngày, hai đứa mình cùng hẹn nhé. ♡\nMã kỷ niệm: ${ticket.id}`;
                const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
                const link = document.createElement('a'); link.href = url; link.download = 'phieu-hen-ho.txt';
                link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
            });
            const actions = document.createElement('div'); actions.className = 'love-ticket-actions';
            const invite = document.createElement('button'); invite.type = 'button';
            invite.className = 'love-button'; invite.textContent = 'Em muốn hẹn hò ♡';
            const sent = document.createElement('p'); sent.className = 'love-invitation-sent'; sent.hidden = true;
            invite.addEventListener('click', () => window.DateInvitations.open(ticket, reward, values => {
                sent.hidden = false;
                sent.textContent = `Đã gửi lời hẹn cho ngày ${values.date.split('-').reverse().join('/')} lúc ${values.time}. ♡`;
            }));
            actions.append(invite, button);
            card.append(label, title, message, actions, sent); list.appendChild(card);
        });
        if (document.body.dataset.loveSuccess !== undefined) {
            let confirmed = false;
            try { confirmed = wallet.some(t => t.id === sessionStorage.getItem(LAST_KEY)); } catch (_) {}
            document.getElementById('love-success-title').textContent = confirmed ? 'Anh nhận được đơn của em rồi! ♡' : 'Những cuộc hẹn của hai đứa ♡';
            document.getElementById('love-success-message').textContent = confirmed ? 'Đồ ăn để anh lo. Còn đây là một lời hẹn nhỏ dành cho em — em chọn ngày, mình cùng thực hiện nhé.' : 'Các phiếu đã lưu trên trình duyệt này sẽ ở đây. Ghé tiệm và đặt món để nhận thêm một lời hẹn nhé.';
        }
    }
    function recordSuccessfulOrder() {
        try {
            const id = window.crypto.randomUUID();
            const ticket = issueTicket(window.localStorage, id);
            try { window.sessionStorage.setItem(LAST_KEY, ticket.id); } catch (_) {}
        } catch (_) {
            // An unavailable browser store must never turn a successful order into an error.
            try { window.sessionStorage.removeItem(LAST_KEY); } catch (_) {}
        }
    }
    const api = { daysTogether, messageFor, readWallet, issueTicket, showGreeting, recordSuccessfulOrder };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.LoveNotes = api;
    if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => {
        updateCounter(); setInterval(updateCounter, 60000);
        document.addEventListener('visibilitychange', updateCounter);
        document.querySelectorAll('[data-love-open]').forEach(button => button.addEventListener('click', showGreeting));
        if (document.getElementById('love-home')) {
            try {
                if (!sessionStorage.getItem('princess_greeted')) {
                    showGreeting(); sessionStorage.setItem('princess_greeted', 'true');
                }
            } catch (_) { /* The welcome letter is still available through its button. */ }
        }
        renderTickets();
    });
})(typeof window !== 'undefined' ? window : globalThis);
