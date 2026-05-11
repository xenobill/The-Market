// --- Sign In logic for merchant and customer tabs ---
function setSignInMessage(message, isError = true) {
  const msg = document.getElementById('signin-message');
  if (!msg) return;
  msg.textContent = message || '';
  msg.style.color = isError ? '#ff6b6b' : '#4ade80';
  msg.style.display = message ? 'block' : 'none';
}

function handleSignIn(event, role) {
  event.preventDefault();
  setSignInMessage('');
  let username, password;
  if (role === "merchant") {
    username = document.getElementById("merchant-signin-username").value.trim();
    password = document.getElementById("merchant-signin-password").value;
  } else {
    username = document.getElementById("customer-signin-username").value.trim();
    password = document.getElementById("customer-signin-password").value;
  }

  password = password ? password.trim() : password;
  console.log('[SignIn] credentials:', { role, username, passwordLength: password ? password.length : 0 });

  if (!username || !password) {
    setSignInMessage('Please enter both email and password.', true);
    return;
  }

  fetch('/api/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ username, password })
  })
  .then(async res => {
    const bodyText = await res.text();
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('[SignIn] Non-JSON response from /api/signin:', bodyText);
      throw new Error('Server returned invalid response. Check the browser console.');
    }
    console.log('[SignIn] /api/signin response:', res.status, data);
    return data;
  })
  .then(data => {
    if (!data || !data.success) {
      throw new Error((data && data.message) || 'Invalid credentials');
    }
    const user = data.user;
    localStorage.setItem('loggedInUser', JSON.stringify(user));
    setSignInMessage('Login successful, redirecting...', false);
    const redirectUrl = user.role === 'merchant' ? 'merchant-dashboard.html' : 'customer-dashboard.html';
    window.location.href = redirectUrl;
  })
  .catch(err => {
    console.error('[SignIn] Error:', err);
    setSignInMessage('Sign in failed: ' + err.message, true);
  });
}

function handleSignUp(event, role) {
  event.preventDefault();
  console.log('[SignUp] Starting signup for role:', role);

  let surname, firstname, middlename, username, email, password, passwordConfirm, nationality, category, userRole;
  if (role === "merchant") {
    surname = document.getElementById("merchant-signup-surname").value.trim();
    firstname = document.getElementById("merchant-signup-firstname").value.trim();
    middlename = document.getElementById("merchant-signup-middlename").value.trim();
    username = document.getElementById("merchant-signup-username").value.trim();
    email = document.getElementById("merchant-signup-email").value.trim();
    password = document.getElementById("merchant-signup-password").value;
    passwordConfirm = document.getElementById("merchant-signup-password-confirm").value;
    nationality = document.getElementById("merchant-signup-nationality").value;
    category = document.getElementById("merchant-signup-category").value;
    userRole = "merchant";
  } else {
    surname = document.getElementById("customer-signup-surname").value.trim();
    firstname = document.getElementById("customer-signup-firstname").value.trim();
    middlename = document.getElementById("customer-signup-middlename").value.trim();
    username = document.getElementById("customer-signup-username").value.trim();
    email = document.getElementById("customer-signup-email").value.trim();
    password = document.getElementById("customer-signup-password").value;
    passwordConfirm = document.getElementById("customer-signup-password-confirm").value;
    nationality = document.getElementById("customer-signup-nationality").value;
    userRole = "customer";
    category = "";
  }

  console.log('[SignUp] Form values - username:', username, 'email:', email, 'password length:', password.length);

  if (!surname || !firstname || !username || !email || !password || !nationality || (userRole === "merchant" && !category)) {
    const missing = [];
    if (!surname) missing.push('Surname');
    if (!firstname) missing.push('First Name');
    if (!username) missing.push('Username');
    if (!email) missing.push('Email');
    if (!password) missing.push('Password');
    if (!nationality) missing.push('Nationality');
    if (userRole === "merchant" && !category) missing.push('Category');
    alert("Please fill in all required fields: " + missing.join(', '));
    return;
  }

  if (password !== passwordConfirm) {
    alert("Passwords do not match. Please try again.");
    return;
  }

  if (password.length < 8) {
    alert("Password must be at least 8 characters long.");
    return;
  }

  const otp = Math.floor(100000 + Math.random() * 900000);
  const pendingUser = { surname, firstname, middlename, username, email, password, nationality, category, role: userRole };
  localStorage.setItem("pendingUser", JSON.stringify(pendingUser));

  fetch('/send_otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name: firstname, otp })
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      alert(`OTP generated: ${data.otp}\n\nPlease enter this code on the next page to verify your email.`);
      window.location.href = 'otp.html';
    } else {
      alert('Failed to send OTP: ' + (data.message || 'Unknown error'));
    }
  })
  .catch(err => {
    console.error('[SignUp] Error sending OTP:', err);
    alert('Failed to send OTP: ' + err.message);
  });
}

