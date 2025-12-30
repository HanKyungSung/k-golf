# Domain Migration: kgolf.ca → konegolf.ca

**Status:** 🔄 In Progress  
**Started:** December 26, 2025  
**Goal:** Migrate from kgolf.ca to konegolf.ca as primary domain

---

## **PART 1: Domain Change - konegolf.ca as Primary, kgolf.ca Redirect**

### **Step 1: DNS Configuration (DigitalOcean Dashboard)**
- [ ] Log into DigitalOcean
- [ ] Go to Networking → Domains
- [ ] Add domain `konegolf.ca`
- [ ] Create A records:
  - [ ] `konegolf.ca` → `147.182.215.135` (TTL: 3600)
  - [ ] `www.konegolf.ca` → `147.182.215.135` (TTL: 3600)
- [ ] Verify existing `kgolf.ca` DNS records remain (needed for redirect)

### **Step 2: SSH to Droplet & Obtain SSL Certificate**
- [ ] SSH to droplet: `ssh root@147.182.215.135`
- [ ] Run certbot:
```bash
sudo certbot certonly --nginx -d konegolf.ca -d www.konegolf.ca
```
- [ ] Verify certificates created at `/etc/letsencrypt/live/konegolf.ca/`

### **Step 3: Verify SSL Auto-Renewal (Already Configured)**
- [ ] Check certificates: `sudo certbot certificates`
- [ ] Test renewal: `sudo certbot renew --dry-run`
- [ ] Confirm konegolf.ca appears in renewal list

**Note:** Server has triple redundancy for SSL renewal (systemd, snap, cron). No additional setup needed!

### **Step 4: Create Nginx Configuration for konegolf.ca**
- [ ] Create config file:
```bash
sudo nano /etc/nginx/sites-available/konegolf.ca
```

- [ ] Paste configuration:
```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name konegolf.ca www.konegolf.ca;
    return 301 https://konegolf.ca$request_uri;
}

# www → non-www redirect
server {
    listen 443 ssl http2;
    server_name www.konegolf.ca;
    
    ssl_certificate /etc/letsencrypt/live/konegolf.ca/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/konegolf.ca/privkey.pem;
    
    return 301 https://konegolf.ca$request_uri;
}

# HTTPS server for konegolf.ca (main)
server {
    listen 443 ssl http2;
    server_name konegolf.ca;

    ssl_certificate /etc/letsencrypt/live/konegolf.ca/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/konegolf.ca/privkey.pem;
    
    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;

    # Proxy to K-Golf backend (serves both API and frontend)
    location / {
        proxy_pass http://localhost:8082;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

- [ ] Save and exit (Ctrl+X, Y, Enter)

### **Step 5: Update k-golf.ca to Redirect**
- [ ] Edit existing config:
```bash
sudo nano /etc/nginx/sites-available/k-golf.ca
```

- [ ] Replace entire content with:
```nginx
# Redirect kgolf.ca → konegolf.ca (HTTP)
server {
    listen 80;
    server_name k-golf.ca www.k-golf.ca;
    return 301 https://konegolf.ca$request_uri;
}

# Redirect kgolf.ca → konegolf.ca (HTTPS)
server {
    listen 443 ssl http2;
    server_name k-golf.ca www.k-golf.ca;

    ssl_certificate /etc/letsencrypt/live/k-golf.ca/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/k-golf.ca/privkey.pem;
    
    return 301 https://konegolf.ca$request_uri;
}
```

- [ ] Save and exit

### **Step 6: Enable Nginx Configs & Reload**
- [ ] Enable konegolf.ca:
```bash
sudo ln -s /etc/nginx/sites-available/konegolf.ca /etc/nginx/sites-enabled/
```

- [ ] Test nginx: `sudo nginx -t`
- [ ] Reload nginx: `sudo systemctl reload nginx`

### **Step 7: Update Environment Variables**
- [ ] Edit production env:
```bash
cd /root/k-golf
nano .env.production
```

- [ ] Update these variables:
```env
CORS_ORIGIN=https://konegolf.ca,https://www.konegolf.ca
FRONTEND_ORIGIN=https://konegolf.ca
EMAIL_FROM=no-reply@konegolf.ca
SEED_ADMIN_EMAIL=admin@konegolf.ca
```

- [ ] Keep all other variables unchanged
- [ ] Save and exit

### **Step 8: Restart K-Golf Services**
- [ ] Stop services:
```bash
cd /root/k-golf
docker-compose -f docker-compose.release.yml down
```

- [ ] Start services:
```bash
docker-compose -f docker-compose.release.yml up -d
```

- [ ] Check logs:
```bash
docker-compose -f docker-compose.release.yml logs -f --tail=50
```

### **Step 9: Verify Domain Migration**
- [ ] Test `curl -I https://konegolf.ca` (should load)
- [ ] Test `curl -I https://www.konegolf.ca` (should redirect)
- [ ] Test `curl -I https://k-golf.ca` (should redirect)
- [ ] Test `curl -I https://www.k-golf.ca` (should redirect)
- [ ] Check SSL: `echo | openssl s_client -connect konegolf.ca:443 -servername konegolf.ca 2>/dev/null | openssl x509 -noout -dates`

