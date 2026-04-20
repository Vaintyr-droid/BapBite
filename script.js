window.onload = () => {
    const activeUser = localStorage.getItem('activeUser');
    const isDashboard = document.getElementById("dashboard-page") !== null;
    const isLoginPage = document.getElementById("login-username") !== null;
    const isAdminPage = document.getElementById("admin-page") !== null;
    const isOrderPage = document.getElementById("order-page") !== null; 

    if (isDashboard) {
        if (!activeUser) window.location.href = "login.html";
        else initDashboard(activeUser);
    } else if (isOrderPage) {
        if (!activeUser) window.location.href = "login.html";
        else renderCart(); 
    } else if (isLoginPage && activeUser) {
        window.location.href = "dashboard.html";
    } else if (isAdminPage) {
        renderAdminUsers();
        renderAdminOrders(); 
    }
};

function showMessage(elementId, text, type) {
    const el = document.getElementById(elementId);
    el.textContent = text;
    el.className = `message ${type}`;
    el.style.display = "block";
    if (elementId === 'feed-message') setTimeout(() => el.style.display = 'none', 3000);
}

function toggleVisibility(elementId) {
    const el = document.getElementById(elementId);
    if (el.style.display === "none" || el.style.display === "") {
        el.style.display = "block";
    } else {
        el.style.display = "none";
    }
}

function handleRegister() {
    const username = document.getElementById("reg-username").value.trim();
    const password = document.getElementById("reg-password").value;

    if (!username || password.length < 6) {
        showMessage("reg-message", "Need username & password (min 6 chars)", "error");
        return;
    }

    let users = JSON.parse(localStorage.getItem('bapbite_users')) || [];
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        showMessage("reg-message", "Username taken!", "error");
        return;
    }

    users.push({ 
        username: username, password: password, merch: [],
        hasShop: false, shopOpen: false, accountStatus: "active", adminReason: "" 
    });
    localStorage.setItem('bapbite_users', JSON.stringify(users));

    showMessage("reg-message", "Success! Redirecting...", "success");
    setTimeout(() => window.location.href = "login.html", 1500); 
}

function handleLogin() {
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;

    if (!username || !password) return showMessage("login-message", "Please enter credentials.", "error");

    let users = JSON.parse(localStorage.getItem('bapbite_users')) || [];
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user) return showMessage("login-message", "Account does not exist.", "error");
    if (user.password !== password) return showMessage("login-message", "Incorrect password.", "error");
    if (user.accountStatus === "terminated") return showMessage("login-message", `Terminated: ${user.adminReason}`, "error");
    if (user.accountStatus === "halted") return showMessage("login-message", `Suspended: ${user.adminReason}`, "error");

    localStorage.setItem('activeUser', user.username);
    window.location.href = "dashboard.html";
}

function handleLogout() {
    localStorage.removeItem('activeUser'); 
    window.location.href = "login.html"; 
}

function initDashboard(username) {
    document.getElementById("user-greeting").textContent = `Kamusta, ${username}!`;
    let users = JSON.parse(localStorage.getItem('bapbite_users'));
    let user = users.find(u => u.username === username);
    
    if (user.hasShop) {
        document.getElementById("upgrade-banner").style.display = "none";
        document.getElementById("seller-dashboard").style.display = "block";
        document.getElementById("seller-toggle-ui").style.display = "flex";
        
        document.getElementById("shop-toggle").checked = user.shopOpen || false;
        updateShopUI(user.shopOpen || false, document.getElementById("shop-status-text"));
        
        renderMerchList(user);
        renderSellerOrders(username); 
    } else {
        document.getElementById("seller-dashboard").style.display = "none";
        document.getElementById("seller-toggle-ui").style.display = "none";
        document.getElementById("upgrade-banner").style.display = "flex";
    }

    renderBuyerOrders(username);
    renderGlobalFeed();
}

function setupShop() {
    const activeUser = localStorage.getItem('activeUser');
    let users = JSON.parse(localStorage.getItem('bapbite_users'));
    let userIndex = users.findIndex(u => u.username === activeUser);
    users[userIndex].hasShop = true;
    localStorage.setItem('bapbite_users', JSON.stringify(users));
    initDashboard(activeUser);
}

