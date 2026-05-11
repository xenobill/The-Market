document.addEventListener('DOMContentLoaded', function () {
  const isHomePage = window.location.pathname.endsWith('/') || window.location.pathname.endsWith('Index.html');
  if (!isHomePage) return;

  // --- Notifications Modal ---
  const notifIcon = document.querySelectorAll('.icon')[1];
  if (notifIcon) {
    let notifModal = document.createElement('div');
    notifModal.className = 'floating-modal';
    notifModal.id = 'notif-modal';
    notifModal.style.right = '150px'; // Adjusted position
    notifModal.innerHTML = '<h3>Notifications</h3><ul id="notif-list"></ul><button id="close-notif" style="margin-top:10px;">Close</button>';
    document.body.appendChild(notifModal);

    let notifCount = document.createElement('span');
    notifCount.id = 'notif-count';
    Object.assign(notifCount.style, { background: '#f44336', color: '#fff', borderRadius: '50%', fontSize: '0.8em', padding: '2px 7px', position: 'relative', left: '-10px', top: '-10px', display: 'inline-block' });
    notifIcon.appendChild(notifCount);

    function updateNotifCount() {
      const notifs = JSON.parse(localStorage.getItem('notifications') || '[]');
      notifCount.textContent = notifs.length > 0 ? notifs.length : '';
    }

    function renderNotifs() {
      const notifs = JSON.parse(localStorage.getItem('notifications') || '[]');
      const notifList = document.getElementById('notif-list');
      notifList.innerHTML = notifs.length === 0 ? '<li>No notifications.</li>' : notifs.reverse().map(n => `
        <li style="margin-bottom:10px;list-style:none;">
          <span>${n.message}</span><br>
          <small>${new Date(n.time).toLocaleString()}</small>
        </li>
      `).join('');
    }

    notifIcon.onclick = function () {
      renderNotifs();
      notifModal.style.display = 'block';
    };
    document.getElementById('close-notif').onclick = () => notifModal.style.display = 'none';

    window.addEventListener('storage', updateNotifCount);
    updateNotifCount();
  }

  // --- Cart Modal ---
  const cartIcon = document.querySelectorAll('.icon')[0];
  if (cartIcon) {
    let cartModal = document.createElement('div');
    cartModal.className = 'floating-modal';
    cartModal.id = 'cart-modal';
    cartModal.style.right = '30px';
    cartModal.innerHTML = '<h3>Your Cart</h3><ul id="cart-list"></ul><button id="order-cart" style="margin-top:10px;margin-right:10px;background:#4caf50;color:#fff;border:none;padding:7px 18px;border-radius:20px;font-weight:bold;cursor:pointer;">Order</button><button id="close-cart" style="margin-top:10px;background:#f44336;color:#fff;border:none;padding:7px 18px;border-radius:20px;font-weight:bold;cursor:pointer;">Close</button>';
    document.body.appendChild(cartModal);

    let cartCount = document.createElement('span');
    cartCount.id = 'cart-count';
    Object.assign(cartCount.style, { background: '#f44336', color: '#fff', borderRadius: '50%', fontSize: '0.8em', padding: '2px 7px', position: 'relative', left: '-10px', top: '-10px', display: 'inline-block' });
    cartIcon.appendChild(cartCount);

    async function fetchCart() {
      const user = getClientUser();
      if (user && user.id) {
        const res = await fetch('/api/cart', { credentials: 'same-origin' });
        const data = await res.json();
        return (data && data.success) ? (data.cart || []) : [];
      }
      return JSON.parse(localStorage.getItem('tempCart') || '[]');
    }

    async function saveCart(cart) {
      const user = getClientUser();
      if (user && user.id) {
        await fetch('/api/cart', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cart })
        });
      } else {
        localStorage.setItem('tempCart', JSON.stringify(cart));
      }
      window.dispatchEvent(new Event('storage'));
    }

    async function updateCartCount() {
      const cart = await fetchCart();
      cartCount.textContent = cart.length > 0 ? cart.length : '';
    }

    async function renderCart() {
      const cart = await fetchCart();
      const cartList = document.getElementById('cart-list');
      cartList.innerHTML = cart.length === 0 ? '<li>Your cart is empty.</li>' : cart.map(item => `
        <li style="margin-bottom:10px;list-style:none;">
          <img src="${item.image}" alt="${item.name}" style="width:40px;height:40px;object-fit:cover;margin-right:8px;vertical-align:middle;" />
          <strong>${item.name}</strong> <span style="color:#f44336;">₦${item.price}</span>
        </li>
      `).join('');
    }

    cartIcon.onclick = function () {
      renderCart();
      cartModal.style.display = 'block';
    };
    document.getElementById('close-cart').onclick = () => cartModal.style.display = 'none';

    document.getElementById('order-cart').onclick = async function () {
      const user = getClientUser();
      if (!user) {
        alert('Please sign in to place an order.');
        window.location.href = 'sign.html';
        return;
      }
      const cart = await fetchCart();
      if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
      }
      addNotification('Order placed successfully! You will be contacted soon.');
      for (const item of cart) {
        if (!item.merchant) continue;
        await fetch('/api/merchant_notify', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchant: item.merchant, message: `You sold: ${item.name}` })
        });
      }
      await saveCart([]);
      renderCart();
      alert('Order placed!');
    };

    window.addEventListener('storage', updateCartCount);
    updateCartCount();
  }
});

// --- Global Notification Function ---
async function addNotification(message) {
  const user = getClientUser();
  if (!user || !user.id) {
    // For anonymous users, we can't save to server.
    // We can decide if we want to show a transient alert instead.
    console.log("Notification for anonymous user:", message);
    return;
  }
  const payload = { message, time: Date.now() };
  try {
    await fetch('/api/notifications', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification: payload })
    });
    // Manually update local storage to trigger 'storage' event for other tabs
    const notifs = JSON.parse(localStorage.getItem('notifications') || '[]');
    notifs.push(payload);
    localStorage.setItem('notifications', JSON.stringify(notifs));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.warn('Failed to save notification to server:', e);
  }
}

// --- Dashboard-specific logic for adding to cart ---
document.addEventListener('DOMContentLoaded', function () {
  if (window.location.pathname.endsWith('customer-dashboard.html')) {
    // This part needs to be in customer-dashboard.html's script tag
    // because it depends on elements loaded by that page's logic.
    // For now, we'll assume it's there.
    // The addNotification function is now globally available.
  }
});

async function addToCart(btn) {
  const name = decodeURIComponent(btn.getAttribute('data-name'));
  const price = decodeURIComponent(btn.getAttribute('data-price'));
  const image = decodeURIComponent(btn.getAttribute('data-image'));
  const merchant = btn.getAttribute('data-merchant') || '';

  const user = getClientUser();
  let cart = [];
  if (user && user.id) {
      const res = await fetch('/api/cart', { credentials: 'same-origin' });
      const data = await res.json();
      cart = (data && data.success) ? (data.cart || []) : [];
  } else {
      cart = JSON.parse(localStorage.getItem('tempCart') || '[]');
  }

  cart.push({ name, price, image, merchant });

  if (user && user.id) {
      await fetch('/api/cart', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cart })
      });
  } else {
      localStorage.setItem('tempCart', JSON.stringify(cart));
  }

  alert('Added to cart!');
  window.dispatchEvent(new Event('storage')); // Update cart icon count
}