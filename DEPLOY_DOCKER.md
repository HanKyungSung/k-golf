## Recommended deployment steps (blue/green style)

1. Prep server
    - Install Docker Engine + Docker Compose v2 (details below)
    - Keep existing PM2 processes running for now (we'll cut over later)

    <details>
    <summary><strong>Install Docker & Compose v2 on Ubuntu (expand)</strong></summary>

    Why Compose v2: integrated with `docker` CLI (`docker compose`), faster (Go), new features (only v2 receives them), unified auth/context.

    Assumptions: Ubuntu 22.04/20.04, sudo user, no need to preserve legacy docker-compose v1.

    ```bash
    # Remove legacy packages (safe if absent)
    sudo apt-get remove -y docker docker-engine docker.io containerd runc docker-compose || true

    # Prereqs
    sudo apt-get update -y
    sudo apt-get install -y ca-certificates curl gnupg lsb-release

    # Add Docker GPG key & repo
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $UBUNTU_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Engine + CLI + Buildx + Compose plugin (this is Compose v2)
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Enable & start
    sudo systemctl enable --now docker

    # Add current user to docker group (logout/in OR newgrp for current shell)
    sudo usermod -aG docker $USER
    newgrp docker

    # Smoke test
    docker run --rm hello-world

    # Verify versions
    docker --version
    docker compose version

    # (Optional) log rotation hardening
    sudo tee /etc/docker/daemon.json > /dev/null <<'JSON'
    {
       "log-driver": "json-file",
       "log-opts": { "max-size": "10m", "max-file": "3" },
       "storage-driver": "overlay2"
    }
    JSON
    sudo systemctl restart docker

    # Quick compose test
    cat > test-compose.yml <<'YML'
    services:
       web:
          image: nginx:alpine
          ports:
             - "8089:80"
    YML
    docker compose -f test-compose.yml up -d
    curl -I http://localhost:8089 || true
    docker compose -f test-compose.yml down
    rm test-compose.yml
    ```

    Troubleshooting:
    - Permission denied to daemon: re-login or `newgrp docker`.
    - `docker-compose` not found: use `docker compose` (space) after plugin install.
    - DNS issues: add a `"dns": ["1.1.1.1","8.8.8.8"]` entry in daemon.json and restart.
    - Rate limit pulls: `docker login` (if using Docker Hub heavily).

    </details>

2. Copy / pull repo to server (or git pull latest).
    - Purpose: Ensure the server has the latest Docker-related files (compose files, Dockerfiles) if you plan to build on the server or run prod compose manually.
    - If you rely solely on CI-built images + `docker-compose.release.yml`, you technically only need that compose file on the server (CI copies it during deploy). Keeping the full repo is still useful for emergency manual builds or debugging.
    - Command examples:
       ```bash
       # first time
       git clone https://github.com/your-org/k-golf.git
       # subsequent updates
       git pull origin main
       ```

3. Create `.env.production` (don’t commit) if you prefer env file; otherwise set env in compose override. Replace placeholders:
   - SMTP_* values, CORS_ORIGIN, any secrets.
   - Optionally remove them from compose and use `env_file:`.
    - Why: Keeps secrets out of version control & GitHub Actions logs. Easier to rotate credentials.
    - Example `.env.production`:
       ```dotenv
       CORS_ORIGIN=https://your-domain
       SMTP_HOST=smtp.mailprovider.com
       SMTP_PORT=587
       SMTP_USER=apikey-user
       SMTP_PASS=super-secret
       EMAIL_FROM=no-reply@your-domain
       DATABASE_URL=postgres://kgolf:kgolf_password@db:5432/kgolf_app?schema=public
       ```
    - Then in compose add:
       ```yaml
       env_file:
          - .env.production
       ```

4. First build & start (detached):
```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```
    - Why: Builds images locally (if not using CI release yet) and boots the stack.
    - `build`: executes Dockerfiles producing backend & frontend images.
    - `up -d`: creates containers in background.
    - `ps`: sanity list of running containers & states.
    - `logs -f backend`: tail backend logs to confirm startup & DB connection.
    - If using remote images from CI use `docker-compose.release.yml` with `pull` instead of building.

5. Verify health:
```bash
curl http://SERVER_IP:8081/health
docker compose -f docker-compose.prod.yml logs --since=5m migrate
```
    - The frontend Nginx config serves a simple health endpoint; a 200 indicates container is reachable.
    - Checking `migrate` logs ensures Prisma migrations ran successfully (should show completion then container exits). If errors appear, fix schema/DB issues before proceeding.

6. App API test (inside network):
```bash
docker compose -f docker-compose.prod.yml exec backend wget -qO- http://localhost:8080/health
```
    - Runs from inside the backend container network namespace; isolates issues (verifies app responded before exposing externally).
    - If this fails while outer health passes, check env vars, DB connectivity, or port conflicts.

7. Point reverse proxy (Nginx/Caddy) to:
   - Frontend container: `http://127.0.0.1:8081`
   - Backend API (if proxied separately): use internal network or add a mapping (`ports: - 8080:8080`) once ready.
    - Why: Allows serving on ports 80/443 with TLS termination while keeping containers bound to high ports or internal ports.
    - Strategy: Add a new upstream (e.g. `upstream kgolf_frontend { server 127.0.0.1:8081; }`) then switch the server block root / proxy to it.
    - Test with a staging subdomain before cutting production DNS if possible.

8. Cutover:
   - Update DNS / virtual host to route traffic to Docker-backed endpoints.
   - Monitor logs for 10–15 min.
   - If stable: `pm2 delete <old-processes>` (after saving a backup: `pm2 save`).
    - Checklist before deleting PM2:
       - 200 responses from health
       - No migration errors
       - TLS / assets load correctly
       - Authentication & booking flows tested
    - Keep PM2 configs exported somewhere (`pm2 save && pm2 dump`) for rollback window.

9. Rollback (if needed):
   - Revert proxy to PM2 services.
   - Stop containers: `docker compose -f docker-compose.prod.yml down` (db volume persists).
    - Alternative (faster) rollback if using CI images:
       ```bash
       IMAGE_TAG=<previous_sha> docker compose -f docker-compose.release.yml pull
       IMAGE_TAG=<previous_sha> docker compose -f docker-compose.release.yml up -d
       ```
    - Only use full `down -v` if you intentionally want to destroy DB data (almost never in prod).

10. Ongoing ops:
   - Rebuild on changes: `docker compose -f docker-compose.prod.yml build backend frontend && docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend`
   - Tail logs: `docker compose -f docker-compose.prod.yml logs -f --tail=100 backend frontend`
   - DB psql: `docker compose -f docker-compose.prod.yml exec db psql -U kgolf -d kgolf_app`
    - Scale / debug:
       - Restart a single service: `docker compose -f docker-compose.prod.yml restart backend`
       - Inspect environment inside container: `docker compose exec backend env | grep PORT`
    - Image cleanup: `docker image prune -f` (removes dangling layers; safe periodically).
    - Backups:
       ```bash
       docker run --rm -v pg_data:/data -v $(pwd):/backup alpine tar czf /backup/pg_backup_$(date +%F).tgz -C /data .
       ```
    - Security updates: `sudo apt-get update && sudo apt-get upgrade -y` (host) + rebuild images to get patched base layers.

## Environment variables to finalize
Replace placeholders in `docker-compose.prod.yml`:
- `CORS_ORIGIN` (comma-separated for multi-origins)
- `FRONTEND_ORIGIN` (used for links in emails)
- (Optional) SMTP_* + `EMAIL_FROM` only if you enable real email locally
- Any auth-related secrets (future: `JWT_SECRET`, etc.)
Add them via an `.env` file and reference:
```
services:
  backend:
    env_file:
      - .env.production
```

## Notes / adjustments you might consider
- If production Postgres is managed (e.g., DO Managed DB), remove the `db` service and point `DATABASE_URL` at the managed instance.
- Add a volume for backend logs only if you introduce a file logger (currently stdout).
- For HTTPS terminate at host Nginx / Caddy (recommended) rather than adding a reverse proxy container.
- Add a `restart: unless-stopped` for backend/frontend if you want auto-restart (currently only implicit for backend via default policy). You can set it explicitly.

## Next optional improvements
- Add a lightweight health/status page with build SHA.
- Add `ARG GIT_SHA` to images and log it on startup.
- Introduce watchtower or CI pipeline for automatic image builds.

## Deployment Checklist (Actionable Sequence)

This assumes you will use the CI-produced images + `docker-compose.release.yml` (preferred). A build-on-server fallback path is included near the end for emergencies.

Legend: (O) optional, (A) choose one path.

### Pre‑Flight
- [x] 1. Local repo main branch pushed (CI must see latest code)
- [ ] 2. GitHub Actions "Docker Deploy" workflow succeeded (both backend & frontend images show new SHA tag in GHCR)
- [ ] 3. Record commit SHA (short 7 chars) you intend to deploy: `export RELEASE_SHA=<sha>` (for notes & rollback)
- [ ] 4. Server: Docker & Compose v2 installed (`docker compose version` shows v2.x)
- [ ] 5. Deploy user added to `docker` group (log out/in or `newgrp docker`)
- [ ] 6. Host time in sync (`timedatectl` → NTP active) – avoids token / TLS oddities
- [ ] 7. Firewall open: 22 (SSH), 80/443 (HTTP/HTTPS). Port 8081 temporarily allowed only if testing directly (close later)

### Secrets & Environment
- [ ] 8. Decide secrets strategy (A):
   - Path A1 (current workflow injects SMTP_ vars): Keep existing `docker-compose.release.yml` as-is; ensure GitHub secrets set: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.
   - Path A2 (env file on server): Create `.env.production` and add `env_file:` to services (`backend`, optionally `migrate`) then remove those vars from `environment:` and from SSH deploy command in workflow (edit workflow before deploying).
- [ ] 9. If Path A2: create file `/home/<deploy-user>/k-golf/.env.production`:
   ```dotenv
   NODE_ENV=production
   CORS_ORIGIN=https://your-domain
   SMTP_HOST=...
   SMTP_PORT=587
   SMTP_USER=...
   SMTP_PASS=...
   EMAIL_FROM=no-reply@your-domain
   DATABASE_URL=postgres://kgolf:kgolf_password@db:5432/kgolf_app?schema=public
   ```
- [ ] 10. (O) Add future secrets placeholders (e.g. `JWT_SECRET=`) even if app not using yet

### First Pull & Run (Release Compose)
- [ ] 11. Ensure deploy directory exists: `mkdir -p ~/k-golf && cd ~/k-golf`
- [ ] 12. Confirm `docker-compose.release.yml` present (copied by workflow or manual scp)
- [ ] 13. Pull images explicitly (manual or during automated deploy):
   ```bash
   IMAGE_TAG=$RELEASE_SHA docker compose -f docker-compose.release.yml pull
   ```
- [ ] 14. Start stack:
   ```bash
   IMAGE_TAG=$RELEASE_SHA docker compose -f docker-compose.release.yml up -d
   ```
- [ ] 15. List services & health states: `docker compose -f docker-compose.release.yml ps`
- [ ] 16. Migration logs clean (no errors, exits 0): `docker compose -f docker-compose.release.yml logs --since=15m migrate`
- [ ] 17. Backend internal health: `docker compose -f docker-compose.release.yml exec backend wget -qO- http://localhost:8080/health`
- [ ] 18. Frontend container health: `curl http://SERVER_IP:8081/health` (temporary port)

### Database & Persistence
- [ ] 19. Inspect volume exists: `docker volume inspect pg_data >/dev/null`
- [ ] 20. (O) Pre-initial backup after migrations:
   ```bash
   docker run --rm -v pg_data:/data -v $PWD:/backup alpine tar czf /backup/pg_initial_$(date +%F).tgz -C /data .
   ```
- [ ] 21. Restart backend only (proves stateless container + persistent DB): `docker compose -f docker-compose.release.yml restart backend`

### Reverse Proxy / Cutover
- [ ] 22. Add / update host Nginx server block to proxy 80/443 → frontend (127.0.0.1:8081) and `/api/` → backend (internal or expose 8080 if needed)
- [ ] 23. Reload Nginx (`nginx -t && systemctl reload nginx`)
- [ ] 24. Confirm HTTPS loads SPA + API calls succeed (check browser dev tools / network)
- [ ] 25. Disable direct exposure of 8081 (firewall drop or remove any public mapping later if you re-map ports)

### Functional Verification
- [ ] 26. Test core flows: sign up / login, booking creation, email send (check SMTP logs or inbox)
- [ ] 27. CORS working (no console errors)
- [ ] 28. Check logs (10–15m): `docker compose -f docker-compose.release.yml logs -f backend`
- [ ] 29. Note deployed commit SHA & time in an internal changelog / ticket

### Decommission Legacy & Hardening
- [ ] 30. Stop PM2 processes after parity: `pm2 delete <names>` (keep dump for 24h)
- [ ] 31. (O) Remove stale static directory `/root/k-golf/dist` if no longer served
- [ ] 32. Ensure log rotation (Docker default json-file + daemon.json config if added)
- [ ] 33. Schedule recurring DB backup (cron + tar or use pg_dump inside temporary container)
- [ ] 34. Add external uptime / health monitoring hitting `GET /health`
- [ ] 35. (O) Add image prune cron (weekly): `docker image prune -f`
- [ ] 36. (O) Remove legacy GitHub workflow (non-docker) once rollback window closed

### Rollback Procedure (Keep Handy)
- [ ] 37. Rollback test (off-hours): deploy prior SHA:
   ```bash
   IMAGE_TAG=<previous_sha> docker compose -f docker-compose.release.yml pull
   IMAGE_TAG=<previous_sha> docker compose -f docker-compose.release.yml up -d
   ```
- [ ] 38. If catastrophic: revert Nginx proxy to PM2 (only if PM2 still available) or redeploy previous SHA

### Emergency Build Fallback (Only if CI unavailable)
- [ ] 39. (O) Use `docker-compose.prod.yml` to build locally on server:
   ```bash
   docker compose -f docker-compose.prod.yml build
   docker compose -f docker-compose.prod.yml up -d
   ```
- [ ] 40. Tag locally built images for consistency (O): `docker tag <img> ghcr.io/...:<temporary>` (if you later want to push)

### Completion
- [ ] 41. Confirm no high CPU / memory anomalies (`docker stats` short check)
- [ ] 42. Document anything non-standard discovered during deploy
- [ ] 43. Deployment marked COMPLETE

---
Tip: Never run `docker compose ... down -v` in production unless you intentionally want to destroy persistent DB data. Use `down` (without `-v`) or prefer `up -d` with new images for zero data loss redeploys.

## Local CI Pipeline Simulation (Exact Steps)

Run these from the repository root to mimic what the GitHub Actions "Docker Deploy" workflow does. This helps you catch build or migration failures before pushing.

### 1. (Optional) Clean Workspace
```bash
docker system prune -f  # removes dangling images/containers/networks
```

### 2. Choose a Tag
Use the real commit SHA (preferred) or a temporary `local` tag:
```bash
export IMAGE_TAG=$(git rev-parse HEAD)  # or: export IMAGE_TAG=local
echo "Using IMAGE_TAG=$IMAGE_TAG"
```

### 3. Build Backend Image (matches CI backend build)
```bash
docker build --progress=plain -t ghcr.io/hankyungsung/kgolf-backend:$IMAGE_TAG ./backend
```
If it fails, fix errors (often dependency or TypeScript build) before proceeding.

### 4. Build Frontend Image
```bash
docker build --progress=plain -t ghcr.io/hankyungsung/kgolf-frontend:$IMAGE_TAG ./frontend
```

### 5. (Optional) Add Build Cache Tags
CI uses a build cache ref; locally you can skip. (If you want parity: also tag a `buildcache` ref.)

### 6. (Optional) Test Pushing (Requires Personal PAT with `write:packages`)
Skip unless you explicitly want to push your local test images.
```bash
# docker login ghcr.io -u <gh-user>
# docker push ghcr.io/hankyungsung/kgolf-backend:$IMAGE_TAG
# docker push ghcr.io/hankyungsung/kgolf-frontend:$IMAGE_TAG
```

### 7. Start Stack Using Release Compose
`docker-compose.release.yml` expects images already built/pulled; we provide `IMAGE_TAG`.
```bash
IMAGE_TAG=$IMAGE_TAG docker compose -f docker-compose.release.yml up -d
```
If images are missing you mistyped the tag.

### 8. Check Container Status
```bash
docker compose -f docker-compose.release.yml ps
```
Look for `healthy` (backend) and `exit 0` (migrate) once it finishes.

### 9. Inspect Migration Logs
```bash
docker compose -f docker-compose.release.yml logs --since=10m migrate
```
Expect successful Prisma output and container exit.

### 10. Backend Health
```bash
docker compose -f docker-compose.release.yml exec backend wget -qO- http://localhost:8080/health
```
Should return JSON with ok / uptime.

### 11. Frontend Health
```bash
curl http://localhost:8081/health
```
Expect `{"ok":true}`.

### 12. Tail Backend Logs (Live)
```bash
docker compose -f docker-compose.release.yml logs -f --tail=100 backend
```
Cancel with Ctrl+C.

### 13. Common Failure Spots
- Build fails: missing deps / TypeScript error → fix code then rebuild.
- Migrate fails: schema mismatch / existing constraint → adjust migration or DB state.
- Backend unhealthy: env variables missing (SMTP_* / DATABASE_URL) or DB not ready.
- Frontend 404 root: dist not generated; ensure `npm run build` works inside Docker context.

### 14. Rebuild After Code Change (Fast Loop)
If you edited backend only:
```bash
docker build -t ghcr.io/hankyungsung/kgolf-backend:$IMAGE_TAG ./backend
IMAGE_TAG=$IMAGE_TAG docker compose -f docker-compose.release.yml up -d backend
```
For frontend only swap names accordingly.

### 15. Tear Down (Keep Volume)
```bash
docker compose -f docker-compose.release.yml down
```
Postgres data persists in `pg_data` volume.

### 16. Full Cleanup (Removes DB Data — DANGEROUS)
Only for local throwaway tests, never in production:
```bash
docker compose -f docker-compose.release.yml down -v
docker volume ls | grep pg_data || true
```

### 17. Simulate Rollback Locally
Build a second tag, then switch tags:
```bash
export PREV_TAG=$IMAGE_TAG
export IMAGE_TAG=testrollback
docker build -t ghcr.io/hankyungsung/kgolf-backend:$IMAGE_TAG ./backend
IMAGE_TAG=$IMAGE_TAG docker compose -f docker-compose.release.yml up -d backend
# Roll back
IMAGE_TAG=$PREV_TAG docker compose -f docker-compose.release.yml up -d backend
```

### 18. Compare With CI
CI additionally: sets labels, uses buildx cache, pushes to GHCR, then SSH deploys and runs `pull` + `up -d`. Functional app behavior should match your local simulation results if the tag is identical.

---
Use this section whenever a CI run fails; locate the failing phase locally, fix, then push again.
