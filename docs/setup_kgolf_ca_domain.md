# Setup k-golf.ca Domain on DigitalOcean Droplet

## Current Status
✅ DNS A records configured for k-golf.ca → 147.182.215.135  
✅ Domain resolves to droplet  
🔄 Need to configure Nginx and SSL

---

## Step 1: Obtain SSL Certificate

SSH into the droplet and run certbot:

```bash
ssh root@147.182.215.135

# Get SSL certificate for k-golf.ca
sudo certbot certonly --nginx -d k-golf.ca -d www.k-golf.ca
```

This will create certificate files at:
- `/etc/letsencrypt/live/k-golf.ca/fullchain.pem`
- `/etc/letsencrypt/live/k-golf.ca/privkey.pem`

---

## Step 2: Create Nginx Configuration

Create a new Nginx config file:

```bash
sudo nano /etc/nginx/sites-available/k-golf.ca
```

Paste this configuration:

```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name k-golf.ca www.k-golf.ca;
    return 301 https://k-golf.ca$request_uri;
}

# HTTPS server for k-golf.ca
server {
    listen 443 ssl http2;
    server_name k-golf.ca www.k-golf.ca;

    ssl_certificate /etc/letsencrypt/live/k-golf.ca/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/k-golf.ca/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy strict-origin-when-cross-origin;
    add_header X-XSS-Protection "1; mode=block";
    add_header Cross-Origin-Opener-Policy same-origin always;
    add_header Cross-Origin-Resource-Policy same-origin always;
    add_header Cross-Origin-Embedder-Policy require-corp always;

    # Proxy all traffic to K-Golf backend container
    location / {
        proxy_pass http://127.0.0.1:8082/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;
    }
}
```

Save and exit (Ctrl+X, Y, Enter)

---

## Step 3: Enable the Site

```bash
# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/k-golf.ca /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

---

## Step 4: Update Backend Environment Variables

Update the K-Golf backend to accept requests from k-golf.ca:

```bash
cd /root/k-golf

# Edit environment file
nano .env.production
```

Update these variables:
```bash
# Add k-golf.ca to CORS origins
CORS_ORIGIN=https://k-golf.ca,https://www.k-golf.ca,https://k-golf.inviteyou.ca

# Set primary frontend origin
FRONTEND_ORIGIN=https://k-golf.ca
```

Save and exit.

---

## Step 5: Restart Docker Container

```bash
cd /root/k-golf

# Restart the backend container with new environment
docker compose -f docker-compose.release.yml down
docker compose -f docker-compose.release.yml up -d

# Verify container is running
docker compose -f docker-compose.release.yml ps
```

---

## Step 6: Test the Domain

```bash
# Test HTTPS redirect
curl -I http://k-golf.ca

# Test HTTPS access
curl -I https://k-golf.ca

# Test API endpoint
curl -I https://k-golf.ca/api/health

# Test from your browser
# Visit: https://k-golf.ca
```

---

## Step 7: (Optional) Disable k-golf.inviteyou.ca

If you want to completely switch from k-golf.inviteyou.ca to k-golf.ca:

```bash
# Disable the old subdomain config
sudo rm /etc/nginx/sites-enabled/k-golf.inviteyou.ca

# Or keep it and add a redirect to the new domain
```

You can also add a redirect in the old config:
```nginx
server {
    listen 443 ssl http2;
    server_name k-golf.inviteyou.ca;
    
    ssl_certificate /etc/letsencrypt/live/inviteyou.ca-0002/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/inviteyou.ca-0002/privkey.pem;
    
    return 301 https://k-golf.ca$request_uri;
}
```

---

## Verification Checklist

- [ ] SSL certificate obtained for k-golf.ca
- [ ] Nginx config file created
- [ ] Nginx config test passes (`nginx -t`)
- [ ] Nginx reloaded successfully
- [ ] Backend environment variables updated
- [ ] Docker container restarted
- [ ] https://k-golf.ca loads the application
- [ ] https://k-golf.ca/api/health returns 200 OK
- [ ] Login and booking features work

---

## Troubleshooting

### Issue: Certificate not found
```bash
# List available certificates
sudo certbot certificates

# If k-golf.ca cert doesn't exist, create it
sudo certbot certonly --nginx -d k-golf.ca -d www.k-golf.ca
```

### Issue: Nginx test fails
```bash
# Check syntax errors
sudo nginx -t

# View Nginx error log
sudo tail -50 /var/log/nginx/error.log
```

### Issue: Site shows 502 Bad Gateway
```bash
# Check if backend container is running
docker ps

# Check container logs
docker logs k-golf-backend-1

# Restart container
cd /root/k-golf
docker compose -f docker-compose.release.yml restart
```

### Issue: CORS errors in browser
- Make sure CORS_ORIGIN includes k-golf.ca
- Restart backend container after changing .env.production
- Check browser console for exact CORS error

---

## Final Architecture

After setup:
```
https://k-golf.ca           → Nginx → Docker (8082) → K-Golf App
https://inviteyou.ca        → Nginx → PM2 (8080) → InviteYou App
https://k-golf.inviteyou.ca → (optional) redirect to k-golf.ca
```
