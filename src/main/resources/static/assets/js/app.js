// Global API client
const api = {
    async get(url) {
        try {
            // Thêm credentials: 'include' để gửi kèm Cookie
            const response = await fetch(url, { credentials: 'include' });
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Fetch error for ${url}:`, error);
            throw error;
        }
    },
    async post(url, data) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Thêm dòng này
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Post error for ${url}:`, error);
            throw error;
        }
    }
};

// State management
const state = {
    user: null,
    products: []
};

function toggleMobileMenu() {
    const navs = document.querySelectorAll('.nav, .nav-links');
    navs.forEach(nav => nav.classList.toggle('active'));
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    injectCartHTML();
    await checkAuth();

    const path = window.location.pathname;
    const isHome = path === '/' || path.endsWith('/index.html') || path === '';

    setupSearch();

    if (isHome) {
        await loadProducts();
        
        const params = new URLSearchParams(window.location.search);
        const searchQuery = params.get('search');
        if (searchQuery) {
            const query = searchQuery.toLowerCase().trim();
            
            const grid = document.getElementById('product-list');
            if (grid) {
                grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; font-size: 1.2rem; color: #ff4d6d;"><i class="fa-solid fa-spinner fa-spin"></i> công chúa iu của anh chờ xíu nhée anh đang tìm choa công chúa ây gùi nè</p>';
            }
            
            const searchInput = document.getElementById('search');
            if (searchInput) searchInput.value = searchQuery;
            
            setTimeout(() => {
                const productSection = document.querySelector('.favorite-products');
                if (productSection) productSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
            
            setTimeout(() => {
                const filtered = state.products.filter(p =>
                    (p.name && p.name.toLowerCase().includes(query)) ||
                    (p.description && p.description.toLowerCase().includes(query))
                );
                renderProducts(filtered);
            }, 800);
        }
        
        restoreChatHistory();
    }

    if (path.includes('product-detail')) {
        await loadProductDetail();
    }
});



function injectCartHTML() {
    if (document.getElementById('cartSidebar')) return;

    const cartHTML = `
        <div class="cart-overlay" id="cartOverlay"></div>
        <div class="cart-sidebar" id="cartSidebar">
            <div class="cart-header">
                <h3>Giỏ Hàng Của Bạn</h3>
                <span class="close-cart" id="closeCartBtn">&times;</span>
            </div>
            <div class="cart-body" id="cartItemsList">
                <!-- Items will be loaded here -->
            </div>
            <div class="cart-footer">
                <div class="total-price">
                    <span>Tổng cộng:</span>
                    <span id="cartTotalAmount">0 cái ôm và chơm</span>
                </div>
                <a href="/checkout.html" class="checkout-btn">Thanh Toán Ngay</a>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', cartHTML);

    const overlay = document.getElementById('cartOverlay');
    const sidebar = document.getElementById('cartSidebar');
    const closeBtn = document.getElementById('closeCartBtn');

    const closeCart = () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    };

    if (closeBtn) closeBtn.addEventListener('click', closeCart);
    if (overlay) overlay.addEventListener('click', closeCart);
}

function openCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    if (sidebar && overlay) {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        loadCart();
    }
}

async function loadCart() {
    if (!state.user) return;
    try {
        const cartItems = await api.get('/api/cart');
        renderCartItems(cartItems);
    } catch (e) {
        console.error('Failed to load cart', e);
    }
}

function renderCartItems(items) {
    const list = document.getElementById('cartItemsList');
    const totalEl = document.getElementById('cartTotalAmount');
    const iconLabel = document.querySelector('.cart-icon');

    if (!list) return;

    if (!items || items.length === 0) {
        list.innerHTML = '<p style="text-align: center; margin-top: 50px; color: #888;">Giỏ hàng đang trống</p>';
        if (totalEl) totalEl.innerText = '0 cái chơm và ôm';
        if (iconLabel) iconLabel.innerText = 'Giỏ hàng (0)';
        return;
    }

    let total = 0;
    list.innerHTML = items.map(item => {
        total += item.totalPrice;
        return `
            <div class="cart-item">
                <img src="${item.productImage || '/assets/img/default-cake.png'}" class="cart-item-img" alt="${item.productName}">
                <div class="cart-item-info">
                    <h4>${item.productName}</h4>
                    <p>${new Intl.NumberFormat('vi-VN').format(item.price - (item.price * item.discount / 100))} cái chơm và ôm</p>
                    <div class="quantity-control">
                        <button onclick="updateQuantity(${item.cartId}, -1)">-</button>
                        <input type="text" value="${item.quantity}" readonly>
                        <button onclick="updateQuantity(${item.cartId}, 1)">+</button>
                    </div>
                </div>
                <span class="remove-item" onclick="removeFromCart(${item.cartId})">&times;</span>
            </div>
        `;
    }).join('');

    if (totalEl) totalEl.innerText = new Intl.NumberFormat('vi-VN').format(total) + ' cái chơm và ôm';
    if (iconLabel) iconLabel.innerText = `Giỏ hàng (${items.length})`;
}

async function updateQuantity(cartId, delta) {
    try {
        await fetch(`/api/cart/update/${cartId}?delta=${delta}`, { method: 'PUT' });
        loadCart();
    } catch (e) {
        console.error('Failed to update quantity', e);
    }
}

async function removeFromCart(cartId) {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
    try {
        await fetch(`/api/cart/remove/${cartId}`, { method: 'DELETE' });
        loadCart();
    } catch (e) {
        console.error('Failed to remove item', e);
    }
}

async function checkAuth() {
    try {
        state.user = await api.get('/api/auth/me');
        updateAuthUI();
        loadCart();
    } catch (e) {
        state.user = null;
        updateAuthUI();
    }
}
window.getCurrentUser = () => {
    return state.user;
};

// Khi cần dùng ở bất cứ đâu trong JS
const user = getCurrentUser();
if (user) {
    console.log("Đang phục vụ công chúa:", user.user_name);
}

function updateAuthUI() {
    const authSection = document.getElementById('auth-section');
    if (!authSection) return;

    if (state.user) {
        // Lấy tên người dùng (hỗ trợ cả trường hợp DTO trả về user_name hoặc username)
        const userName = state.user.user_name || state.user.username;
        let greetingText = `Xin chào, ${userName}`;

        // Lời chào đặc biệt dành riêng cho người yêu bạn
        if (userName && (userName.includes("Khánh Chi") || userName.includes("Trần Lê Khánh Chi"))) {
            if (!sessionStorage.getItem('princess_greeted')) {
                showLoveGreeting();
                sessionStorage.setItem('princess_greeted', 'true');
            }
        }

        // Kiểm tra phân quyền: Nếu là Hung452005 thì hiển thị thêm nút Quản lý đơn hàng
        let adminLink = '';
        if (userName === 'Hung452005') {
            adminLink = `
                <li style="border-bottom: 1px solid #eee; margin-bottom: 5px; padding-bottom: 5px;">
                    <a href="/admin-orders.html" style="color: #6ab04c; font-weight: bold;">
                        <i class="fa-solid fa-clipboard-list" style="margin-right: 8px;"></i> Quản lý đơn hàng
                    </a>
                </li>
                <li style="border-bottom: 1px solid #eee; margin-bottom: 5px; padding-bottom: 5px;">
                    <a href="/addProduct.html" style="color: #6ab04c; font-weight: bold;">
                        <i class="fa-solid fa-plus-circle" style="margin-right: 8px;"></i> Thêm sản phẩm
                    </a>
                </li>
            `;
        }

        // Render giao diện Tài khoản (Bao gồm dropdown)
        authSection.innerHTML = `
            <div class="user-info-wrapper" style="position: relative;">
                <a href="#" id="user-menu-trigger">
                    <img src="/assets/icon/user.png" alt="Account" class="account-icon" />
                    <span>${greetingText}</span>
                </a>
                <ul class="contact-nav" id="user-dropdown" style="display: none; top: 100%; right: 0; width: 190px; background: white; position: absolute; box-shadow: 0 4px 15px rgba(0,0,0,0.1); list-style: none; padding: 10px; border-radius: 8px; z-index: 1000;">
                    ${adminLink}
                    <li>
                        <a href="#" onclick="logout()" style="color: #e74c3c;">
                            <i class="fa-solid fa-right-from-bracket" style="margin-right: 8px;"></i> Đăng xuất
                        </a>
                    </li>
                </ul>
            </div>
        `;

        // Logic hiển thị menu thả xuống khi rê chuột
        const trigger = document.getElementById('user-menu-trigger');
        const dropdown = document.getElementById('user-dropdown');
        if (trigger && dropdown) {
            trigger.parentElement.onmouseover = () => dropdown.style.display = 'block';
            trigger.parentElement.onmouseout = () => dropdown.style.display = 'none';
        }
    }
}

function showLoveGreeting() {
    if (window.LoveNotes) window.LoveNotes.showGreeting();
}

function closeLoveGreeting() {
    document.getElementById('love-welcome')?.close();
}

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    window.location.href = '/login.html';
}

async function loadProducts() {
    const grid = document.getElementById('product-list');
    if (grid) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; font-size: 1.2rem; color: #ff4d6d;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải danh sách bánh ngon cho công chúa...</p>';
    }
    try {
        const response = await api.get('/api/products');
        state.products = response || [];
        renderProducts(state.products);
    } catch (e) {
        console.error('Failed to load products', e);
        if (grid) grid.innerHTML = '<p style="grid-column: 1/-1; padding: 20px;">Không thể tải danh sách bánh. Vui lòng thử lại sau.</p>';
    }
}

function renderProducts(products) {
    const grid = document.getElementById('product-list');
    if (!grid) return;

    if (!products || products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; padding: 20px;">Hiện tại không có sản phẩm nào.</p>';
        return;
    }

    const classify = window.FoodWheel?.classify || (() => ({ type: 'unknown', taste: 'unknown' }));
    const savory = products.filter(p => { const c = classify(p); return c.type === 'food' && c.taste === 'savory'; });
    const sweet = products.filter(p => { const c = classify(p); return c.type === 'food' && c.taste === 'sweet'; });
    const drinks = products.filter(p => classify(p).type === 'drink');
    const other = products.filter(p => { const c = classify(p); return c.type === 'unknown' || (c.type === 'food' && !['savory', 'sweet'].includes(c.taste)); });

    let html = '';

    const createGrid = (title, items) => {
        if (!items || items.length === 0) return '';
        let gridHtml = `<h3 style="grid-column: 1/-1; text-align: left; width: 100%; margin: 40px 0 20px; font-size: 2rem; color: #ff4d6d; border-bottom: 3px solid #ffeef1; padding-bottom: 10px;"><i class="fa-solid fa-star" style="font-size: 1.5rem; margin-right: 10px;"></i>${title}</h3>`;
        gridHtml += items.map(p => {
            const price = p.price || 0;
            const discount = p.discount || 0;
            const finalPrice = price - (price * discount / 100);
            const img = p.imageUrl || p.image_url || '/assets/img/default-cake.png';

            return `
                <a href="/product-detail.html?id=${p.id}" class="product-card">
                    <div class="product-img"><img src="${img}" alt="${p.name}" /></div>
                    <div class="product-info">
                        <h3>${p.name}</h3>
                        <div class="price-box">
                            <p class="price">Gía gốc: <span>${new Intl.NumberFormat('vi-VN').format(price)}</span> cái chơm và ôm</p>
                            <p class="discount">Giảm giá : <span>${discount}</span>%</p>
                            <p class="totalPrice">Giá tiền: <span>${new Intl.NumberFormat('vi-VN').format(finalPrice)} cái chơm và ôm</span></p>
                        </div>
                    </div>
                </a>
            `;
        }).join('');
        return gridHtml;
    };

    html += createGrid('Món ăn · Mặn', savory);
    html += createGrid('Món ăn · Ngọt', sweet);
    html += createGrid('Đồ uống', drinks);
    html += createGrid('Các món khác', other);

    grid.innerHTML = html;
}

async function loadProductDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;

    try {
        const data = await api.get(`/api/products/${id}`);
        renderDetail(data);
    } catch (e) {
        console.error('Failed to load product detail', e);
        const hero = document.getElementById('product-hero-section');
        if (hero) hero.innerHTML = '<h2>Không tìm thấy thông tin sản phẩm</h2><a href="/">Quay lại trang chủ</a>';
    }
}

function renderDetail(data) {
    const heroSection = document.getElementById('product-hero-section');
    const ingredientList = document.getElementById('ingredient-list');
    const nutritionTable = document.getElementById('nutrition-table');
    const relatedGrid = document.getElementById('related-products');

    if (!heroSection || !data || !data.product) return;

    const p = data.product;
    const price = p.price || 0;
    const discount = p.discount || 0;

    // Tôi đã sửa lại công thức tính tiền trừ thẳng (price - discount) cho chuẩn với Database của bạn
    const finalPrice = price - discount;
    const img = p.imageUrl || '/assets/img/default-cake.png';

    // --- LOGIC XỬ LÝ ẨN/HIỆN GIÁ TIỀN THÔNG MINH ---
    let detailPriceHtml = '';
    if (discount > 0) {
        // NẾU CÓ GIẢM GIÁ: Hiện giá gốc (gạch ngang) + Giá đã giảm (màu đỏ)
        detailPriceHtml = `
            <span class="original-price" style="text-decoration: line-through; color: #888; margin-right: 15px;">${new Intl.NumberFormat('vi-VN').format(price)} cái chơm và ôm</span>
            <span class="product-price" style="font-size: 1.5rem; color: #ff4d6d; font-weight: bold;">${new Intl.NumberFormat('vi-VN').format(finalPrice)} cái chơm và ôm</span>
        `;
    } else {
        // NẾU KHÔNG GIẢM GIÁ (Giảm 0đ): Chỉ hiện duy nhất giá màu đỏ, giấu giá gạch ngang đi
        detailPriceHtml = `
            <span class="product-price" style="font-size: 1.5rem; color: #ff4d6d; font-weight: bold;">${new Intl.NumberFormat('vi-VN').format(price)} cái chơm và ôm</span>
        `;
    }

    heroSection.innerHTML = `
        <div class="product-gallery">
            <img src="${img}" alt="${p.name}">
        </div>
        <div class="product-details">
            <div class="breadcrumb">Trang chủ / Bánh Healthy / ${p.name}</div>
            <h1 class="product-title">${p.name}</h1>
            
            <div class="price-container" style="display: flex; align-items: center; margin-bottom: 20px;">
                ${detailPriceHtml}
            </div>
            
            <p class="product-desc">${p.description || 'Thông tin mô tả đang được cập nhật.'}</p>
            
            <div class="quantity-selector" style="margin-bottom: 20px; display: flex; align-items: center; gap: 15px;">
                <span>Số lượng:</span>
                <div class="quantity-control" style="margin-top: 0;">
                    <button onclick="changeDetailQty(-1)">-</button>
                    <input type="text" id="detail-qty" value="1" readonly style="width: 40px; text-align: center; border: 1px solid #ddd; padding: 5px;">
                    <button onclick="changeDetailQty(1)">+</button>
                </div>
            </div>

            <div class="action-buttons">
                <button class="btn btn-open-cart" onclick="handleAddToCart(${p.id})">Thêm vào giỏ</button>
                <button class="btn btn-primary" onclick="handleBuyNow(${p.id}, ${finalPrice})">Mua ngay</button>
            </div>
        </div>
    `;

    if (window.LoveNotes) {
        const note = document.createElement('details');
        note.className = 'love-note';
        const summary = document.createElement('summary');
        summary.textContent = 'Một lời nhắn anh giấu trong món này 💌';
        const message = document.createElement('p');
        message.textContent = window.LoveNotes.messageFor(p.name);
        note.append(summary, message);
        heroSection.querySelector('.product-desc').after(note);
    }

    if (ingredientList) {
        if (data.ingredients && data.ingredients.length > 0) {
            ingredientList.innerHTML = data.ingredients.map(item => `<li>${item}</li>`).join('');
        } else {
            ingredientList.innerHTML = '<li>Thông tin nguyên liệu đang cập nhật</li>';
        }
    }

    if (nutritionTable) {
        if (data.calories !== undefined && data.calories > 0) {
            nutritionTable.innerHTML = `
                <tr><td>Calories</td><td>${data.calories || 0} kcal</td></tr>
                <tr><td>Protein (Đạm)</td><td>${data.protein || 0}g</td></tr>
                <tr><td>Total Fat (Chất béo)</td><td>${data.fat || 0}g</td></tr>
                <tr><td>Carbohydrate</td><td>${data.carbohydrate || 0}g</td></tr>
                <tr><td>Fiber (Chất xơ)</td><td>${data.fiber || 0}g</td></tr>
                <tr><td>Sugar (Đường)</td><td>${data.sugar || 0}g</td></tr>
            `;
        } else {
            nutritionTable.innerHTML = '<tr><td colspan="2">Thông tin dinh dưỡng đang cập nhật</td></tr>';
        }
    }

    if (relatedGrid) {
        const related = data.relatedProducts || [];
        if (related.length > 0) {
            relatedGrid.innerHTML = related.slice(0, 4).map(rp => {
                const rpPrice = rp.price || 0;
                const rpDiscount = rp.discount || 0;
                const rpFinal = rpPrice - rpDiscount; // Sửa lỗi tính sai phần trăm ở mục sản phẩm liên quan
                return `
                    <div class="mini-card">
                        <a href="/product-detail.html?id=${rp.id}">
                            <img src="${rp.image_url || '/assets/img/default-cake.png'}" alt="${rp.name}">
                            <h3>${rp.name}</h3>
                            <p style="font-weight: bold; color: #ff4d6d; margin-top: 5px;">${new Intl.NumberFormat('vi-VN').format(rpFinal)} cái chơm và ôm</p>
                        </a>
                    </div>
                `;
            }).join('');
        } else {
            relatedGrid.innerHTML = '<p>Không có sản phẩm liên quan</p>';
        }
    }
}

window.changeDetailQty = (delta) => {
    const input = document.getElementById('detail-qty');
    if (!input) return;
    let val = parseInt(input.value) + delta;
    if (val < 1) val = 1;
    input.value = val;
};

async function handleAddToCart(productId) {
    if (!state.user) {
        window.location.href = '/login.html';
        return;
    }

    const qtyInput = document.getElementById('detail-qty');
    const quantity = qtyInput ? parseInt(qtyInput.value) : 1;

    try {
        await api.post('/api/cart/add', { productId, quantity });
        openCart();
    } catch (e) {
        alert('Lỗi khi thêm vào giỏ hàng: ' + e.message);
    }
}

function setupSearch() {
    const searchInput = document.getElementById('search');
    const searchBtn = document.querySelector('.nav .find button');

    const handleSearch = () => {
        if (!searchInput) return;
        const query = searchInput.value.trim();
        if (query) {
            window.location.href = `/?search=${encodeURIComponent(query)}#product-list`;
        } else {
            window.location.href = `/#product-list`;
        }
    };

    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
            }
        });
        
        searchInput.addEventListener('input', (e) => {
            const path = window.location.pathname;
            const isHome = path === '/' || path.endsWith('/index.html') || path === '';
            if (!isHome) return;
            
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                renderProducts(state.products);
                return;
            }
            
            const grid = document.getElementById('product-list');
            if (grid) {
                grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; font-size: 1.2rem; color: #ff4d6d;"><i class="fa-solid fa-spinner fa-spin"></i> công chúa iu của anh chờ xíu nhée anh đang tìm choa công chúa ây gùi nè</p>';
            }
            
            if (window.searchTimeout) clearTimeout(window.searchTimeout);
            
            window.searchTimeout = setTimeout(() => {
                const filtered = state.products.filter(p =>
                    (p.name && p.name.toLowerCase().includes(query)) ||
                    (p.description && p.description.toLowerCase().includes(query))
                );
                renderProducts(filtered);
            }, 600);
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleSearch();
        });
    }
}

