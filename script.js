<<<<<<< HEAD
// script.js - General client-side functions for GlenHub

// Handle search form submission
function handleSearch(event) {
  event.preventDefault();
  const query = document.getElementById('searchInput').value.trim();
  if (query) {
    localStorage.setItem('searchQuery', query);
    window.location.href = 'search-results.html';
  }
}

// Add item to cart
function addToCart(itemName) {
  const user = window.getClientUser ? window.getClientUser() : null;
  if (!user) {
    alert('Please sign in as a customer to add items to cart.');
    window.location.href = 'sign.html';
    return;
  }
  let cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const existing = cart.find(item => item.name === itemName);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ name: itemName, quantity: 1 });
  }
  localStorage.setItem('cart', JSON.stringify(cart));
  alert(`${itemName} added to cart!`);
}

// Handle product upload for merchants
async function handleUploadProduct(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  try {
    const res = await fetch('/api/upload_product', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin'
    });
    const data = await res.json();
    if (data.success) {
      alert('Product uploaded successfully!');
      // Refresh or redirect
    } else {
      alert('Upload failed: ' + (data.message || 'Unknown error'));
    }
  } catch (err) {
    console.error('Upload error:', err);
    alert('Upload failed: ' + err.message);
  }
}

// Delete product
async function deleteProduct(productName) {
  if (!confirm(`Are you sure you want to delete ${productName}?`)) return;
  try {
    const res = await fetch('/api/delete_product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: productName }),
      credentials: 'same-origin'
    });
    const data = await res.json();
    if (data.success) {
      alert('Product deleted!');
      location.reload();
    } else {
      alert('Delete failed: ' + (data.message || 'Unknown error'));
    }
  } catch (err) {
    console.error('Delete error:', err);
    alert('Delete failed: ' + err.message);
  }
}

// Send customer care message
async function sendCareMessage() {
  const message = document.getElementById('care-message').value.trim();
  if (!message) {
    alert('Please enter a message.');
    return;
  }
  try {
    const res = await fetch('/api/care', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      credentials: 'same-origin'
    });
    const data = await res.json();
    if (data.success) {
      alert('Message sent!');
      document.getElementById('care-message').value = '';
    } else {
      alert('Failed to send message: ' + (data.message || 'Unknown error'));
    }
  } catch (err) {
    console.error('Care message error:', err);
    alert('Failed to send message: ' + err.message);
  }
}

// Switch page in dashboard
function switchPage(event, page) {
  event.preventDefault();
  // Implement page switching logic here
  console.log('Switch to page:', page);
  // For example, show/hide sections based on page
}

// Handle logout
function handleLogout() {
  fetch('/api/signout', { method: 'POST', credentials: 'same-origin' })
    .then(() => {
      localStorage.clear();
      window.location.href = 'Index.html';
    });
}

// Add notification
function addNotification(message) {
  const notifs = JSON.parse(localStorage.getItem('notifications') || '[]');
  notifs.push({ message, time: Date.now() });
  localStorage.setItem('notifications', JSON.stringify(notifs));
  // Update UI if modal is open
}
=======
function handleSearch(event) {
  event.preventDefault();
  const query = document.getElementById('searchInput').value.trim();
  if (query) {
    alert("You searched for: " + query);
    // Future: redirect or fetch search results
  }
}
function handleSignUp(event) {
  event.preventDefault();

  const username = document.getElementById("signup-username").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const role = document.getElementById("signup-role").value;

  if (!username || !email || !password || !role) {
    alert("Please fill in all fields.");
    return;
  }

  const users = JSON.parse(localStorage.getItem("users")) || [];

  const userExists = users.some(user => user.username === username || user.email === email);
  if (userExists) {
    alert("User already exists.");
    return;
  }

  users.push({ username, email, password, role });
  localStorage.setItem("users", JSON.stringify(users));

  alert("Account created! Please log in.");
  window.location.href = "signin.html";
}

function handleSignIn(event) {
  event.preventDefault();

  const username = document.getElementById("signin-username").value.trim();
  const password = document.getElementById("signin-password").value;

  const users = JSON.parse(localStorage.getItem("users")) || [];
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    alert("Invalid credentials.");
    return;
  }

  localStorage.setItem("loggedInUser", JSON.stringify(user));

  if (user.role === "merchant") {
    window.location.href = "merchant-dashboard.html";
  } else {
    window.location.href = "customer-dashboard.html";
  }
}

function handleSearch(event) {
  event.preventDefault();
  const query = document.getElementById('searchInput').value.trim();
  if (query) {
    alert("You searched for: " + query);
  }
}
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user || user.role !== "merchant") {
    alert("Access denied.");
    window.location.href = "signin.html";
  } else {
    document.getElementById("merchant-name").textContent = user.username;
    loadProducts();
  }

  function addProduct(event) {
    event.preventDefault();
    const name = document.getElementById("product-name").value.trim();
    const price = document.getElementById("product-price").value.trim();
    const desc = document.getElementById("product-desc").value.trim();

    const product = {
      id: Date.now(),
      merchant: user.username,
      name, price, desc
    };

    const products = JSON.parse(localStorage.getItem("products")) || [];
    products.push(product);
    localStorage.setItem("products", JSON.stringify(products));

    document.getElementById("product-form").reset();
    loadProducts();
  }

  function loadProducts() {
    const products = JSON.parse(localStorage.getItem("products")) || [];
    const myProducts = products.filter(p => p.merchant === user.username);
    const list = document.getElementById("product-list");
    list.innerHTML = "";

    if (myProducts.length === 0) {
      list.innerHTML = "<li>No products yet.</li>";
      return;
    }

    myProducts.forEach(p => {
      const li = document.createElement("li");
      li.innerHTML = <strong>${p.name}</strong> - $${p.price}<br>${p.desc};
      list.appendChild(li);
    });
   }

  function logout() {
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
  }
>>>>>>> a9640d8546ce7ea728020b7bceabeef443adce03