function renderGlobalFeed() {
    let users = JSON.parse(localStorage.getItem('bapbite_users')) || [];
    const activeUser = localStorage.getItem('activeUser');
    const feedEl = document.getElementById("global-feed");
    feedEl.innerHTML = "";
    
    let itemsFound = false;
    users.forEach(seller => {
        if (seller.hasShop && seller.shopOpen && seller.accountStatus === 'active' && seller.username !== activeUser) {
            seller.merch.forEach(item => {
                itemsFound = true;
                const div = document.createElement("div");
                div.className = "feed-item";
                div.innerHTML = `
                    <div class="feed-item-info">
                        <strong>${item.name}</strong><span>Store: @${seller.username}</span>
                    </div>
                    <div>
                        <span class="feed-item-price">₱${item.price}</span>
                        <button class="action-btn small-btn" onclick="addToCart('${item.name}', '${item.price}', '${seller.username}')">Add to Cart</button>
                    </div>`;
                feedEl.appendChild(div);
            });
        }
    });
    if (!itemsFound) feedEl.innerHTML = "<p style='color:#64748b; text-align:center; padding: 20px;'>No nearby sellers found.</p>";
}

function renderBuyerOrders(username) {
    let orders = JSON.parse(localStorage.getItem('bapbite_orders')) || [];
    const listEl = document.getElementById("buyer-order-list");
    listEl.innerHTML = "";
    
    const myOrders = orders.filter(o => o.buyer === username).reverse();

    if (myOrders.length === 0) {
        listEl.innerHTML = "<li><p style='color: #64748b; font-size: 13px;'>No purchases yet.</p></li>";
        return;
    }

    myOrders.forEach(o => {
        const li = document.createElement("li");
        li.className = "order-box";
        li.innerHTML = `
            <div style="margin-bottom: 5px;">
                <strong>${o.id}</strong> <span class="badge-${o.status}">${o.status}</span>
                <p style="font-size: 12px; color: #64748b;">From: @${o.seller} | Total: ₱${o.total.toFixed(2)}</p>
                <p style="font-size: 13px; font-style: italic;">${o.items}</p>
            </div>
            ${o.status === 'pending' ? `<button class="action-btn small-btn outline-btn" style="width: 100%; border-color:#2563eb; color:#2563eb;" onclick="verifyReceipt('${o.id}')">Mark as Received</button>` : ''}
            ${o.status === 'verified' ? `<p style="font-size:11px; color:#10b981;">Verified. Waiting for admin completion.</p>` : ''}
        `;
        listEl.appendChild(li);
    });
}

function verifyReceipt(orderId) {
    let orders = JSON.parse(localStorage.getItem('bapbite_orders'));
    let order = orders.find(o => o.id === orderId);
    order.status = "verified"; 
    localStorage.setItem('bapbite_orders', JSON.stringify(orders));
    renderBuyerOrders(localStorage.getItem('activeUser'));
}

function addToCart(itemName, itemPrice, sellerName) {
    const activeUser = localStorage.getItem('activeUser');
    let cart = JSON.parse(localStorage.getItem(`bapbite_cart_${activeUser}`)) || [];
    cart.push({ name: itemName, price: parseFloat(itemPrice), seller: sellerName });
    localStorage.setItem(`bapbite_cart_${activeUser}`, JSON.stringify(cart));
    showMessage("feed-message", `${itemName} added to cart! 🛒`, "success");
}