// --- OTP Verification Logic ---
function handleOTP(event) {
  event.preventDefault();
  const enteredOTP = document.getElementById("otp-code").value.trim();
  let pendingUser = null;
  try {
    pendingUser = JSON.parse(localStorage.getItem("pendingUser"));
  } catch (e) {
    console.warn('Failed to parse pendingUser from localStorage:', e.message);
    alert('Signup session expired. Please sign up again.');
    window.location.href = 'signup.html';
    return;
  }

  if (!pendingUser || !pendingUser.email) {
    alert('No pending signup found. Please sign up again.');
    window.location.href = 'signup.html';
    return;
  }

  if (!enteredOTP || enteredOTP.length !== 6) {
    alert('Please enter a valid 6-digit OTP code');
    return;
  }

  const otpMsg = document.getElementById("otp-message");
  otpMsg.textContent = 'Verifying OTP...';
  otpMsg.style.color = 'blue';

  fetch('/verify_otp', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: pendingUser.email, otp: enteredOTP })
  })
  .then(res => res.json())
  .then(data => {
    if (!data.success) {
      throw new Error(data.message || 'OTP verification failed');
    }
    otpMsg.textContent = 'Email verified! Creating account...';
    otpMsg.style.color = 'blue';

    return fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        username: pendingUser.username,
        email: pendingUser.email,
        password: pendingUser.password,
        role: pendingUser.role,
        firstname: pendingUser.firstname,
        middlename: pendingUser.middlename,
        surname: pendingUser.surname,
        nationality: pendingUser.nationality,
        category: pendingUser.category
      })
    });
  })
  .then(res => res.json())
  .then(data => {
    if (!data.success) {
      throw new Error(data.message || 'Failed to create account');
    }
    const user = data.user;
    localStorage.setItem('loggedInUser', JSON.stringify(user));
    localStorage.removeItem('pendingUser');
    otpMsg.textContent = 'Email verified and account created! Redirecting...';
    otpMsg.style.color = 'green';
    const redirectUrl = user.role === 'merchant' ? 'merchant-dashboard.html' : 'customer-dashboard.html';
    setTimeout(() => { window.location.href = redirectUrl; }, 1200);
  })
  .catch(err => {
    console.error('[OTP] Error:', err);
    otpMsg.textContent = err.message || 'OTP verification failed. Please try again.';
    otpMsg.style.color = 'red';
  });
}

// --- Tab switching logic for sign in page ---
document.addEventListener("DOMContentLoaded", function () {
  const merchantTab = document.getElementById('merchant-tab');
  const customerTab = document.getElementById('customer-tab');
  const merchantSignin = document.getElementById('merchant-signin');
  const customerSignin = document.getElementById('customer-signin');
  if (merchantTab && customerTab && merchantSignin && customerSignin) {
    merchantTab.onclick = function() {
      merchantTab.classList.add('active');
      customerTab.classList.remove('active');
      merchantSignin.classList.add('active');
      customerSignin.classList.remove('active');
    };
    customerTab.onclick = function() {
      customerTab.classList.add('active');
      merchantTab.classList.remove('active');
      customerSignin.classList.add('active');
      merchantSignin.classList.remove('active');
    };
  }
});