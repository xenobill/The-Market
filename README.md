GlenHub — local development

Quick start

1) Copy example env and fill values:
   - Create a file named `.env` in the project root and paste values from `.env.example`.

2) Install dependencies:
   ```powershell
   cd "c:\Users\OWNER\Desktop\glenhub"
   npm install
   ```

3) Start the server:
   ```powershell
   npm start
   ```

4) Open the site in your browser:
   ```powershell
   start http://localhost:3000
   ```

Notes
- The Express server serves static files from the project root. The root route (`/`) serves `Index.html`.
- Product image uploads POST to `/upload_product` and are uploaded to Cloudinary (configure credentials in `.env`).
- OTP endpoints (`/send_otp` and `/verify_otp`) send/verify emails — set valid email credentials or mock locally.

Security
- Do not commit your real `.env` to source control. Use `.env.example` in the repo to show required variables.