function renderCart() {
    const activeUser = localStorage.getItem('activeUser');
    let cart = JSON.parse(localStorage.getItem(`bapbite_cart_${activeUser}`)) || [];
    const listEl = document.getElementById("cart-list");
    const totalEl = document.getElementById("cart-total");
    
    listEl.innerHTML = "";
    let total = 0;

    if (cart.length === 0) {
        listEl.innerHTML = "<li><p style='color: #64748b; font-size: 14px;'>Your cart is empty.</p></li>";
        totalEl.textContent = "₱0.00";
        document.getElementById("checkout-btn").style.display = "none";
        return;
    }

    document.getElementById("checkout-btn").style.display = "block";
    cart.forEach((item, index) => {
        total += item.price;
        listEl.innerHTML += `
            <li>
                <div><strong>${item.name}</strong><p style="font-size: 11px; color: #64748b;">From: @${item.seller}</p></div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="color:#10b981; font-weight:bold;">₱${item.price.toFixed(2)}</span>
                    <button class="delete-btn" onclick="removeFromCart(${index})">×</button>
                </div>
            </li>`;
    });
    totalEl.textContent = `₱${total.toFixed(2)}`;
}

function removeFromCart(index) {
    const activeUser = localStorage.getItem('activeUser');
    let cart = JSON.parse(localStorage.getItem(`bapbite_cart_${activeUser}`)) || [];
    cart.splice(index, 1);
    localStorage.setItem(`bapbite_cart_${activeUser}`, JSON.stringify(cart));
    renderCart();
}

function processCheckout() {
    const activeUser = localStorage.getItem('activeUser');
    const cartKey = `bapbite_cart_${activeUser}`;
    let cart = JSON.parse(localStorage.getItem(cartKey)) || [];
    let orders = JSON.parse(localStorage.getItem('bapbite_orders')) || [];
    
    let grouped = {};
    cart.forEach(item => {
        if(!grouped[item.seller]) grouped[item.seller] = { items: [], total: 0 };
        grouped[item.seller].items.push(item.name);
        grouped[item.seller].total += item.price;
    });

    for(let seller in grouped) {
        orders.push({
            id: 'ORD-' + Math.floor(1000 + Math.random() * 9000), 
            buyer: activeUser,
            seller: seller,
            items: grouped[seller].items.join(", "),
            total: grouped[seller].total,
            status: 'pending' 
        });
    }

    localStorage.setItem('bapbite_orders', JSON.stringify(orders));
    localStorage.removeItem(cartKey); 
    renderCart();
    showMessage("order-message", "Order placed successfully! Check Dashboard to verify receipt.", "success");
}

function toggleShop() {
    const activeUser = localStorage.getItem('activeUser');
    let users = JSON.parse(localStorage.getItem('bapbite_users'));
    let userIndex = users.findIndex(u => u.username === activeUser);
    
    const isChecked = document.getElementById("shop-toggle").checked;
    users[userIndex].shopOpen = isChecked;
    localStorage.setItem('bapbite_users', JSON.stringify(users));
    updateShopUI(isChecked, document.getElementById("shop-status-text"));
}

function updateShopUI(isOpen, textElement) {
    if (isOpen) { textElement.textContent = "🟢 Open"; textElement.className = "status-badge online"; } 
    else { textElement.textContent = "🔴 Closed"; textElement.className = "status-badge offline"; }
}

function addMerch() {
    const nameInput = document.getElementById("item-name");
    const priceInput = document.getElementById("item-price");
    if (!nameInput.value || !priceInput.value) return;
    
    const activeUser = localStorage.getItem('activeUser');
    let users = JSON.parse(localStorage.getItem('bapbite_users'));
    let userIndex = users.findIndex(u => u.username === activeUser);
    if (!users[userIndex].merch) users[userIndex].merch = [];
    
    users[userIndex].merch.push({ name: nameInput.value, price: parseFloat(priceInput.value).toFixed(2) });
    localStorage.setItem('bapbite_users', JSON.stringify(users));
    
    nameInput.value = ""; priceInput.value = "";
    renderMerchList(users[userIndex]);
}

function removeMerch(index) {
    const activeUser = localStorage.getItem('activeUser');
    let users = JSON.parse(localStorage.getItem('bapbite_users'));
    let userIndex = users.findIndex(u => u.username === activeUser);
    users[userIndex].merch.splice(index, 1);
    localStorage.setItem('bapbite_users', JSON.stringify(users));
    renderMerchList(users[userIndex]);
}

