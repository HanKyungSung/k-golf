# Konegolf Score Integration Plan

> **Last updated**: March 10, 2026
> **Script version**: `2026-03-08-v4-multiplayer`

---

## Table of Contents

- [Overview](#overview)
- [Current State](#current-state)
  - [What Works Today](#what-works-today)
  - [Bay PC Environment](#bay-pc-environment)
  - [POS Server Environment](#pos-server-environment-from-server_statusmd)
  - [Capture Script Files](#capture-script-files)
- [Part 1: Score Capture (✅ Done)](#part-1-score-capture--done)
  - [How It Works](#how-it-works)
  - [OCR Region Coordinates](#ocr-region-coordinates--of-19201080)
  - [Output Format](#output-format-resultsjson)
  - [Known Issues & Quirks](#known-issues--quirks)
- [Part 2: Score Collection (POS Integration)](#part-2-score-collection-pos-integration)
  - [Goal](#goal)
  - [Architecture](#architecture)
  - [Cross-Check: Confidence-Based Flagging](#cross-check-confidence-based-flagging)
  - [Screenshot Storage](#screenshot-storage)
  - [Database Schema](#database-schema)
  - [API Endpoints](#api-endpoints)
  - [Ingest Payload](#ingest-payload-multipartform-data)
  - [Booking Auto-Match Logic](#booking-auto-match-logic)
  - [capture.py Changes for POS Submission](#capturepy-changes-for-pos-submission)
  - [Infrastructure Changes](#infrastructure-changes)
  - [Implementation Steps](#implementation-steps)
- [Part 3: Customer Connection](#part-3-customer-connection)
  - [The Problem](#the-problem)
  - [Three Levels of Identification](#three-levels-of-identification)
    - [Level 1: Booking-Level Link](#level-1-booking-level-link-automatic)
    - [Level 2: Staff Assigns Players at Check-In](#level-2-staff-assigns-players-at-check-in-recommended)
    - [Level 3: Name Alias Auto-Matching](#level-3-name-alias-auto-matching-builds-over-time)
    - [Level 4: Konegolf Tag — Unique Player ID](#level-4-konegolf-tag--unique-player-id-recommended-long-term)
    - [QR Self-Check-In](#qr-self-check-in-enables-level-4)
    - [Customer Lifecycle with Tags](#customer-lifecycle-with-tags)
    - [Full Matching Pipeline](#full-matching-pipeline-all-levels-combined)
    - [Why Konegolf Tags Are Great for Business](#why-konegolf-tags-are-great-for-business)
  - [Database Schema (Part 3)](#database-schema-part-3-additions)
  - [API Endpoints (Part 3)](#api-endpoints-part-3)
  - [Implementation Steps](#implementation-steps-1)
- [Part 4: Auto-Deploy to Bay PCs](#part-4-auto-deploy-to-bay-pcs)
  - [Current Problem](#current-problem)
  - [Solution: GitHub Release + Self-Updater](#solution-github-release--self-updater)
  - [Process Watcher — Auto-Start When Simulator Launches](#process-watcher--auto-start-when-simulator-launches)
  - [Components](#components)
  - [Config Preservation Rules](#config-preservation-rules)
  - [Implementation Steps](#implementation-steps-2)
- [Part 5: Remote Monitoring](#part-5-remote-monitoring)
  - [The Problem](#the-problem-1)
  - [Solution: Heartbeat + Log Upload](#solution-heartbeat--log-upload)
  - [Heartbeat Payload](#heartbeat-payload)
  - [Bay Status Dashboard](#bay-status-dashboard)
  - [Database Schema (Part 5)](#database-schema-part-5)
  - [API Endpoints (Part 5)](#api-endpoints-part-5)
  - [capture.py Heartbeat Implementation](#capturepy-heartbeat-implementation)
  - [Implementation Steps](#implementation-steps-3)
- [Part 6: Bay Health Check](#part-6-bay-health-check)
  - [The Problem](#the-problem-2)
  - [Solution: Stuck Detection + Alerts](#solution-stuck-detection--alerts)
  - [How It Works](#how-it-works-1)
  - [Detection Algorithm](#detection-algorithm)
  - [Config Addition](#config-addition)
  - [Alert Flow](#alert-flow)
  - [Auto-Restart (Optional)](#auto-restart-optional-careful)
  - [Remote Restart via Dashboard](#remote-restart-via-dashboard)
  - [Smart Stuck Detection — Avoiding False Positives](#smart-stuck-detection--avoiding-false-positives)
  - [Dashboard: Bay Health View](#dashboard-bay-health-view)
  - [Implementation Steps](#implementation-steps-4)
- [End-to-End User Experience](#end-to-end-user-experience)
  - [User Roles](#user-roles)
  - [Complete Game Day Flow](#complete-game-day-flow)
  - [Dashboard Screens Summary](#dashboard-screens-summary)
  - [WebSocket Notifications](#websocket-notifications-optional)
- [Implementation Phases](#implementation-phases)
  - [Recommended Order](#recommended-order)
- [Files to Create / Modify](#files-to-create--modify)
  - [Phase A (Score Collection)](#phase-a-score-collection)
  - [Phase A2 (Remote Monitoring)](#phase-a2-remote-monitoring)
  - [Phase B (Customer Connection + Konegolf Tags)](#phase-b-customer-connection--konegolf-tags)
  - [Phase C (Auto-Deploy + Process Watcher)](#phase-c-auto-deploy--process-watcher)
  - [Phase C2 (Bay Health Check)](#phase-c2-bay-health-check)
  - [Phase D2 (QR Self-Check-In)](#phase-d2-qr-self-check-in)
- [Open Items](#open-items)

---

## Overview

Automatically capture golf scores from Konegolf simulator screens and wire them into the K-Golf POS system. The system has six parts:

| Part | Purpose | Status |
|------|---------|--------|
| **1. Score Capture** | OCR scores from bay PC screens | ✅ Working (v4) |
| **2. Score Collection** | Send scores + screenshots to POS server, admin dashboard | 📋 Planned |
| **3. Customer Connection** | Link OCR names to real customers (including Konegolf Tags) | 📋 Planned |
| **4. Auto-Deploy** | Self-updating capture script + process watcher on bay PCs | 📋 Planned |
| **5. Remote Monitoring** | Heartbeat, remote logs, bay status dashboard | 📋 Planned |
| **6. Bay Health Check** | Detect stuck simulators, auto-recovery, alerts | 📋 Planned |

---

## Current State

### What Works Today

- `capture.py` runs on bay PCs, captures screen via DXGI every 3 seconds
- Detects completed scorecards (2-stage: "SCORE CARD" text + STROKE/STABLEFORD buttons)
- Extracts player names, total scores, course name with **confidence scores**
- Saves screenshots + JSON results locally in `captures/` folder
- Multi-player extraction verified: matthew (98) + donnie (86) from Mauna Ocean C.C

### Bay PC Environment

| Spec | Value |
|------|-------|
| CPU | Intel i5 |
| GPU | NVIDIA RTX 3060 |
| RAM | 16 GB |
| OS | Windows (Python 3.14) |
| OCR | EasyOCR (CPU mode, ~3s per detection) |
| Screen | 1920×1080, fullscreen simulator |
| Network | Internet access, isolated from dev machine |
| Access | Remote desktop (AnyDesk/TeamViewer) |
| Bays | 4 total |

### POS Server Environment (from SERVER_STATUS.md)

| Resource | Value | Notes |
|----------|-------|-------|
| Hosting | DigitalOcean droplet | 147.182.215.135 |
| RAM | 969 MB + 1 GB swap | K-Golf backend uses 70 MB |
| Disk | 25 GB total, 3.5-10 GB free | ⚠️ Had 99% emergency before |
| Container | Single Docker (Express + React) | Port 8082 → 8080 |
| DB | PostgreSQL 16 (Docker) | 67 MB volume |
| Domain | konegolf.ca | SSL via Let's Encrypt |
| CI/CD | GitHub Actions → GHCR → Docker Compose | Auto-deploy on push to main |

### Capture Script Files

```
k-golf/screen_capture/
├── capture.py          # Main capture script (v4)
├── config.json         # Bay-specific settings
├── requirements.txt    # Python dependencies
├── setup.bat           # One-time Windows installer
├── run.bat             # Launch script
└── PLAN.md             # This file
```

---

## Part 1: Score Capture (✅ Done)

### How It Works

```
Every 3 seconds:
  ┌─ Grab frame via DXGI Desktop Duplication
  │
  ├─ Stage 1A: OCR small region for "SCORE CARD" text
  │  └─ Not found? → skip, wait 3s
  │
  ├─ Stage 1B: OCR bottom region for STROKE/STABLEFORD buttons
  │  └─ Not found? → game still in progress, skip
  │
  ├─ Stage 2: Full OCR extraction (only runs once per game)
  │  ├─ Name region → player names + confidence
  │  ├─ Score region → total scores + confidence
  │  └─ Course region → course name
  │
  ├─ Save screenshot (PNG) + results (JSON) locally
  ├─ POST to POS server (when configured)
  └─ 5-minute cooldown to prevent re-capture
```

### OCR Region Coordinates (% of 1920×1080)

| Region | x | y | w | h | Purpose |
|--------|---|---|---|---|---------|
| Scorecard detection | 0.28 | 0.12 | 0.44 | 0.16 | Find "SCORE CARD" text |
| Game completion | 0.55 | 0.70 | 0.30 | 0.10 | Find STROKE/STABLEFORD buttons |
| Player names | 0.18 | 0.40 | 0.10 | 0.10 | Extract player names |
| Total scores | 0.69 | 0.40 | 0.10 | 0.10 | Extract TOTAL column |
| Course name | 0.24 | 0.05 | 0.30 | 0.07 | Extract course name |

### Output Format (results.json)

```json
{
  "timestamp": "2026-03-08T07:14:02.536263",
  "course": "MAUNA OCEAN C.C",
  "players": [
    {
      "seat_index": 1,
      "name": "matthew",
      "total_score": 98,
      "name_confidence": 1.0,
      "score_confidence": 0.997
    },
    {
      "seat_index": 2,
      "name": "donnie",
      "total_score": 86,
      "name_confidence": 1.0,
      "score_confidence": 1.0
    }
  ],
  "bay_number": 1,
  "source_version": "2026-03-08-v4-multiplayer"
}
```

### Known Issues & Quirks

- EasyOCR runs in **CPU mode** (PyTorch CUDA not detected) — still adequate at ~3s
- The `pin_memory` warning is harmless
- Each bay PC needs **Visual C++ 2015-2022 Redistributable** (x64) for PyTorch
- First run on a new machine needs SSL workaround to download EasyOCR models
- Score parser filters standalone `72` lines (PAR row) to prevent misalignment

---

## Part 2: Score Collection (POS Integration)

### Goal

Send captured scores + screenshots from bay PCs to the POS server. Store in database. Show on admin dashboard with screenshot viewer and confidence-based flagging.

### Architecture

```
Bay PC 1 ──┐
Bay PC 2 ──┤  POST /api/scores/ingest
Bay PC 3 ──┤  (multipart: JSON + JPEG screenshot)
Bay PC 4 ──┘
               │
               ▼
         POS Backend (Express + multer)
               │
               ├─ Validate x-score-ingest-key header
               ├─ Save JPEG to /uploads/screenshots/{bay}/{date}/
               ├─ Map bayNumber → Room
               ├─ Auto-match to active Booking (room + time window)
               ├─ Save ScoreCapture + ScoreCapturePlayer rows
               ├─ Check confidence → ACTIVE or NEEDS_REVIEW
               └─ Auto-cleanup: delete screenshots > 90 days
               
               ▼
         Admin Dashboard (/admin/score-review)
               │
               ├─ List recent scores — ✅ ACTIVE vs ⚠️ NEEDS_REVIEW
               ├─ Screenshot side-by-side with OCR values
               ├─ Edit OCR values, mark reviewed
               └─ Delete bad captures
```

### Cross-Check: Confidence-Based Flagging

No OCR on the server (only 1 GB RAM — EasyOCR would crash). Bay PC reports confidence scores.

```
Confidence ≥ 0.7 for ALL fields → status = "ACTIVE" ✅
Confidence < 0.7 for ANY field  → status = "NEEDS_REVIEW" ⚠️

Expected: ~80-90% auto-accepted, ~10-20% flagged for staff review
```

### Screenshot Storage

| Metric | Value |
|--------|-------|
| Format | JPEG (quality 70, compressed on bay PC) |
| Size per screenshot | ~100-150 KB |
| Daily volume | ~1-3 MB |
| Yearly volume | ~400 MB - 1 GB |
| Server disk free | 3.5-10 GB |
| Retention | 90 days (auto-cleanup) |
| Storage location | Docker volume `/uploads/screenshots/` |

### Database Schema

```prisma
// Add to existing Room model
model Room {
  // ... existing fields ...
  bayNumber       Int?      @unique
  scoreCaptures   ScoreCapture[]
}

model ScoreCapture {
  id              String    @id @default(uuid())
  bayNumber       Int
  room            Room?     @relation(fields: [roomId], references: [id])
  roomId          String?
  booking         Booking?  @relation(fields: [bookingId], references: [id])
  bookingId       String?
  status          String    @default("ACTIVE")  // ACTIVE | NEEDS_REVIEW | DELETED
  courseName      String?
  screenshotPath  String?   // "screenshots/1/2026-03-07/143022.jpg"
  sourceVersion   String?
  rawPayload      Json?     // Full OCR output for audit
  capturedAt      DateTime  @db.Timestamptz
  createdAt       DateTime  @default(now()) @db.Timestamptz
  updatedAt       DateTime  @updatedAt @db.Timestamptz
  players         ScoreCapturePlayer[]

  @@index([bayNumber, capturedAt])
  @@index([status])
  @@index([bookingId])
}

model ScoreCapturePlayer {
  id              String    @id @default(uuid())
  capture         ScoreCapture @relation(fields: [captureId], references: [id], onDelete: Cascade)
  captureId       String
  seatIndex       Int?
  ocrName         String
  ocrTotalScore   Int
  ocrOverPar      Int?
  nameConfidence  Float?    // 0.0-1.0
  scoreConfidence Float?    // 0.0-1.0
  user            User?     @relation(fields: [userId], references: [id])
  userId          String?   // Linked customer (Part 3)
  createdAt       DateTime  @default(now()) @db.Timestamptz
  updatedAt       DateTime  @updatedAt @db.Timestamptz

  @@index([captureId])
  @@index([userId])
}
```

### API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/scores/ingest` | `x-score-ingest-key` | Bay PC sends OCR + screenshot |
| `GET` | `/api/scores` | Staff/Admin | List scores (paginated, filterable) |
| `GET` | `/api/scores/:id` | Staff/Admin | Score detail with players |
| `GET` | `/api/scores/:id/screenshot` | Staff/Admin | Serve screenshot image |
| `PATCH` | `/api/scores/:id` | Staff/Admin | Edit OCR values, mark reviewed |
| `DELETE` | `/api/scores/:id` | Staff/Admin | Soft-delete (status → DELETED) |

### Ingest Payload (multipart/form-data)

**`data` field** (JSON string):
```json
{
  "bay_number": 1,
  "timestamp": "2026-03-08T07:14:02.000Z",
  "source_version": "2026-03-08-v4-multiplayer",
  "course": "MAUNA OCEAN C.C",
  "players": [
    { "seat_index": 1, "name": "matthew", "total_score": 98, "over_par": 26, "name_confidence": 1.0, "score_confidence": 0.997 },
    { "seat_index": 2, "name": "donnie", "total_score": 86, "over_par": 14, "name_confidence": 1.0, "score_confidence": 1.0 }
  ]
}
```

**`screenshot` field**: JPEG file (~100-150 KB)

### Booking Auto-Match Logic

When a score comes in:
1. Look up `Room` where `bayNumber = payload.bay_number`
2. Find `Booking` where `roomId = room.id` AND `startTime ≤ capturedAt ≤ endTime`
3. Exactly 1 match → auto-link. 0 or 2+ → leave unlinked (staff fixes later).

### capture.py Changes for POS Submission

Already built into v4 — `submit_to_pos()` compresses PNG→JPEG and sends multipart POST. Activated by setting `pos_server_url` and `ingest_secret` in `config.json`:

```json
{
  "bay_number": 1,
  "pos_server_url": "https://konegolf.ca/api/scores/ingest",
  "ingest_secret": "your-secret-here"
}
```

### Infrastructure Changes

| Change | Where | What |
|--------|-------|------|
| Install multer | `backend/package.json` | `npm install multer @types/multer` |
| Docker volume | `docker-compose.release.yml` | Mount `/uploads` for persistent screenshots |
| New route | `backend/src/routes/scores.ts` | Ingest + CRUD + screenshot serve |
| Wire route | `backend/src/server.ts` | `app.use('/api/scores', scoresRouter)` |
| Env var | `backend/.env` | `SCORE_INGEST_KEY=...` |
| Schema | `backend/prisma/schema.prisma` | Add models + Room.bayNumber |
| Migration | Prisma migrate | New tables |
| Frontend route | `frontend/src/App.tsx` | `/admin/score-review` |
| Dashboard page | `frontend/src/pages/admin/score-review.tsx` | New page |

### Implementation Steps

1. Add Prisma models + Room.bayNumber + run migration
2. Install multer + @types/multer
3. Create `backend/src/routes/scores.ts` (ingest, list, detail, edit, delete, screenshot)
4. Wire route in server.ts + add SCORE_INGEST_KEY to .env
5. Add /uploads volume to docker-compose.release.yml
6. Add screenshot auto-cleanup (delete > 90 days)
7. Update config.json on bay PCs with POS URL + secret
8. Build admin score dashboard page with screenshot viewer
9. Add booking auto-match logic
10. Test end-to-end: bay PC → POS → dashboard → view screenshot

---

## Part 3: Customer Connection

### The Problem

The scorecard gives OCR names like `"matthew"`, `"donnie"`. The POS knows **who booked** (1 person) but not **who the other players are**.

```
POS knows:                    Scorecard gives:
├─ Booking for Room 3         ├─ matthew: 98
├─ Booker: Matt Johnson       ├─ donnie: 86
├─ Phone: 555-1234
├─ Players: 2 (count only)
├─ Seat 1: (unknown)
└─ Seat 2: (unknown)
```

### Three Levels of Identification

#### Level 1: Booking-Level Link (automatic)

Comes free from Part 2. The capture is auto-matched to a booking via bay → room → time window. You know "this group scored 98 and 86" but not which individual.

- **Effort**: Zero
- **Value**: Group-level score history
- **Limitation**: No per-player stats

#### Level 2: Staff Assigns Players at Check-In (recommended)

When customers arrive, staff enters player names per seat in the POS:

```
Booking for Room 3 (2 players):
  Seat 1: Matt Johnson (booker — already known)
  Seat 2: [Staff types "Don Park" or searches by phone]
```

After the game, system can match: `matthew → Seat 1 → Matt Johnson`, `donnie → Seat 2 → Don Park`.

- **Effort**: ~30 seconds per booking at check-in
- **Value**: Exact per-player tracking from day one

#### Level 3: Name Alias Auto-Matching (builds over time)

Store mapping: OCR name → customer. Once staff maps `"matthew"` → Matt Johnson, future games auto-suggest.

```
PlayerAlias table:
  "matthew" → Matt Johnson (confirmed 5 times)
  "donnie"  → Don Park (confirmed 3 times)
```

- **Effort**: First link manual, then automatic
- **Value**: Returning players auto-identified

#### Level 4: Konegolf Tag — Unique Player ID (recommended long-term)

Each customer gets a unique, OCR-friendly tag like `MATT12`. They type it into the simulator as their player name. OCR reads it → **deterministic match** — no guessing, no staff work.

```
Tag format:   [NAME PREFIX][2-digit number]
Examples:     MATT12, DONNIE7, JPARK03, 민수42
Length:       4–10 characters (fits simulator name field)
Charset:      A-Z, 0-9, Korean Hangul (OCR-friendly, no special chars)
```

**Why no dashes or special chars:** Our parser already strips them (`re.sub(r'[^0-9A-Za-z가-힣]+', '', raw)`), and clean alphanumeric strings have near-perfect OCR confidence.

**Tag generation logic:**
```
Input:  "Matthew Kim"
Step 1: Take first name → "MATTHEW"
Step 2: Truncate to 6 chars → "MATT"
Step 3: Append unique suffix → "MATT12"
Step 4: Check uniqueness → if taken, try MATT13, MATT14...
Or: let the customer pick their own tag (subject to uniqueness)
```

#### QR Self-Check-In (enables Level 4)

Each bay gets a **static QR code** (printed sticker or small screen):
```
QR Code → https://konegolf.ca/checkin?bay=3
```

**Customer flow on phone:**
```
┌─────────────────────────┐
│  🏌️ Konegolf Check-In   │
│  Bay 3 · Room 3         │
│                         │
│  Enter your phone:      │
│  ┌───────────────────┐  │
│  │ 555-1234          │  │
│  └───────────────────┘  │
│                         │
│  [Check In →]           │
└─────────────────────────┘
        ↓ (phone found)
┌─────────────────────────┐
│  Welcome, Matt Johnson! │
│                         │
│  Pick your seat:        │
│  ┌─────┐ ┌─────┐       │
│  │ S1 ✓│ │ S2  │       │
│  └─────┘ └─────┘       │
│  ┌─────┐ ┌─────┐       │
│  │ S3  │ │ S4  │       │
│  └─────┘ └─────┘       │
│                         │
│  Your Konegolf Tag:     │
│  ┌───────────────────┐  │
│  │     MATT12        │  │
│  └───────────────────┘  │
│  Enter this as your     │
│  player name ☝️          │
└─────────────────────────┘
```

No account needed — phone lookup is enough (POS already indexes `customerPhone`).

#### Customer Lifecycle with Tags

```
FIRST VISIT (walk-in, no tag):
  Staff books → Customer plays as "matthew" → OCR captures
  → Score saved, UNMATCHED
  → Staff links manually in dashboard → system creates alias
  → Staff asks "Want a Konegolf Tag?" → creates MATT12
  → Customer gets a little card or text with their tag

FIRST VISIT (with QR check-in):
  Customer scans QR → enters phone → system auto-generates tag
  → "Your tag is MATT12, enter this in the game!"
  → Plays as "MATT12" → OCR → instant match ✅

RETURN VISIT (has tag):
  Customer types "MATT12" → OCR → instant match ✅
  No staff, no QR, nothing. Just works.

RETURN VISIT (forgot tag, types "matthew"):
  OCR reads "matthew" → no tag match
  → alias match from last time → still matched ✅
```

#### Full Matching Pipeline (all levels combined)

When OCR extracts a name, the system tries each level in order:

```
OCR extracts: "MATT12"
        │
        ▼
   ┌─────────────┐     ┌──── EXACT MATCH ──── Matt Johnson ✅
   │ Tag Lookup   │────►│    (deterministic, confidence = 1.0)
   │ (PlayerTag)  │     └─────────────────────────────────────
   └──────┬──────┘
          │ no match
          ▼
   ┌─────────────┐     ┌──── ALIAS MATCH ──── Matt Johnson ✅
   │ Alias Lookup │────►│    ("matthew" seen before from Matt)
   │ (PlayerAlias)│     └─────────────────────────────────────
   └──────┬──────┘
          │ no match
          ▼
   ┌─────────────┐     ┌──── SEAT MATCH ───── Matt Johnson ⚠️
   │ Seat Lookup  │────►│    (Seat 1 assigned at check-in)
   │ (SeatPlayer) │     └─────────────────────────────────────
   └──────┬──────┘
          │ no match
          ▼
   ┌─────────────┐     ┌──── BOOKING MATCH ─── Group of 2 ⚠️
   │ Booking Link │────►│    (know the group, not individual)
   │ (time+bay)   │     └─────────────────────────────────────
   └──────┬──────┘
          │ no booking
          ▼
      UNMATCHED 🔴
      (staff reviews later)
```

#### Why Konegolf Tags Are Great for Business

1. **Loyalty tool** — "Get your Konegolf Tag to track your scores!" drives repeat visits
2. **Social** — leaderboards with tags, customers comparing scores
3. **Zero friction for regulars** — just type their tag, everything auto-connects
4. **Graceful degradation** — no tag? Aliases and booking match still work
5. **OCR-proof** — short uppercase alphanumeric strings have near-perfect OCR accuracy

### Database Schema (Part 3 additions)

```prisma
// Level 2: Per-seat player assignment at check-in
model SeatPlayer {
  id          String   @id @default(uuid())
  booking     Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  bookingId   String
  seatIndex   Int      // 1-4
  playerName  String   // Name entered by staff
  user        User?    @relation(fields: [userId], references: [id])
  userId      String?  // Linked to registered customer
  createdAt   DateTime @default(now()) @db.Timestamptz
  updatedAt   DateTime @updatedAt @db.Timestamptz

  @@unique([bookingId, seatIndex])
}

// Level 3: OCR name → customer alias
model PlayerAlias {
  id          String   @id @default(uuid())
  ocrName     String   // Simulator name: "matthew"
  user        User     @relation(fields: [userId], references: [id])
  userId      String
  matchCount  Int      @default(1)
  createdAt   DateTime @default(now()) @db.Timestamptz
  updatedAt   DateTime @updatedAt @db.Timestamptz

  @@unique([ocrName, userId])
  @@index([ocrName])
}

// Level 4: Unique Konegolf Tag for deterministic OCR matching
model PlayerTag {
  id        String   @id @default(uuid())
  tag       String   @unique          // "MATT12" — unique, OCR-friendly
  userId    String?                   // linked registered customer (optional)
  user      User?    @relation(fields: [userId], references: [id])
  name      String                   // display name: "Matthew Kim"
  phone     String?                  // for guest tag holders (no account)
  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt @db.Timestamptz

  @@index([tag])
  @@index([phone])
}
```

### API Endpoints (Part 3)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/bookings/:id/seats` | Staff/Admin | Get seat players for a booking |
| `PUT` | `/api/bookings/:id/seats/:seatIndex` | Staff/Admin | Assign player to a seat |
| `PATCH` | `/api/scores/:id/players/:playerId/link` | Staff/Admin | Link OCR player to customer |
| `GET` | `/api/scores/aliases` | Staff/Admin | List known name mappings |
| `POST` | `/api/scores/aliases` | Staff/Admin | Create/confirm an alias |
| `POST` | `/api/tags` | Staff/Admin | Create a Konegolf Tag for a customer |
| `GET` | `/api/tags/:tag` | Public | Look up tag (for check-in page) |
| `GET` | `/api/tags/user/:userId` | Staff/Admin | Get tag for a customer |
| `POST` | `/api/checkin` | Public | QR check-in: phone → seat → show tag |

### Implementation Steps

1. Add SeatPlayer + PlayerAlias + PlayerTag models + migration
2. Build seat assignment API (GET/PUT /api/bookings/:id/seats)
3. Add "Assign Players" UI to booking detail page
4. Build player linking API (PATCH /api/scores/:id/players/:playerId/link)
5. Add "Link to Customer" UI on score dashboard
6. Add auto-suggestion using PlayerAlias + SeatPlayer data
7. Build Konegolf Tag API (create, lookup)
8. Build tag generation logic (name prefix + unique suffix)
9. Build QR check-in mobile page (`/checkin?bay=N`)
10. Print QR code stickers for each bay
11. Add tag-based matching to ingest pipeline (highest priority lookup)
12. Build customer score history page (`/admin/customers/:id/scores`)

---

## Part 4: Auto-Deploy to Bay PCs

### Current Problem

Updating capture.py on 4 bay PCs requires:
1. Build zip on dev machine
2. Remote desktop (AnyDesk) into each bay PC
3. Copy zip, extract, overwrite files
4. Restart the script

Slow and error-prone with 4 machines.

### Solution: GitHub Release + Self-Updater

```
Developer:
  Push code → tag as screen-capture-vX → GitHub Actions builds release zip

Bay PC (on startup):
  updater.py checks GitHub API for latest release
    ├─ Same version? → skip, start capture.py
    └─ Newer version? → download zip, extract, preserve config.json, restart
```

### Process Watcher — Auto-Start When Simulator Launches

Instead of running the capture script manually, it watches for the simulator's `.exe` and starts/stops automatically:

```
capture.py starts (via Task Scheduler on Windows login)
    │
    ▼
┌──────────────────────────┐
│ 💤 Waiting for            │  ← polls every 5s: "is GolfzonGame.exe running?"
│ GolfzonGame.exe...        │     (sends heartbeats even while waiting)
└──────────┬───────────────┘
           │ process found
           ▼
┌──────────────────────────┐
│ 🟢 Capture loop running   │  ← normal DXGI + OCR detection
│ Watching screen...        │
└──────────┬───────────────┘
           │ process exits
           ▼
┌──────────────────────────┐
│ 🔄 Game closed.           │  ← go back to waiting (configurable)
│ Waiting for restart...    │     or exit script entirely
└──────────────────────────┘
```

**Config addition:**
```json
{
  "watch_process": "GolfzonGame.exe",
  "watch_poll_seconds": 5,
  "exit_on_process_close": false
}
```

| Setting | Default | Meaning |
|---------|---------|---------|
| `watch_process` | `""` (empty) | Empty = start immediately (current behavior). Set to simulator `.exe` name to enable watching |
| `watch_poll_seconds` | `5` | How often to check if simulator is running |
| `exit_on_process_close` | `false` | `false` = loop back and wait for next launch. `true` = exit when game closes |

**Implementation — no extra libraries needed:**
```python
import subprocess

def is_process_running(name):
    result = subprocess.run(
        ['tasklist', '/fi', f'imagename eq {name}', '/nh'],
        capture_output=True, text=True
    )
    return name.lower() in result.stdout.lower()
```

> ⚠️ **TODO**: Need exact `.exe` name of the golf simulator. Run this on a bay PC while the simulator is open:
> ```powershell
> Get-Process | Where-Object {$_.MainWindowTitle -ne ""} | Select-Object ProcessName, MainWindowTitle
> ```

### Components

**`updater.py`** — Runs before capture.py. Checks GitHub releases API:

```python
GITHUB_REPO = "hankyungsung/k-golf"
RELEASE_URL = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"
LOCAL_VERSION_FILE = "version.txt"

def check_for_update():
    local = read(LOCAL_VERSION_FILE)
    remote = requests.get(RELEASE_URL).json()["tag_name"]
    if remote != local:
        zip_url = remote["assets"][0]["browser_download_url"]
        download_and_extract(zip_url)  # Overwrites all except config.json
        write(LOCAL_VERSION_FILE, remote)
        return True
    return False
```

**`version.txt`** — Tracks current version on the bay PC.

**`config.example.json`** — Template. `config.json` is never overwritten (bay-specific).

**`run.bat`** (updated) — Calls updater first, then capture:
```batch
python updater.py
python capture.py
```

**GitHub Actions** (`.github/workflows/screen-capture-release.yml`):
```yaml
on:
  push:
    tags: ['screen-capture-v*']
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd screen_capture && zip -r ../screen_capture.zip capture.py updater.py requirements.txt setup.bat run.bat config.example.json
      - uses: softprops/action-gh-release@v1
        with:
          files: screen_capture.zip
```

**`install-service.bat`** — One-time setup per bay PC. Registers Task Scheduler to auto-start on login:
```batch
schtasks /create /tn "KonegolfScoreCapture" /tr "C:\konegolf\run.bat" /sc onlogon /rl highest /f
```

### Config Preservation Rules

| File | On update |
|------|-----------|
| `capture.py` | ✅ Overwritten |
| `updater.py` | ✅ Overwritten |
| `requirements.txt` | ✅ Overwritten |
| `setup.bat` | ✅ Overwritten |
| `run.bat` | ✅ Overwritten |
| `config.json` | ❌ Never overwritten |
| `config.example.json` | ✅ Overwritten (reference only) |
| `version.txt` | ✅ Updated to new version |

### Implementation Steps

1. Create `updater.py` with GitHub release check + download + extract
2. Create `version.txt` with current version
3. Create `config.example.json` as template
4. Update `run.bat` to call updater first
5. Create GitHub Actions workflow for release builds
6. Create `install-service.bat` for Task Scheduler
7. One-time setup on each bay PC
8. Future updates: `git tag screen-capture-vX && git push --tags`

---

## Part 5: Remote Monitoring

### The Problem

Currently, checking what's happening on a bay PC requires:
1. Open AnyDesk → remote desktop into the bay PC
2. Check the console window or open `score_capture.log`
3. Navigate to `captures/` folder to see screenshots

With 4 bay PCs this is painful — especially when troubleshooting issues like Room 1's Stage 1B detection failure.

### Solution: Heartbeat + Log Upload

Each bay PC periodically sends a heartbeat to the POS server with its status and recent log lines.

```
Bay PC                               POS Server
┌────────┐    every 60s              ┌───────────┐
│ Bay 1  │──── POST /api/bays/hb ──►│           │
│ Bay 2  │──── POST /api/bays/hb ──►│  Bay      │
│ Bay 3  │──── POST /api/bays/hb ──►│  Status   │
│ Bay 4  │──── POST /api/bays/hb ──►│  Table    │
└────────┘                           └─────┬─────┘
                                           │
                                     ┌─────▼──────┐
                                     │ Admin       │
                                     │ Dashboard   │
                                     │ /admin/bays │
                                     └─────────────┘
```

### Heartbeat Payload

```
POST /api/bays/heartbeat
x-score-ingest-key: <secret>

{
  "bay_number": 1,
  "version": "2026-03-08-v4-multiplayer",
  "status": "watching",
  "uptime_seconds": 3600,
  "last_capture_at": "2026-03-10T08:14:02.000Z",
  "captures_today": 5,
  "errors_today": 0,
  "simulator_running": true,
  "cpu_percent": 12.5,
  "memory_mb": 450,
  "disk_free_gb": 85.2,
  "recent_logs": [
    "2026-03-10 08:12:01 INFO Frame #1440 — scorecard visible: False",
    "2026-03-10 08:14:02 INFO COMPLETED SCORECARD DETECTED!",
    "2026-03-10 08:14:03 INFO Player: MATT12 (conf=1.0) | Score: 92 (conf=0.99)",
    "..."
  ]
}
```

| Field | Source | Purpose |
|-------|--------|---------|
| `status` | Script state | `starting` / `waiting` (for simulator) / `watching` / `cooldown` / `error` |
| `uptime_seconds` | `time.time() - start_time` | How long the script has been running |
| `last_capture_at` | Last successful detection | Quick check: is it actually capturing? |
| `captures_today` | Counter, resets at midnight | Daily activity overview |
| `errors_today` | Counter, resets at midnight | Spot problems early |
| `simulator_running` | `is_process_running()` | Is the golf game active? |
| `cpu_percent` / `memory_mb` | `psutil` (optional) | Machine health baseline |
| `disk_free_gb` | `shutil.disk_usage()` | Alert before captures fill disk |
| `recent_logs` | Last 50 lines of log file | Remote debugging without RDP |

### Bay Status Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│  🏌️ Bay Status                                          [Auto-refresh] │
├──────┬──────────┬──────────┬──────────┬────────┬────────┬──────────┤
│ Bay  │ Status   │ Last Seen│ Simulator│ Today  │ Errors │ Version  │
├──────┼──────────┼──────────┼──────────┼────────┼────────┼──────────┤
│ 1    │ 🟢 Active │ 12s ago  │ ✅ Running│ 5 caps │ 0      │ v4       │
│ 2    │ 🟢 Active │ 8s ago   │ ✅ Running│ 3 caps │ 0      │ v4       │
│ 3    │ 🔴 Offline│ 2h ago   │ ❓ Unknown│ 0 caps │ 1      │ v4       │
│ 4    │ 🟡 Waiting│ 5s ago   │ ❌ Stopped│ 7 caps │ 0      │ v4       │
└──────┴──────────┴──────────┴──────────┴────────┴────────┴──────────┘

  Bay 3: Last error — "DXGI camera lost, retrying..."       [View Logs]
```

**Status logic:**
- 🟢 Active — heartbeat received within 2 minutes, status = `watching` or `cooldown`
- 🟡 Waiting — heartbeat received, status = `waiting` (simulator not started)
- 🔴 Offline — no heartbeat for 2+ minutes
- 🔴 Error — heartbeat received but status = `error`

**Log viewer (expandable per bay):**
```
┌─────────────────────────────────────────────────────┐
│  📋 Bay 1 Logs (last 50 lines)             [Close] │
├─────────────────────────────────────────────────────┤
│ 08:14:03 INFO  Player: MATT12 | Score: 92           │
│ 08:14:02 INFO  COMPLETED SCORECARD DETECTED!         │
│ 08:14:02 INFO  ====================================  │
│ 08:12:01 DEBUG Frame #1440 — scorecard visible: Fals │
│ 08:09:01 DEBUG Frame #1416 — scorecard visible: Fals │
│ ...                                                   │
└─────────────────────────────────────────────────────┘
```

### Database Schema (Part 5)

```prisma
model BayHeartbeat {
  id              String   @id @default(uuid())
  bayNumber       Int
  version         String
  status          String   // starting | waiting | watching | cooldown | error
  uptimeSeconds   Int
  lastCaptureAt   DateTime? @db.Timestamptz
  capturesToday   Int      @default(0)
  errorsToday     Int      @default(0)
  simulatorRunning Boolean @default(false)
  cpuPercent      Float?
  memoryMb        Float?
  diskFreeGb      Float?
  recentLogs      String?  // JSON array of last 50 log lines
  receivedAt      DateTime @default(now()) @db.Timestamptz

  @@index([bayNumber, receivedAt])
}
```

> **Note**: We only keep the latest heartbeat per bay for the dashboard. Old heartbeats can be pruned (keep 24h for trend charts, then delete).

### API Endpoints (Part 5)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/bays/heartbeat` | `x-score-ingest-key` | Bay PC sends status |
| `GET` | `/api/bays` | Staff/Admin | List all bays with latest heartbeat |
| `GET` | `/api/bays/:bayNumber/logs` | Staff/Admin | Get recent logs for a bay |
| `GET` | `/api/bays/:bayNumber/history` | Staff/Admin | Heartbeat history (trend chart) |

### capture.py Heartbeat Implementation

Runs in a **background thread** so it doesn't block the capture loop:

```python
import threading

def heartbeat_loop(cfg, log, state):
    """Send heartbeat every 60s. Runs in background thread."""
    url = cfg.get("pos_server_url", "").replace("/ingest", "").rstrip("/")
    if not url:
        return
    hb_url = url.rsplit("/scores", 1)[0] + "/bays/heartbeat"

    while state["running"]:
        try:
            payload = {
                "bay_number": cfg["bay_number"],
                "version": SCRIPT_VERSION,
                "status": state["status"],
                "uptime_seconds": int(time.time() - state["start_time"]),
                "last_capture_at": state.get("last_capture_at"),
                "captures_today": state["captures_today"],
                "errors_today": state["errors_today"],
                "simulator_running": state.get("simulator_running", False),
                "recent_logs": read_recent_logs(cfg["log_file"], 50),
            }
            requests.post(hb_url, json=payload, headers={
                "x-score-ingest-key": cfg.get("ingest_secret", "")
            }, timeout=10)
        except Exception:
            pass  # heartbeat failure is non-fatal
        time.sleep(60)

# Start in main():
state = {"running": True, "status": "starting", "start_time": time.time(), ...}
hb_thread = threading.Thread(target=heartbeat_loop, args=(cfg, log, state), daemon=True)
hb_thread.start()
```

### Implementation Steps

1. Add heartbeat sending to capture.py (background thread)
2. Add `read_recent_logs()` helper (tail last 50 lines)
3. Track state dict: status, captures_today, errors_today, last_capture_at
4. Add BayHeartbeat Prisma model + migration
5. Create `POST /api/bays/heartbeat` endpoint
6. Create `GET /api/bays` endpoint (latest heartbeat per bay)
7. Build bay status dashboard page (`/admin/bays`)
8. Add auto-refresh (poll every 30s or WebSocket push)
9. Add heartbeat pruning (keep 24h, delete older)

---

## Part 6: Bay Health Check

### The Problem

The golf simulator software frequently **gets stuck on the loading screen**. When this happens:
- Customers can't play → bad experience
- Staff doesn't notice until a customer complains
- No way to monitor 4 bays simultaneously from the front desk
- Currently requires physically walking to the bay or RDP to check

### Solution: Stuck Detection + Alerts

The capture script is already watching the screen. We can detect "stuck" by comparing consecutive frames — if nothing changes for several minutes while the simulator is supposed to be running, something is wrong.

### How It Works

```
Normal gameplay:
  Frame 1 → Frame 2 → Frame 3    (pixels change constantly)
  Δ = HIGH   Δ = HIGH   Δ = HIGH

Loading screen (progressing):
  Frame 1 → Frame 2 → Frame 3    (loading bar moves, animations play)
  Δ = LOW-MED  Δ = LOW-MED

STUCK loading screen:
  Frame 1 → Frame 2 → Frame 3    (identical frames for minutes)
  Δ = ~ZERO   Δ = ~ZERO   Δ = ~ZERO
  ↑
  After 3+ minutes → ALERT 🚨
```

### Detection Algorithm

```python
import numpy as np

def calculate_frame_diff(frame_a, frame_b):
    """Compare two frames. Returns 0.0 (identical) to 1.0 (completely different)."""
    if frame_a is None or frame_b is None:
        return 1.0
    # Downsample for speed (compare every 10th pixel)
    a = frame_a[::10, ::10].astype(np.float32)
    b = frame_b[::10, ::10].astype(np.float32)
    diff = np.mean(np.abs(a - b)) / 255.0
    return diff

# In capture loop:
STUCK_THRESHOLD = 0.005      # < 0.5% pixel change = effectively frozen
STUCK_MINUTES = 3            # alert after 3 minutes of no change
stuck_since = None
prev_frame = None

frame = camera.grab()
diff = calculate_frame_diff(frame, prev_frame)
prev_frame = frame

if diff < STUCK_THRESHOLD:
    if stuck_since is None:
        stuck_since = time.time()
    elif time.time() - stuck_since > STUCK_MINUTES * 60:
        # STUCK DETECTED!
        state["status"] = "stuck"
        state["stuck_since"] = stuck_since
        log.warning(f"BAY STUCK for {int(time.time()-stuck_since)}s — screen frozen!")
        # Alert via next heartbeat (status = "stuck")
else:
    stuck_since = None  # screen is changing, not stuck
```

**Key insight:** We already grab frames every 3 seconds for OCR — the `calculate_frame_diff()` adds near-zero overhead (just a numpy comparison on downsampled pixels).

### Config Addition

```json
{
  "health_check_enabled": true,
  "stuck_threshold": 0.005,
  "stuck_alert_minutes": 3,
  "stuck_auto_restart": false,
  "simulator_exe_path": "C:\\GolfzonGame\\game.exe"
}
```

| Setting | Default | Purpose |
|---------|---------|---------|
| `health_check_enabled` | `true` | Enable frame-diff stuck detection |
| `stuck_threshold` | `0.005` | Pixel change below this = frozen (0.0–1.0 scale) |
| `stuck_alert_minutes` | `3` | Alert after this many minutes of frozen screen |
| `stuck_auto_restart` | `false` | If true, auto-restart the simulator (see below) |
| `simulator_exe_path` | `""` | Full path to simulator .exe (needed for auto-restart) |

### Alert Flow

```
Screen frozen > 3 min
        │
        ▼
   state["status"] = "stuck"
        │
        ├──► Heartbeat sends status = "stuck"
        │         │
        │         ▼
        │    ┌──────────────────────────────────┐
        │    │ POS Dashboard                     │
        │    │                                   │
        │    │ Bay 3: 🔴 STUCK (5 min)          │
        │    │ Screen frozen since 2:15 PM       │
        │    │                                   │
        │    │ [🔄 Remote Restart] [📋 View Log] │
        │    └──────────────────────────────────┘
        │
        └──► (optional) Auto-restart simulator
                    │
                    ▼
              taskkill /f /im GolfzonGame.exe
              wait 5 seconds
              start "" "C:\GolfzonGame\game.exe"
              log.info("Auto-restarted simulator")
```

### Auto-Restart (Optional, careful)

If `stuck_auto_restart: true`, the script can kill and restart the simulator:

```python
def restart_simulator(cfg, log):
    exe_name = cfg.get("watch_process", "")
    exe_path = cfg.get("simulator_exe_path", "")
    if not exe_name or not exe_path:
        log.warning("Cannot auto-restart: watch_process or simulator_exe_path not configured")
        return False

    log.warning(f"Auto-restarting simulator: killing {exe_name}...")
    subprocess.run(['taskkill', '/f', '/im', exe_name], capture_output=True)
    time.sleep(5)

    log.info(f"Starting simulator: {exe_path}")
    subprocess.Popen([exe_path], shell=True)
    return True
```

> ⚠️ **Recommend starting with `stuck_auto_restart: false`** (alert only). Monitor false positives first. Enable auto-restart once confident the stuck detection is accurate. Some screens (e.g., course selection) might be static for a while without being stuck.

### Remote Restart via Dashboard

Even without auto-restart, staff can trigger a restart from the POS dashboard:

```
POST /api/bays/:bayNumber/restart
x-score-ingest-key: <secret>
```

The bay PC checks for restart commands on each heartbeat response:

```python
# In heartbeat_loop:
resp = requests.post(hb_url, json=payload, headers=headers, timeout=10)
commands = resp.json().get("commands", [])
for cmd in commands:
    if cmd == "restart_simulator":
        restart_simulator(cfg, log)
    elif cmd == "restart_capture":
        os.execv(sys.executable, [sys.executable] + sys.argv)
```

This gives staff remote control without RDP access.

### Smart Stuck Detection — Avoiding False Positives

Some screens are legitimately static (course selection, name entry). To reduce false alerts:

```
┌────────────────────────────────────────────────┐
│           Stuck Detection State Machine         │
├────────────────────────────────────────────────┤
│                                                 │
│  NORMAL ──── diff < threshold ───► SUSPICIOUS   │
│    ▲                                    │       │
│    │                              wait 3 min    │
│    │                                    │       │
│    │         diff > threshold           ▼       │
│    ├─────────────────────────── CONFIRMED_STUCK │
│    │                                    │       │
│    │                              send alert    │
│    │                              (once only)   │
│    │                                    │       │
│    │         diff > threshold           ▼       │
│    └─────────────────────────── ALERTED         │
│             (screen unfreezes)    (no re-alert  │
│                                   for 10 min)   │
└────────────────────────────────────────────────┘
```

**Additional heuristics:**
- Only flag as stuck if `simulator_running = true` (don't alert for idle PC)
- Reset stuck timer when scorecard is detected (game is progressing)
- Cooldown after alert: don't re-alert for the same stuck episode

### Dashboard: Bay Health View

```
┌─────────────────────────────────────────────────────────────────────┐
│  🏥 Bay Health                                       [Auto-refresh] │
├──────┬──────────┬───────────┬─────────────┬──────────┬─────────────┤
│ Bay  │ Screen   │ Simulator │ Stuck       │ Uptime   │ Actions     │
├──────┼──────────┼───────────┼─────────────┼──────────┼─────────────┤
│ 1    │ 🟢 Active │ ✅ Running │ No          │ 4h 12m   │             │
│ 2    │ 🟢 Active │ ✅ Running │ No          │ 3h 45m   │             │
│ 3    │ 🔴 STUCK │ ✅ Running │ 5 min ⚠️    │ 6h 03m   │ [🔄 Restart]│
│ 4    │ 🟡 Idle  │ ❌ Stopped │ No          │ 2h 30m   │ [▶️ Start]  │
└──────┴──────────┴───────────┴─────────────┴──────────┴─────────────┘
│                                                                      │
│  ⚠️ Bay 3 alert: Screen frozen since 2:15 PM (5 minutes)            │
│     Last activity: COMPLETED SCORECARD DETECTED at 2:10 PM          │
└──────────────────────────────────────────────────────────────────────┘
```

### Implementation Steps

1. Add `calculate_frame_diff()` to capture.py (numpy downsampled comparison)
2. Add stuck detection state machine to capture loop
3. Add `stuck_threshold`, `stuck_alert_minutes`, `stuck_auto_restart` to config
4. Report stuck status in heartbeat payload (`status: "stuck"`, `stuck_since`)
5. Add `restart_simulator()` function
6. Add command channel in heartbeat response (server → bay PC commands)
7. Add `POST /api/bays/:bayNumber/restart` endpoint
8. Build bay health section in dashboard (merged with Part 5 bay status)
9. Add WebSocket push for stuck alerts (real-time notification to staff)
10. Tune `stuck_threshold` with real-world data (may need per-bay calibration)

---

### User Roles

| Role | What they see | Access |
|------|--------------|--------|
| **Admin/Owner** | Full score dashboard, all bays, all history, manage aliases | `/admin/score-review`, customer management |
| **Staff** | Score dashboard (current day), assign players at check-in | `/admin/score-review`, booking detail |
| **Customer** | Their own score history (future) | `/my-scores` on konegolf.ca |
| **Public** | Leaderboard (future) | `/leaderboard` on konegolf.ca |

### Complete Game Day Flow

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  BEFORE THE GAME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. BOOKING
   Customer books online (konegolf.ca) or walks in
   → Booking created: Room 3, 7:00-8:30 PM, 2 players
   → Booker: Matt Johnson, phone: 555-1234

2. CHECK-IN (Staff at front desk)
   Staff opens booking in POS → clicks "Assign Players"
   ┌─────────────────────────────────────┐
   │ Room 3 — 2 players                  │
   │                                     │
   │ Seat 1: Matt Johnson (booker)       │
   │ Seat 2: [Don Park          ] 🔍     │
   │         (type name or search phone) │
   │                                     │
   │              [Save Players]          │
   └─────────────────────────────────────┘
   → SeatPlayer records created

3. GAME STARTS
   Customers go to Bay 3, start playing
   capture.py is already running in background (auto-started on boot)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DURING THE GAME (no human action required)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4. capture.py grabs frames every 3 seconds
   → Sees scorecard but game in progress → skips
   → Repeats for ~1-2 hours

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  AFTER THE GAME (automatic)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5. CAPTURE
   Game ends → final scorecard with STROKE/STABLEFORD buttons
   capture.py detects completion → runs full OCR → extracts:
     matthew: 98 (+26) [confidence: 1.0 / 0.997]
     donnie:  86 (+14) [confidence: 1.0 / 1.0]
     Course: MAUNA OCEAN C.C

6. SUBMISSION
   capture.py compresses screenshot PNG → JPEG
   POSTs multipart to https://konegolf.ca/api/scores/ingest
   → Screenshot saved to /uploads/screenshots/3/2026-03-08/071402.jpg
   → ScoreCapture + 2 ScoreCapturePlayer rows created
   → Auto-matched to Matt Johnson's booking (Room 3, 7:00-8:30 PM)
   → All confidence ≥ 0.7 → status = ACTIVE ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ADMIN/STAFF DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

7. SCORE LIST (/admin/score-review)

   ┌──────────────────────────────────────────────────────────┐
   │ Score Review                     [NEEDS_REVIEW ▾] [🔍]  │
   ├──────┬───────┬──────────────┬─────────┬────────┬────────┤
   │ Time │ Bay   │ Course       │ Players │ Status │        │
   ├──────┼───────┼──────────────┼─────────┼────────┼────────┤
   │ 7:14 │ Bay 3 │ Mauna Ocean  │ 2       │  ✅    │  [▸]   │
   │ 6:30 │ Bay 1 │ Alpensia     │ 3       │  ⚠️    │  [▸]   │
   │ 5:45 │ Bay 2 │ Pine Valley  │ 1       │  ✅    │  [▸]   │
   └──────┴───────┴──────────────┴─────────┴────────┴────────┘
   
   Filters: date range, bay number, status, course name
   Default sort: NEEDS_REVIEW first, then newest

8. SCORE DETAIL (click row to expand)

   ┌───────────────────────────────────────────────────────┐
   │ Bay 3 • Mauna Ocean C.C • Mar 8, 7:14 PM             │
   │ Booking: Matt Johnson (2 players) — auto-matched ✅   │
   ├───────────────────────┬───────────────────────────────┤
   │                       │                               │
   │   ┌─────────────┐    │  1. matthew → 98 (+26)   ✅   │
   │   │             │    │     🔗 Matt Johnson  [Change]  │
   │   │ Screenshot  │    │                               │
   │   │  (click to  │    │  2. donnie  → 86 (+14)   ✅   │
   │   │  enlarge)   │    │     🔗 Don Park  [Change]     │
   │   │             │    │                               │
   │   └─────────────┘    │  [Edit Scores] [Delete]       │
   │                       │                               │
   └───────────────────────┴───────────────────────────────┘

9. REVIEWING FLAGGED SCORES (⚠️ NEEDS_REVIEW)

   When confidence < 0.7, screenshot is shown large by default.
   Staff compares screenshot to OCR values:
   → Correct? Click "Approve" → status = ACTIVE
   → Wrong? Edit name/score inline → save → status = ACTIVE

10. PLAYER LINKING

    Staff clicks [Change] next to player name:
    ┌────────────────────────────────┐
    │ Link "matthew" to customer     │
    │                                │
    │ 🔍 [Search by name or phone]  │
    │                                │
    │ Suggestions:                   │
    │ • Matt Johnson (555-1234)  ✅  │
    │   matched 3 times before       │
    │ • Matthew Lee (555-5678)       │
    │                                │
    │ [Confirm]  [Skip]              │
    └────────────────────────────────┘
    
    On confirm:
    → ScoreCapturePlayer.userId set
    → PlayerAlias "matthew" → Matt Johnson incremented

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CUSTOMER VIEW (Future)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

11. MY SCORES (/my-scores — logged-in customers)

    ┌──────────────────────────────────────────┐
    │ My Score History                          │
    │                                          │
    │ 📊 Best: 82  Average: 94  Games: 12     │
    │                                          │
    │ Mar 8  │ Mauna Ocean  │ 98 (+26) │ Bay 3│
    │ Mar 5  │ Alpensia     │ 92 (+20) │ Bay 1│
    │ Mar 1  │ Pine Valley  │ 88 (+16) │ Bay 2│
    │ Feb 26 │ Mauna Ocean  │ 95 (+23) │ Bay 3│
    └──────────────────────────────────────────┘

12. LEADERBOARD (/leaderboard — public, no login)

    ┌──────────────────────────────────────────┐
    │ 🏆 Konegolf Leaderboard                  │
    │ [This Week ▾] [All Courses ▾]            │
    │                                          │
    │  1. Don Park        │ 82 │ Pine Valley   │
    │  2. Matt Johnson    │ 86 │ Mauna Ocean   │
    │  3. Kyle Kim        │ 88 │ Alpensia      │
    │  4. Laura Park      │ 92 │ Mauna Ocean   │
    └──────────────────────────────────────────┘
```

### Dashboard Screens Summary

| Screen | Path | Auth | Description |
|--------|------|------|-------------|
| Score List | `/admin/score-review` | Staff/Admin | All captures, filterable, status badges |
| Score Detail | (expand/dialog) | Staff/Admin | Screenshot + players + edit + link |
| Customer Scores | `/admin/customers/:id/scores` | Staff/Admin | Per-customer history |
| My Scores | `/my-scores` | Customer | Customer's own scores |
| Leaderboard | `/leaderboard` | Public | Top scores, filterable |

### WebSocket Notifications (optional)

POS already uses WebSockets. When a NEEDS_REVIEW score arrives:
- Push notification to admin dashboard
- Badge count on "Score Review" nav item
- Staff sees it without refreshing

---

## Implementation Phases

| Phase | What | Depends on | Who sees it |
|-------|------|------------|-------------|
| **A** | Prisma models + ingest API + score dashboard | Part 1 (done) | Admin/Staff |
| **A2** | Heartbeat API + bay status dashboard | Phase A | Admin/Staff |
| **B** | Player linking + check-in seat assignment + Konegolf Tags | Phase A | Admin/Staff |
| **C** | Auto-deploy (updater.py + process watcher + GitHub Actions) | Part 1 (done) | Dev workflow |
| **C2** | Stuck detection + health alerts + remote restart | Phase A2 + C | Admin/Staff |
| **D** | Customer score history page | Phase B | Customers |
| **D2** | QR self-check-in mobile page | Phase B | Customers |
| **E** | Public leaderboard | Phase D | Everyone |

### Recommended Order

```
Phase A  ─────► Phase A2 ─────► Phase C2
(scores flow)   (bay monitoring) (stuck detection)
      │
      ▼
Phase C  ─────► (auto-deploy all updates painlessly)
(auto-deploy)
      │
      ▼
Phase B  ─────► Phase D  ─────► Phase D2 ─────► Phase E
(identity)      (history)       (QR check-in)    (leaderboard)
```

**Phase A first** — gets scores flowing into the POS. Most impactful.
**Phase A2 next** — remote monitoring solves the "can't see bay PCs" pain.
**Phase C third** — makes future updates painless across 4 bay PCs.
**Phase C2 fourth** — stuck detection prevents customer complaints.
**Phase B later** — adds customer identity to scores.
**Phase D, D2, E last** — customer-facing features once data is flowing.

---

## Files to Create / Modify

### Phase A (Score Collection)

**Create:**
- `backend/src/routes/scores.ts` — ingest + CRUD + screenshot serve
- `frontend/src/pages/admin/score-review.tsx` — dashboard page
- `backend/prisma/migrations/...` — schema migration

**Modify:**
- `backend/prisma/schema.prisma` — add ScoreCapture, ScoreCapturePlayer, Room.bayNumber
- `backend/src/server.ts` — register `/api/scores` route
- `backend/package.json` — add multer + @types/multer
- `backend/.env` — add SCORE_INGEST_KEY
- `docker-compose.release.yml` — add /uploads volume
- `frontend/src/App.tsx` — add /admin/score-review route

### Phase A2 (Remote Monitoring)

**Create:**
- `backend/src/routes/bays.ts` — heartbeat + bay status API
- `frontend/src/pages/admin/bay-status.tsx` — bay monitoring dashboard

**Modify:**
- `backend/prisma/schema.prisma` — add BayHeartbeat model
- `backend/src/server.ts` — register `/api/bays` route
- `screen_capture/capture.py` — add heartbeat background thread + state tracking

### Phase B (Customer Connection + Konegolf Tags)

**Create:**
- `backend/src/routes/seats.ts` — seat assignment API
- `backend/src/routes/tags.ts` — Konegolf Tag CRUD + generation
- Frontend: seat assignment UI on booking detail page
- Frontend: tag display in score dashboard

**Modify:**
- `backend/prisma/schema.prisma` — add SeatPlayer, PlayerAlias, PlayerTag
- Score dashboard: add player linking UI
- Score ingest: add tag → alias → seat → booking matching pipeline

### Phase C (Auto-Deploy + Process Watcher)

**Create:**
- `screen_capture/updater.py`
- `screen_capture/version.txt`
- `screen_capture/config.example.json`
- `screen_capture/install-service.bat`
- `.github/workflows/screen-capture-release.yml`

**Modify:**
- `screen_capture/capture.py` — add process watcher (wait for simulator .exe)
- `screen_capture/run.bat` — call updater first

### Phase C2 (Bay Health Check)

**Modify:**
- `screen_capture/capture.py` — add frame diff stuck detection + auto-restart
- `screen_capture/config.json` — add health_check_enabled, stuck_threshold, stuck_alert_minutes
- `backend/src/routes/bays.ts` — add restart command endpoint + command channel
- Bay status dashboard — add stuck alerts + restart button

### Phase D2 (QR Self-Check-In)

**Create:**
- `frontend/src/pages/checkin.tsx` — mobile check-in page (public)
- `backend/src/routes/checkin.ts` — check-in API (phone lookup, seat select, tag display)

---

## Open Items

- [x] Validate OCR accuracy (matthew/donnie test passed with 1.0 confidence)
- [ ] Deploy v4 capture.py on all bay PCs
- [ ] Bay PCs can reach konegolf.ca (internet confirmed — need to verify HTTPS POST works)
- [ ] Choose SCORE_INGEST_KEY value
- [ ] Set bayNumber for each Room in POS database
- [ ] Get exact .exe name of the golf simulator (run `Get-Process` on bay PC)
- [ ] Decide which phase to start implementing
- [ ] Consider upgrading DigitalOcean droplet if disk becomes tight
- [ ] Test stuck_threshold value on real bay PCs (may vary per bay)
- [ ] Design QR code stickers for each bay