// Thêm/Sửa hàm này trong app.js
async function handleBuyNow(productId) {
    // 1. Kiểm tra đăng nhập trước khi cho đi "shopping" tiếp
    if (!state.user) {
        window.location.href = '/login.html';
        return;
    }

    // 2. Lấy số lượng công chúa đã chọn
    const qtyInput = document.getElementById('detail-qty');
    const quantity = qtyInput ? parseInt(qtyInput.value) : 1;

    // 3. Chuyển hướng sang trang checkout kèm theo "mật mã" sản phẩm
    window.location.href = `/checkout.html?productId=${productId}&quantity=${quantity}`;
}

// Khởi tạo hoặc lấy ConversationID từ LocalStorage
// --- LOGIC LƯU TRỮ LỊCH SỬ CHAT (Thêm vào app.js) ---

// --- LOGIC LƯU TRỮ VÀ KHÔI PHỤC LỊCH SỬ CHAT ---

let aiConversationId = localStorage.getItem('ai_chat_session_id');
if (!aiConversationId) {
    aiConversationId = 'conv_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('ai_chat_session_id', aiConversationId);
}

// Khởi tạo biến toàn cục
let chatMessages = [];

// Hàm khôi phục tin nhắn cực kỳ "cứng đầu"
function restoreChatHistory() {
    const historyEl = document.getElementById('ai-chat-history');
    if (!historyEl) return;

    // 1. Luôn đọc dữ liệu mới nhất từ LocalStorage
    const savedData = localStorage.getItem('ai_chat_messages');
    if (savedData) {
        chatMessages = JSON.parse(savedData);
    } else {
        // Nếu chưa có, tạo câu chào và LƯU NGAY vào bộ nhớ
        chatMessages = [{ sender: 'ai', text: 'Anh chin chào công chúa iu của anh! khom biết là hum nay công chúa micc muốn ăn bánh vị gì nào?' }];
        localStorage.setItem('ai_chat_messages', JSON.stringify(chatMessages));
    }

    // 2. Xóa trắng HTML mặc định và vẽ lại
    historyEl.innerHTML = '';

    chatMessages.forEach(msg => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${msg.sender === 'user' ? 'user-message' : 'ai-message'}`;
        msgDiv.innerHTML = msg.sender === 'user' ? msg.text : formatAiMessage(msg.text);
        historyEl.appendChild(msgDiv);
    });

    historyEl.scrollTop = historyEl.scrollHeight;
}

// 3. BẮT SỰ KIỆN NÚT "QUAY LẠI" (BACK) CỦA TRÌNH DUYỆT
window.addEventListener('pageshow', function (event) {
    // Dù trang load mới hay lấy từ cache của nút Back, cũng phải vẽ lại chat
    restoreChatHistory();
});

// Lắng nghe phím Enter
function handleAiChatEnter(event) {
    if (event.key === 'Enter') {
        sendAiMessage();
    }
}

// Xử lý gửi tin nhắn
async function sendAiMessage() {
    const inputEl = document.getElementById('ai-chat-input');
    const question = inputEl.value.trim();
    if (!question) return;

    // Hiển thị tin nhắn của người dùng
    appendChatMessage('user', question);
    inputEl.value = '';

    // Hiển thị trạng thái AI đang gõ
    const loadingId = 'loading_' + Date.now();
    appendChatMessage('ai', 'Công chúa chờ anh chút xíuuu nhéee, anh đang tìm ây ùi nè <i class="fa-solid fa-spinner fa-spin"></i>', loadingId);

    try {
        // GỌI API THEO ĐÚNG DTO ChatAIRequest CỦA BẠN
        const response = await fetch('/api/chat-ai/answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: question,
                conversationId: aiConversationId
            })
        });

        const data = await response.json();

        // Phụ thuộc vào dữ liệu trả về từ ChatAiController, lấy thông điệp ra
        // (Nếu service trả về ApiResponse, lấy data.message. Nếu trả về chuỗi trực tiếp, dùng data)
        const aiAnswer = data.message || data.answer || data || "Lỗi nhỏ rồi, em thử lại nhé!";

        // Xóa trạng thái loading và hiện câu trả lời
        updateChatMessage(loadingId, aiAnswer);

    } catch (error) {
        console.error("Chat AI Error:", error);
        updateChatMessage(loadingId, "Anh đang bận chút xíu, em thử lại sau nha!");
    }
}

function formatAiMessage(text) {
    if (!text) return "";

    // Xử lý in đậm: chuyển **chữ** thành <strong>chữ</strong>
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Xử lý in nghiêng: chuyển *chữ* thành <em>chữ</em>
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Xử lý xuống dòng: chuyển ký tự \n thành thẻ <br>
    formattedText = formattedText.replace(/\n/g, '<br>');

    return formattedText;
}

// Hàm hỗ trợ vẽ bong bóng chat
function appendChatMessage(sender, text, id = null) {
    const historyEl = document.getElementById('ai-chat-history');
    if (!historyEl) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender === 'user' ? 'user-message' : 'ai-message'}`;

    msgDiv.innerHTML = sender === 'user' ? text : formatAiMessage(text);
    if (id) msgDiv.id = id;

    historyEl.appendChild(msgDiv);
    historyEl.scrollTop = historyEl.scrollHeight;

    // LƯU TIN NHẮN (Bỏ qua tin nhắn có ID vì nó là trạng thái "đang gõ...")
    if (!id) {
        chatMessages.push({ sender: sender, text: text });
        localStorage.setItem('ai_chat_messages', JSON.stringify(chatMessages));
    }
}

function updateChatMessage(id, text) {
    const msgDiv = document.getElementById(id);
    if (msgDiv) {
        msgDiv.innerHTML = formatAiMessage(text);
        msgDiv.removeAttribute('id');

        // LƯU TIN NHẮN TRẢ LỜI CHÍNH THỨC CỦA AI
        chatMessages.push({ sender: 'ai', text: text });
        localStorage.setItem('ai_chat_messages', JSON.stringify(chatMessages));
    }
}

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    window.location.href = '/login.html';
}

