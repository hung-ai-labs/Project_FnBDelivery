(function (root) {
    'use strict';
    function vietnamDate(now = new Date()) {
        const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Ho_Chi_Minh', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(now);
        return ['year','month','day'].map(type => parts.find(part => part.type === type).value).join('-');
    }
    function validate(values) {
        if (!values.date || !values.time) return 'Em chọn ngày và giờ hẹn nhé.';
        if (!values.restaurant.trim() && !values.outing.trim()) return 'Em chọn ít nhất một nơi đi ăn hoặc đi chơi nhé.';
        return '';
    }
    function open(ticket, reward, onSent) {
        if (document.getElementById('date-invitation-dialog')) return;
        const dialog = document.createElement('dialog');
        dialog.id = 'date-invitation-dialog'; dialog.className = 'date-dialog';
        dialog.setAttribute('aria-labelledby','date-invitation-title');
        dialog.innerHTML = `<div class="date-dialog-inner">
            <span class="love-kicker">MÌNH DÀNH MỘT BUỔI CHO NHAU NHÉ ♡</span>
            <h2 id="date-invitation-title">Em muốn hẹn hò</h2>
            <p class="date-reward"></p>
            <form class="date-form">
                <fieldset>
                    <legend class="date-sr-only">Chi tiết cuộc hẹn</legend>
                    <div class="date-fields">
                        <label>Ngày hẹn<input name="date" type="date" required></label>
                        <label>Giờ hẹn (Việt Nam)<input name="time" type="time" required></label>
                    </div>
                    <label>Nơi em muốn đi ăn<input name="restaurant" type="text" maxlength="200" list="date-restaurants" placeholder="Tên quán, địa chỉ hoặc ở nhà anh nấu…"></label>
                    <datalist id="date-restaurants"><option value="Ở nhà, anh nấu cho em"><option value="Quán ăn em thích"><option value="Một quán cà phê yên tĩnh"></datalist>
                    <label>Nơi em muốn đi chơi<input name="outing" type="text" maxlength="200" list="date-outings" placeholder="Xem phim, đi dạo hoặc một nơi em thích…"></label>
                    <datalist id="date-outings"><option value="Đi dạo cùng nhau"><option value="Xem phim"><option value="Đi công viên"></datalist>
                    <p class="date-hint">Em có thể chọn gợi ý hoặc tự nhập địa điểm. Chọn ít nhất một nơi đi ăn hoặc đi chơi nhé.</p>
                    <label>Lời nhắn cho anh (không bắt buộc)<textarea name="note" maxlength="1000" rows="3" placeholder="Em muốn dặn anh điều gì nè?"></textarea></label>
                </fieldset>
                <p class="date-status" role="status" aria-live="polite"></p>
                <a class="date-login" href="/login.html" target="_blank" rel="noopener" hidden>Đăng nhập ở tab mới rồi quay lại gửi lời hẹn</a>
                <div class="date-actions">
                    <button class="love-button" type="submit">Xác nhận &amp; gửi lời hẹn 💌</button>
                    <button class="love-button love-button-light date-close" type="button">Để em nghĩ thêm</button>
                </div>
                <p class="date-hint">Khi xác nhận, ngày giờ, địa điểm và lời nhắn sẽ được gửi tới email của anh.</p>
            </form>
        </div>`;
        dialog.querySelector('.date-reward').textContent = 'Phiếu của em: ' + reward.title;
        const form = dialog.querySelector('form');
        const date = form.elements.namedItem('date');
        date.min = vietnamDate();
        const close = dialog.querySelector('.date-close');
        const submit = form.querySelector('[type="submit"]');
        const fields = form.querySelector('fieldset');
        const status = dialog.querySelector('.date-status');
        const login = dialog.querySelector('.date-login');
        let sending = false, requestId = null, lastPayload = '';
        close.addEventListener('click', () => dialog.close());
        dialog.addEventListener('cancel', event => { if (sending) event.preventDefault(); });
        dialog.addEventListener('close', () => dialog.remove());
        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (sending || !form.reportValidity()) return;
            const values = Object.fromEntries(new FormData(form));
            for (const key of ['restaurant','outing','note']) values[key] = (values[key] || '').trim();
            const error = validate(values);
            if (error) { status.textContent = error; status.classList.add('is-error'); return; }
            const payload = {ticketId:ticket.id, reward:ticket.reward, ...values};
            const fingerprint = JSON.stringify(payload);
            // An unchanged retry keeps the same provider idempotency key.
            if (fingerprint !== lastPayload) { requestId = window.crypto.randomUUID(); lastPayload = fingerprint; }
            sending = true; submit.disabled = true; close.disabled = true; fields.disabled = true; login.hidden = true;
            status.classList.remove('is-error'); status.textContent = 'Đang gửi lời hẹn tới anh…';
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 25000);
            let success = false;
            try {
                const response = await fetch('/api/date-invitations', {
                    method:'POST', credentials:'include', headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({...payload, requestId}), signal:controller.signal
                });
                if (response.status === 401 || response.redirected) {
                    login.hidden = false;
                    throw Error('Em đăng nhập rồi gửi lời hẹn nhé. Thông tin em nhập vẫn ở đây.');
                }
                const result = await response.json();
                if (!response.ok || !result.success) throw Error(result.message || 'Chưa gửi được lời hẹn. Em thử lại nhé.');
                success = true;
                status.textContent = result.message;
                submit.hidden = true; close.textContent = 'Xong rồi ♡';
                if (onSent) onSent(values);
            } catch (error) {
                status.classList.add('is-error');
                status.textContent = error.name === 'AbortError' || error instanceof TypeError
                    ? 'Chưa xác nhận được email đã gửi. Em giữ nguyên thông tin rồi thử lại nhé.'
                    : error.message;
            } finally {
                clearTimeout(timeout); sending = false; close.disabled = false;
                if (!success) { submit.disabled = false; fields.disabled = false; }
            }
        });
        document.body.appendChild(dialog); dialog.showModal(); date.focus();
    }
    const api = {open, vietnamDate, validate};
    root.DateInvitations = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