---

## **PART 2: Gmail App Password & Admin Email Update**

### **Step 1: Create Gmail App Password**
- [ ] Go to: https://myaccount.google.com/security
- [ ] Enable **2-Step Verification** (if not enabled)
- [ ] Click on **"App passwords"**
- [ ] Click **"Select app"** → Choose "Mail"
- [ ] Click **"Select device"** → Choose "Other" → Type "K-Golf Production"
- [ ] Click **"Generate"**
- [ ] Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)
- [ ] Remove spaces: `xxxxxxxxxxxxxxxx`
- [ ] **Save this password securely!**

### **Step 2: Update Production Server Environment**
- [ ] SSH to droplet: `ssh root@147.182.215.135`
- [ ] Edit env file:
```bash
cd /root/k-golf
nano .env.production
```

- [ ] Update these variables:
```env
GMAIL_USER=your_new_email@gmail.com
GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
EMAIL_FROM=no-reply@konegolf.ca
SEED_ADMIN_EMAIL=admin@konegolf.ca
```

- [ ] Save and exit

### **Step 3: Update Database Admin Email**
- [ ] Connect to PostgreSQL:
```bash
docker exec -it kgolf-postgres psql -U kgolf -d kgolf_app
```

- [ ] Update admin email:
```sql
UPDATE "User" SET email = 'admin@konegolf.ca' WHERE role = 'ADMIN';
```

- [ ] Verify change:
```sql
SELECT id, email, name, role FROM "User" WHERE role = 'ADMIN';
```

- [ ] Exit: `\q`

### **Step 4: Restart Services to Apply Email Changes**
- [ ] Restart:
```bash
cd /root/k-golf
docker-compose -f docker-compose.release.yml restart
```

- [ ] Check logs:
```bash
docker-compose -f docker-compose.release.yml logs backend | grep -i email
```

### **Step 5: Update Local Codebase**
- [ ] Update `backend/.env.example` (lines 13-16):
```env
GMAIL_USER=your_new_email@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password
EMAIL_FROM=no-reply@konegolf.ca
SEED_ADMIN_EMAIL=admin@konegolf.ca
```

- [ ] Update `backend/prisma/seed.ts` (line 102):
```typescript
const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@konegolf.ca';
```

- [ ] Update `backend/src/services/emailService.ts` (line 44):
```typescript
await transport.sendMail({ from: 'K-Golf <no-reply@konegolf.ca>', to, subject, text, html });
```

- [ ] Commit changes:
```bash
git add backend/.env.example backend/prisma/seed.ts backend/src/services/emailService.ts
git commit -m "Update domain to konegolf.ca and default admin email

- Change default admin email to admin@konegolf.ca
- Update email sender to no-reply@konegolf.ca
- Update .env.example with new domain"
git push
```

---

## **FINAL VERIFICATION CHECKLIST**

### **Domain & SSL:**
- [ ] `https://konegolf.ca` loads K-Golf app
- [ ] `https://www.konegolf.ca` redirects to `https://konegolf.ca`
- [ ] `https://k-golf.ca` redirects to `https://konegolf.ca`
- [ ] `https://www.k-golf.ca` redirects to `https://konegolf.ca`
- [ ] SSL certificate valid for konegolf.ca (green lock icon)
- [ ] `sudo certbot certificates` shows konegolf.ca in list

### **Email:**
- [ ] Test verification email: Sign up with new email
- [ ] Verify email arrives from `no-reply@konegolf.ca`
- [ ] Check email links point to `https://konegolf.ca`
- [ ] Test receipt email from POS
- [ ] Verify receipt email signature shows correct domain

### **Admin Login:**
- [ ] Login with `admin@konegolf.ca` works
- [ ] Admin dashboard accessible
- [ ] All admin functions work

### **Application:**
- [ ] Customer booking flow works
- [ ] POS system loads and functions
- [ ] Database queries working
- [ ] CORS not blocking requests
- [ ] Check browser console for errors

---

## **NOTES & ISSUES**

### Issues Encountered:
*Document any problems here as we go*

### Rollback Plan (if needed):
1. Revert Nginx configs to original k-golf.ca
2. Revert .env.production variables
3. Restart docker containers
4. Update DNS if necessary

---

**Status Legend:**
- [ ] Not Started
- [x] Completed
- [!] Issue/Blocked
- [~] In Progress
