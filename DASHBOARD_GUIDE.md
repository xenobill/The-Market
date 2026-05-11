# GlenHub Dashboard System

## Overview
Complete dashboard system for both Merchants and Customers with sidebar navigation.

## Merchant Dashboard (`merchant-dashboard.html`)
**Access**: Automatic redirect after merchant login
**Sidebar Navigation**:
- 📊 **Dashboard** - Overview with stats (Total Products, Total Sales, Customers)
- 📦 **Products** - View all uploaded products
- ⬆️ **Upload Product** - Upload new products with image, price, and description
- 💬 **Customer Care** - Chat assistant for customer inquiries
- 👤 **Profile** - View merchant profile details (Username, Email, Account Type, Member Since)

**Features**:
- Real-time product count
- Product grid with delete option
- Image upload to Cloudinary
- Live customer chat support
- Profile with member details
- Logout functionality

---

## Customer Dashboard (`customer-dashboard.html`)
**Access**: Automatic redirect after customer login
**Sidebar Navigation**:
- 👤 **Profile** - View customer profile details with avatar
- 📜 **Purchase History** - View all purchase orders with status
- 💬 **Customer Care** - Chat assistant for support

**Profile Section Shows**:
- Large profile avatar with initials
- Username
- Email address
- Account type
- Member since date

**Purchase History Includes**:
- Product name
- Price in Naira (₦)
- Order date
- Status (Delivered, Processing, Cancelled)
- Visual status badges with colors

---

## How It Works

### Login Flow
1. User signs up on `signup.html` (Merchant or Customer)
2. User signs in on `sign.html`
3. Server validates and returns user role
4. **Merchant** → Redirected to `merchant-dashboard.html`
5. **Customer** → Redirected to `customer-dashboard.html`

### Sidebar Navigation
- Click any sidebar item to switch pages
- Active page highlighted in sidebar
- Smooth fade-in animation between pages
- Sidebar collapses on mobile (shows icons only)

### Data Display
- **Merchant**: Pulls products from `/products` endpoint, filters by merchant username
- **Customer**: Shows profile from `localStorage.loggedInUser`
- **Purchase History**: Mock data (ready for server integration)

---

## Styling Features

### Color Scheme
- Primary: `#667eea` to `#764ba2` (Purple gradient)
- Accent: `#f44336` (Red for actions)
- Text: `#333` (Dark gray)
- Background: `#f5f5f5` (Light gray)

### Responsive Design
- Desktop: Full sidebar visible with text
- Tablet: Sidebar width reduced
- Mobile: Sidebar shows icons only (80px width)

### Animations
- Page transitions: Fade-in (0.3s)
- Message bubbles: Slide-in (0.3s)
- Card hover: Translate-Y with shadow

---

## Integration Points

### Server Endpoints Used
- `GET /products` - Fetch all products
- `POST /upload_product` - Upload new product
- `POST /api/signin` - User login
- `POST /api/signout` - User logout
- `POST /api/cart` - Cart operations (future)

### localStorage Keys
- `loggedInUser` - Current logged-in user object
- `tempCart` - Anonymous cart items
- `verifiedMerchants` - Cached merchant list

---

## Customization

### Change Sidebar Icons
Edit the emoji in sidebar items:
```html
<div class="sidebar-item-icon">📊</div>
```

### Add More Pages
1. Add new sidebar item:
```html
<div class="sidebar-item" onclick="switchPage(event, 'newpage')">
  <div class="sidebar-item-icon">🆕</div>
  <div class="sidebar-item-text">New Page</div>
</div>
```

2. Add corresponding page section:
```html
<div id="newpage" class="page-section">
  <!-- Content here -->
</div>
```

3. Update page title in switchPage function

### Modify Purchase History Data
Edit `loadPurchaseHistory()` function in customer dashboard to fetch from server when ready:
```javascript
// Replace mock data with server call
fetch('/api/orders')
  .then(r => r.json())
  .then(data => renderPurchaseHistory(data.orders));
```

---

## Features Ready for Implementation

- ✅ Role-based dashboard access
- ✅ Sidebar navigation
- ✅ Profile display
- ✅ Product upload/management
- ✅ Customer care chat UI
- ✅ Purchase history display
- 🔄 Delete product endpoint (backend needed)
- 🔄 Order submission to server (backend needed)
- 🔄 Real purchase history from database

---

## Testing

### Test as Merchant
1. Sign up with role "Merchant"
2. Use password: `TestPass@123` (meets requirements)
3. Redirects to `merchant-dashboard.html`
4. Try uploading a product
5. View in Products tab

### Test as Customer
1. Sign up with role "Customer"
2. Use password: `TestPass@123`
3. Redirects to `customer-dashboard.html`
4. View profile information
5. Check mock purchase history

---

## Notes
- All user data comes from localStorage after login
- Product data filtered by merchant username
- Chat is simulation (no backend storage)
- Ready for backend integration at any endpoint
