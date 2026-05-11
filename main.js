// Keep client session in sync with server session
async function syncUserFromServer() {
  try {
    const res = await fetch('/api/me', { credentials: 'same-origin' });
    const data = await res.json();
    if (data && data.success && data.user) {
      window.currentUser = data.user;
      localStorage.setItem('loggedInUser', JSON.stringify(data.user));
    } else {
      window.currentUser = null;
      localStorage.removeItem('loggedInUser');
      localStorage.removeItem('welcomeNotified');
    }
  } catch (e) {
    console.warn('Could not sync user from server:', e && e.message ? e.message : e);
  }
}

// Run immediately to populate `loggedInUser` from server session (if present)
syncUserFromServer().then(() => {
  // This runs after user sync is complete
  const user = getClientUser();
  const signinBtn = document.getElementById("signin-btn");
  const logoutBtn = document.getElementById("logout-btn");

  if (user) {
    if (signinBtn) signinBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
  }

  if (logoutBtn) {
    logoutBtn.onclick = async function() {
      try {
        await fetch('/api/signout', { method: 'POST', credentials: 'same-origin' });
      } catch (err) {
        console.warn('Signout request failed:', err);
      }
      localStorage.clear();
      window.location.href = 'Index.html';
    };
  }

  // Create sidebar for logged-in users
  if (user) {
    createSidebar();
  }
});

// Utility: prefer server session user, fall back to localStorage for UI convenience
function getClientUser() {
  try {
    if (window.currentUser) return window.currentUser;
    const raw = localStorage.getItem('loggedInUser');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}
window.getClientUser = getClientUser;

// --- Sidebar and Hamburger Menu Logic ---
function createSidebar() {
  const user = getClientUser();
  const path = window.location.pathname;
  const isMerchantDashboard = path.endsWith('merchant-dashboard.html');
  const isCustomerDashboard = path.endsWith('customer-dashboard.html');

  if (!user) return; // Only for logged-in users

  let sidebarContent = '';

  if (isMerchantDashboard) {
    sidebarContent = `
      <a href="#" onclick="switchPage(event, 'dashboard')">📊 Dashboard</a>
      <a href="#" onclick="switchPage(event, 'products')">📦 Products</a>
      <a href="#" onclick="switchPage(event, 'upload')">⬆️ Upload Product</a>
      <a href="#" onclick="switchPage(event, 'care')">💬 Customer Care</a>
      <a href="#" onclick="switchPage(event, 'profile')">👤 Profile</a>
      <a href="#" onclick="handleLogout()">Logout</a>
    `;
  } else if (isCustomerDashboard) {
    sidebarContent = `
      <a href="#" onclick="switchPage(event, 'profile')">👤 Profile</a>
      <a href="#" onclick="switchPage(event, 'history')">📜 Purchase History</a>
      <a href="#" onclick="switchPage(event, 'care')">💬 Customer Care</a>
      <a href="#" onclick="handleLogout()">Logout</a>
    `;
  } else {
    const dashboardLink = user.role === 'merchant' ? 'merchant-dashboard.html' : 'customer-dashboard.html';
    sidebarContent = `
      <a href="${dashboardLink}">My Dashboard</a>
      <a href="#" id="sidebar-logout">Logout</a>
    `;
  }

  let hamburger = document.createElement('div');
  hamburger.id = 'hamburger-menu';
  hamburger.innerHTML = '&#9776;';
  hamburger.style.display = 'block';
  document.body.appendChild(hamburger);

  let sidebar = document.createElement('div');
  sidebar.id = 'sidebar';
  sidebar.innerHTML = sidebarContent;
  document.body.appendChild(sidebar);

  hamburger.onclick = function(e) {
    e.stopPropagation();
    sidebar.classList.toggle('active');
  };

  document.addEventListener('click', function(e) {
    if (sidebar.classList.contains('active') && !sidebar.contains(e.target) && e.target !== hamburger) {
      sidebar.classList.remove('active');
    }
  });

  const sidebarLogout = document.getElementById('sidebar-logout');
  if (sidebarLogout) {
    sidebarLogout.onclick = (e) => {
      e.preventDefault();
      document.getElementById('logout-btn').click();
    };
  }
}

// --- Dark Mode Toggle Logic ---
document.addEventListener('DOMContentLoaded', function() {
  const toggle = document.getElementById('dark-mode-toggle');
  console.log('Dark mode toggle element:', toggle);
  if (!toggle) return;

  const applyTheme = (theme) => {
    console.log('Applying theme:', theme);
    document.body.classList.toggle('dark-mode', theme === 'dark');
    toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  };

  const savedTheme = localStorage.getItem('theme') || 'light';
  console.log('Saved theme:', savedTheme);
  applyTheme(savedTheme);

  toggle.addEventListener('click', () => {
    console.log('Toggle clicked');
    const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
    console.log('New theme:', newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  });
});