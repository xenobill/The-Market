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