// ==========================================
// 1. CHỨC NĂNG PHÓNG TO LOGO
// ==========================================
function openLogoModal(event) {
    // Ngăn chặn thẻ <a> nhảy về trang chủ
    event.preventDefault();

    let modal = document.getElementById('logoModalOverlay');
    // Nếu chưa có modal thì tạo mới và nhúng vào web
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'logoModalOverlay';
        modal.className = 'logo-modal-overlay';
        modal.innerHTML = '<img src="/assets/img/Logo.JPEG" class="logo-modal-content" />';

        // Click ra ngoài để đóng
        modal.onclick = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
        };
        document.body.appendChild(modal);
    }

    // Hiển thị modal
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

// ==========================================
// 2. CHỨC NĂNG LÀM MỚI (RESET) ĐOẠN CHAT
// ==========================================
function resetAiChat() {
    // 1. Xóa dữ liệu cũ trong bộ nhớ trình duyệt
    localStorage.removeItem('ai_chat_session_id');
    localStorage.removeItem('ai_chat_messages');

    // 2. Cấp lại ID hội thoại mới tinh để backend không nhớ nhầm
    aiConversationId = 'conv_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('ai_chat_session_id', aiConversationId);

    // 3. Đặt lại mảng tin nhắn về câu chào mặc định
    chatMessages = [{ sender: 'ai', text: 'Chào em! Hôm nay em muốn ăn bánh vị gì nào?' }];
    localStorage.setItem('ai_chat_messages', JSON.stringify(chatMessages));

    // 4. Vẽ lại khung chat
    restoreChatHistory();
}