function renderMerchList(user) {
    const listEl = document.getElementById("merch-list");
    listEl.innerHTML = ""; 
    if (!user.merch || user.merch.length === 0) return listEl.innerHTML = "<li><p style='color: #64748b; font-size: 14px;'>No items. Add some above!</p></li>";

    user.merch.forEach((item, index) => {
        listEl.innerHTML += `
            <li>
                <div><strong>${item.name}</strong></div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="color:#10b981; font-weight:bold;">₱${item.price}</span>
                    <button class="delete-btn" onclick="removeMerch(${index})">×</button>
                </div>
            </li>`;
    });
}

function renderSellerOrders(username) {
    let orders = JSON.parse(localStorage.getItem('bapbite_orders')) || [];
    const myOrders = orders.filter(o => o.seller === username).reverse();
    
    let totalIncome = 0;
    let pendingCount = 0;
    
    const activeListEl = document.getElementById("seller-order-list");
    const historyListEl = document.getElementById("seller-history-list");
    activeListEl.innerHTML = "";
    historyListEl.innerHTML = "";

    let hasActive = false;
    let hasHistory = false;

    myOrders.forEach(o => {
        if (o.status === 'completed') totalIncome += o.total;
        if (o.status === 'pending' || o.status === 'verified') pendingCount++;

        const liHTML = `
            <li class="order-box">
                <div style="margin-bottom: 5px;">
                    <strong>${o.id}</strong> <span class="badge-${o.status}">${o.status}</span>
                    <p style="font-size: 12px; color: #64748b;">Buyer: @${o.buyer} | Total: ₱${o.total.toFixed(2)}</p>
                    <p style="font-size: 13px; font-style: italic;">${o.items}</p>
                </div>
            </li>`;

        if (o.status === 'pending' || o.status === 'verified') {
            hasActive = true;
            activeListEl.innerHTML += liHTML;
        } else {
            hasHistory = true;
            historyListEl.innerHTML += liHTML;
        }
    });

    if (!hasActive) activeListEl.innerHTML = "<li><p style='color: #64748b; font-size: 13px;'>No active orders.</p></li>";
    if (!hasHistory) historyListEl.innerHTML = "<li><p style='color: #64748b; font-size: 13px;'>No past transactions.</p></li>";

    document.getElementById("stat-income").textContent = `₱ ${totalIncome.toFixed(2)}`;
    document.getElementById("stat-pending").textContent = `${pendingCount} Orders`;
}

function renderAdminUsers() {
    let users = JSON.parse(localStorage.getItem('bapbite_users')) || [];
    const listEl = document.getElementById("admin-user-list");
    listEl.innerHTML = "";

    if (users.length === 0) return listEl.innerHTML = "<p style='text-align:center; color:#64748b;'>No users found.</p>";

    users.forEach((user) => {
        let badgeClass = `b-${user.accountStatus || 'active'}`;
        listEl.innerHTML += `
            <li>
                <div class="user-details">
                    <strong>@${user.username}</strong>
                    <span class="badge ${badgeClass}">${(user.accountStatus || 'active').toUpperCase()}</span>
                </div>
                <div class="admin-actions">
                    ${user.accountStatus === 'active' || !user.accountStatus ? `
                        <button class="admin-btn btn-halt" onclick="changeUserStatus('${user.username}', 'halted')">Halt</button>
                        <button class="admin-btn btn-term" onclick="changeUserStatus('${user.username}', 'terminated')">Term</button>
                    ` : `<button class="admin-btn btn-restore" onclick="changeUserStatus('${user.username}', 'active')">Restore</button>`}
                    <button class="admin-btn" style="background:#991b1b; color:white;" onclick="hardDeleteUser('${user.username}')">Delete</button>
                </div>
            </li>`;
    });
}

function changeUserStatus(username, newStatus) {
    let reason = newStatus !== 'active' ? prompt(`Reason for ${newStatus}:`) : "";
    if (newStatus !== 'active' && reason === null) return; 

    let users = JSON.parse(localStorage.getItem('bapbite_users'));
    let index = users.findIndex(u => u.username === username);
    users[index].accountStatus = newStatus;
    users[index].adminReason = reason;

    if (newStatus !== 'active' && localStorage.getItem('activeUser') === username) localStorage.removeItem('activeUser');
    localStorage.setItem('bapbite_users', JSON.stringify(users));
    renderAdminUsers();
}

