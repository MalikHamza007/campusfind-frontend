# Deploying the frontend (Hostinger — vspark.learn2earntech.com)

1. Check `src/environments/environment.prod.ts` → `apiUrl: 'https://api.vspark.learn2earntech.com/api'` (change it if the API lives elsewhere).
2. Build:
   ```bash
   npm ci
   npm run build
   ```
   Output: `dist/campusfind/browser/` (includes `.htaccess`, `favicon.svg`, `pdfjs/` worker and Leaflet images).
3. In hPanel → **File Manager** (or SFTP), open the document root of `vspark.learn2earntech.com` (usually `public_html/`), remove the old build, and upload the **contents** of `dist/campusfind/browser/` (not the folder itself). Make sure hidden files are shown so `.htaccess` is uploaded.
4. `.htaccess` (already in the build) sends deep links to `index.html`:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```
5. Verify:
   - Open `https://vspark.learn2earntech.com/login`, then refresh `https://vspark.learn2earntech.com/items` (deep link must load, not 404).
   - Sign in, reload the page — you should stay signed in (session restore).
   - Report an item with a photo; the thumbnail must appear (private bucket + 60 s link).
   - Open DevTools → Console/Network: no CORS or mixed-content errors; API calls go to `https://api.vspark.learn2earntech.com/api`.
   - If you see "Cannot reach CampusFind", the API isn't deployed yet or its CORS list is missing `https://vspark.learn2earntech.com`.
