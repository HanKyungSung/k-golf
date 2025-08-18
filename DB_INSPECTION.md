# Backend Database Inspection & Management Guide

This guide captures the day-to-day steps for checking and inspecting the PostgreSQL database used by the backend.

## Quick Reference
| Task | Command |
|------|---------|
| List running compose services | `docker compose ps` |
| Open psql inside container | `docker compose exec db psql -U kgolf -d kgolf_app` |
| List tables | `\dt` |
| Describe a table | `\d "User"` |
| Run one-off SQL (host) | `docker compose exec db psql -U kgolf -d kgolf_app -c 'SELECT 1;'` |
| Exit psql | `\q` |
| Prisma migration status | `npx prisma migrate status` (in `backend/`) |
| Prisma studio (GUI) | `npx prisma studio` |

---
## 1. Ensure the Database Container Is Running
From repo root:
```zsh
docker compose ps
```
You should see the `db` service with `Up (healthy)`.
If it is not running:
```zsh
docker compose up -d db
```

## 2. Open an Interactive psql Session
```zsh
docker compose exec db psql -U kgolf -d kgolf_app
```
Prompt changes to:
```
kgolf_app=#
```
If you need to reconnect:
```
\c kgolf_app
```

## 3. List Databases (Optional)
Inside psql:
```
\l
```

## 4. List Tables
```
\dt
```
Tables (Prisma default naming) include:
- "User"
- "Room"
- "Booking"
- "AuthProvider"
- "VerificationToken"
- "Session"

## 5. Describe (Schema) of a Table
```
\d "Booking"
```
(Quotes are required for capitalized names.)

## 6. Run Basic Queries
Examples:
```
SELECT COUNT(*) FROM "Room";
SELECT id, email, role FROM "User" LIMIT 10;
SELECT id, "roomId", "startTime", players, status FROM "Booking" ORDER BY "startTime" DESC LIMIT 5;
```

## 7. One-Off SQL Without Entering psql
From repo root:
```zsh
docker compose exec db psql -U kgolf -d kgolf_app -c 'SELECT now();'
```

## 8. Exit psql
```
\q
```

## 9. Prisma Tooling
Run all Prisma commands inside `backend/` directory.

Migration status:
```zsh
cd backend
npx prisma migrate status
```
Apply (dev) migrations (already applied typically):
```zsh
npx prisma migrate dev
```
Open Prisma Studio (browser GUI):
```zsh
npx prisma studio
```

## 10. Seeding (Placeholder)
Once the seed script is implemented:
```zsh
npm run db:seed
```

## 11. Troubleshooting
| Issue | Cause | Fix |
|-------|-------|-----|
| Connection refused | Container down | `docker compose up -d db` |
| Auth failed | Wrong credentials | Check `docker-compose.yml` & `.env` | 
| No tables | Migration not applied | `cd backend && npx prisma migrate dev` |
| Stale schema | Forgot client generate | `npx prisma generate` |

## 12. (Planned) Overlap Constraint Enhancement
Current enforcement: unique (roomId, startTime). A future migration will add a proper exclusion constraint to prevent partial overlaps once a generated immutable `tsrange` column is introduced.

## 13. Host Direct Connection (Optional)
If you have `psql` installed locally:
```zsh
psql postgresql://kgolf:kgolf_password@localhost:5432/kgolf_app
```

---
*Keep this file updated as schema or workflows evolve.*