function hardDeleteUser(username) {
    if (confirm(`Erase '${username}' forever?`)) {
        let users = JSON.parse(localStorage.getItem('bapbite_users')).filter(u => u.username !== username);
        if (localStorage.getItem('activeUser') === username) localStorage.removeItem('activeUser');
        localStorage.setItem('bapbite_users', JSON.stringify(users));
        renderAdminUsers(); 
    }
}

function renderAdminOrders() {
    let orders = JSON.parse(localStorage.getItem('bapbite_orders')) || [];
    const activeListEl = document.getElementById("admin-order-list");
    const historyListEl = document.getElementById("admin-history-list");
    
    activeListEl.innerHTML = "";
    historyListEl.innerHTML = "";

    let hasActive = false;
    let historyBySeller = {};


    orders.slice().reverse().forEach(o => {
        if (o.status === 'pending' || o.status === 'verified') {
            hasActive = true;
            let buttons = '';
            if (o.status === 'verified') buttons += `<button class="admin-btn btn-restore" onclick="updateOrderStatus('${o.id}', 'completed')">Finalize (Pay Seller)</button>`;
            buttons += `<button class="admin-btn btn-term" onclick="updateOrderStatus('${o.id}', 'cancelled')">Cancel</button>`;

            activeListEl.innerHTML += `
                <li>
                    <div class="user-details" style="margin-bottom: 10px;">
                        <strong>${o.id}</strong> <span class="badge-${o.status}">${o.status}</span>
                        <p style="font-size:12px; color:#64748b;">Buyer: @${o.buyer} | Seller: @${o.seller} | ₱${o.total.toFixed(2)}</p>
                    </div>
                    ${buttons ? `<div class="admin-actions">${buttons}</div>` : ''}
                </li>
            `;
        } else {
            if (!historyBySeller[o.seller]) historyBySeller[o.seller] = [];
            historyBySeller[o.seller].push(o);
        }
    });

    if (!hasActive) activeListEl.innerHTML = "<p style='text-align:center; color:#64748b;'>No active orders.</p>";

    const sellers = Object.keys(historyBySeller);
    if (sellers.length === 0) {
        historyListEl.innerHTML = "<p style='text-align:center; color:#64748b;'>No archived transactions.</p>";
    } else {
        sellers.forEach(seller => {
            let totalEarned = historyBySeller[seller]
                .filter(o => o.status === 'completed')
                .reduce((sum, o) => sum + o.total, 0);
            
            let innerHTML = '';
            historyBySeller[seller].forEach(o => {
                innerHTML += `
                    <li class="order-box" style="padding: 10px; margin-bottom: 5px; background: #fff; border-radius: 6px;">
                        <strong>${o.id}</strong> <span class="badge-${o.status}">${o.status}</span>
                        <p style="font-size:11px; color:#64748b; margin-top:3px;">Buyer: @${o.buyer} | Total: ₱${o.total.toFixed(2)}</p>
                    </li>
                `;
            });

            const blockId = `history-block-${seller}`;
            historyListEl.innerHTML += `
                <li style="background: transparent; padding: 0; border: none; margin-bottom: 10px;">
                    <div class="seller-group-header" onclick="toggleVisibility('${blockId}')">
                        <span>🏪 @${seller}</span>
                        <span style="font-size:12px; color:#10b981;">Earned: ₱${totalEarned.toFixed(2)} ▼</span>
                    </div>
                    <ul id="${blockId}" class="nested-history admin-list" style="display: none; background: #f8fafc;">
                        ${innerHTML}
                    </ul>
                </li>
            `;
        });
    }
}

function updateOrderStatus(orderId, newStatus) {
    let orders = JSON.parse(localStorage.getItem('bapbite_orders'));
    let order = orders.find(o => o.id === orderId);
    order.status = newStatus;
    localStorage.setItem('bapbite_orders', JSON.stringify(orders));
    renderAdminOrders();
}