# OTP Verification Setup Guide

## Current Status
✅ **OTP System is Fully Configured**

## How to Test OTP Signup

### Step 1: Open Signup
1. Go to http://localhost:3000
2. Click "Sign Up"
3. Select your role (Customer or Merchant)

### Step 2: Fill Signup Form
- Full Name (Surname, First Name, Middle Name)
- Email: **Use a real email address** (Gmail recommended)
- Password: At least 8 characters with uppercase, number, special character
- Nationality & Category (for customers)
- Click "Sign Up"

### Step 3: OTP Generation
After form validation:
- An OTP will be generated (6 digits)
- You'll see the OTP code in an alert box on screen
- **Copy this OTP code**
- You'll be redirected to OTP verification page

### Step 4: Enter OTP
- Paste the OTP code you received
- Click "Verify OTP"

### Step 5: Account Created
- If successful: "Email verified and account created! Redirecting..."
- You'll be taken to your dashboard (customer-dashboard.html or merchant-dashboard.html)

---

## Email Configuration (Gmail)

### If You Want OTP Sent to Email Instead of Alert:

1. **Create a Gmail App Password** (not your regular password):
   - Go to myaccount.google.com
   - Security > App Passwords
   - Select "Mail" and "Windows Computer"
   - Google generates a 16-character password
   - Copy this password

2. **Update `.env` File**:
   ```
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-char-app-password
   ```

3. **Restart Server**:
   ```bash
   node server.js
   ```

4. **Test Signup Again**:
   - OTP will be sent to your email
   - Check spam folder if not in inbox
   - Use OTP code to verify

---

## Troubleshooting

### "OTP verification failed"
**Solution:**
- Check browser console (F12 > Console)
- Ensure OTP is 6 digits
- Make sure you entered it correctly (no spaces)
- OTP expires after signup, you must verify immediately
- Restart server if OTP doesn't work: `node server.js`

### "Server error. Please try again."
**Solution:**
- Check server logs in terminal
- Restart server
- Clear browser cache (Ctrl+Shift+Delete)
- Open incognito/private window and try again

### Email Not Arriving
**Solution:**
- Verify EMAIL_USER and EMAIL_PASS in `.env`
- Check Gmail App Passwords were created correctly
- Gmail disabled for "less secure apps"? That's normal, use App Password instead
- Check spam folder
- Try again after 1 minute (Gmail rate limiting)

### "Email already registered"
**Solution:**
- Account already exists with that email
- Click "Sign In" instead
- Or use a different email address

---

## Key Files

| File | Purpose |
|------|---------|
| `server.js` | OTP generation & verification |
| `auth.js` | Frontend signup logic |
| `signup.html` | Signup form |
| `otp.html` | OTP verification form |
| `.env` | Email credentials |
| `orders.json` | Stores OTP verification history |

---

## OTP Endpoints

### Send OTP
```
POST /send_otp
Body: { email, name, otp }
Response: { success: true, otp: "123456" }
```

### Verify OTP
```
POST /verify_otp
Body: { email, otp: "123456" }
Response: { success: true, message: "OTP verified" }
```

---

## Next Steps After Signup

1. ✅ **Account Created** - You're now registered
2. ✅ **Sign In** - Use email & password on sign.html
3. ✅ **Edit Profile** - Go to dashboard > Edit Profile
4. ✅ **Upload Picture** - Add profile picture from Cloudinary
5. ✅ **Browse Products** - View categories and products
6. ✅ **Place Orders** - Buy products (checkout in progress)
7. ✅ **View History** - See purchase history in dashboard

---

## Production Setup

For production deployment:

1. ✅ Change SESSION_SECRET in `.env` to random 32+ character string
2. ✅ Use Gmail App Password (not regular password)
3. ✅ Update DATABASE_URL if using cloud database
4. ✅ Enable HTTPS (required for Firebase)
5. ✅ Set up email service backup
6. ✅ Configure backup OTP delivery (SMS optional)

---

**Last Updated:** April 26, 2026  
**Status:** ✅ Fully Functional
