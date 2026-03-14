# Konegolf Score Capture System

Automatic scorecard detection and extraction for Golfzon screen golf simulators.

## Overview

This system runs in the background on each bay PC, automatically captures end-of-game scorecards, extracts player names and scores using OCR, and uploads results to Google Drive.

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────┐
│  Golfzon Game    │     │  capture.py  │     │ Google Drive │
│  (Fullscreen)    │────▶│  (Background)│────▶│  (Cloud)     │
│                  │     │              │     │              │
│  Bay 1-4 PCs     │     │  DXGI + OCR  │     │  Screenshots │
│  Windows/RTX3060 │     │  PaddleOCR   │     │  + JSON data │
└─────────────────┘     └──────────────┘     └──────────────┘
```

## How It Works

### Detection Strategy: Capture-First

The system uses a two-phase approach to catch scorecards that may only appear for 2-3 seconds:

```
Phase 1: Fast Color Check (every 0.5s)          Phase 2: OCR Verification
┌─────────────────────────────────┐              ┌─────────────────────┐
│                                 │              │                     │
│  Grab frame ──▶ Check 5 pixels  │              │  Run PaddleOCR on   │
│                    │            │              │  saved frame        │
│               Color match?      │              │       │             │
│              /          \       │              │  "SCORE CARD" found?│
│            No           Yes     │              │    /          \     │
│             │            │      │              │  No           Yes   │
│          (skip)    Save frame   │              │   │            │    │
│                   to memory     │   Scorecard  │ Discard    Extract  │
│                        │        │──disappears─▶│           scores +  │
│                   Overwrite     │              │           upload    │
│                   each match    │              │                     │
└─────────────────────────────────┘              └─────────────────────┘
```

**Why this approach?**
- Color check is instant (~0ms) — just reads 5 pixel values
- No OCR during gameplay — zero GPU impact on the game
- Catches scorecards shown for as little as 1-2 seconds
- OCR only runs once, after the scorecard disappears

### Color Pre-filter

The Golfzon scorecard has a distinctive dark gray background (~RGB 45, 48, 55). Five points are sampled at fixed positions on the screen:

```
┌──────────────────────────────────────────┐
│          ②       ①       ③              │  ① (50%, 13%) — center top
│                                          │  ② (30%, 13%) — left top
│                                          │  ③ (70%, 13%) — right top
│                                    ④     │  ④ (85%, 30%) — right margin
│                                          │  ⑤ (85%, 40%) — right margin lower
│                                    ⑤     │
│                                          │  Threshold: 4 of 5 must match
│                                          │  Tolerance: ±12 per RGB channel
└──────────────────────────────────────────┘
```

### OCR Regions

When extracting data from a confirmed scorecard, four regions are cropped:

```
┌──────────────────────────────────────────┐
│  ┌─────────────────────┐                 │
│  │   Course Name       │  course_region  │
│  └─────────────────────┘                 │
│     ┌──────────────────────┐             │
│     │    SCORE CARD        │ detect_region│
│     └──────────────────────┘             │
│                                          │
│  ┌──────┐                  ┌─────┐       │
│  │Name 1│  4 5 4 5 3 ...   │ 48  │      │
│  │Name 2│  5 4 3 5 4 ...   │ 47  │      │
│  │Name 3│  4 5 4 5 3 ...   │ 48  │      │
│  │Name 4│  3 4 5 4 3 ...   │ 43  │      │
│  └──────┘                  └─────┘       │
│  name_region             score_region    │
└──────────────────────────────────────────┘

Region defaults (% of 1920x1080 screen):
  detect_region:  x=28%, y=12%, w=44%, h=16%
  name_region:    x=12%, y=40%, w=16%, h=17%
  score_region:   x=68%, y=40%, w=10%, h=17%
  course_region:  x=24%, y=5%,  w=30%, h=7%
```

### Name Detection Pipeline

Player names on Golfzon scorecards can be very small (sometimes single characters). The pipeline handles this:

1. **Crop** name region from frame
2. **Upscale 5×** with LANCZOS interpolation (critical for tiny text)
3. **PaddleOCR** reads the upscaled image
4. **Badge stripping** — removes Golfzon level prefixes (e.g., "A h" → "h", "S pro" → "pro")
5. **Row assignment** — maps each detected name to a player row (1-4)
6. **Row merging** — if OCR splits a name (e.g., "b" + "mollon"), merges them back
7. **Pairing** — matches names with scores by row position

### Score Parsing

- Scores like `48(+24)` are split — the parenthetical delta is discarded
- Only the base score is kept (48 in this example)
- Multiple score candidates per row are resolved by preferring 2-digit scores in the 30-70 range

## File Structure

```
screen_capture/
├── capture.py              # Main capture script
├── config.json             # Bay-specific config (gitignored)
├── config.json.example     # Config template
├── requirements.txt        # Python dependencies
├── VERSION.txt             # Version number
├── run.bat                 # Start capture (Windows)
├── setup.bat               # Install dependencies (Windows)
├── samples/                # Sample scorecard images for testing
│   ├── sample_v1.jpg       # Bay 2 — single-char names (h, c, z, k)
│   ├── sample_v2.png       # Bay 4 — captured via v5.6
│   ├── sample_v3.png       # Bay 4 — captured via v5.6
│   └── sample_v4.png       # Bay 4 — captured via v5.6
└── captures/               # Local screenshot storage (gitignored)
```

## Setup

### Requirements

- **OS:** Windows 10/11
- **Python:** 3.12 or 3.13 (NOT 3.14 — PaddlePaddle incompatible)
- **GPU:** NVIDIA recommended (RTX 3060 on bay PCs)
- **Display:** 1920×1080 (Golfzon default)

### Installation

1. Extract the zip file to a folder on the bay PC
2. Run `setup.bat` (installs Python dependencies)
3. Copy `config.json.example` to `config.json` and edit:

```json
{
  "bay_number": 1,
  "google_drive_client_secret": "client_secret.json",
  "google_drive_folder_id": "YOUR_FOLDER_ID",
  "capture_interval_seconds": 0.5,
  "cooldown_seconds": 120
}
```

4. Place `client_secret.json` (Google OAuth credentials) in the same folder
5. Run `run.bat` — first run will open a browser for Google Drive authentication
6. After auth, `token.json` is saved locally for future runs

### Config Options

| Key | Default | Description |
|-----|---------|-------------|
| `bay_number` | 1 | Bay identifier (1-4) |
| `capture_interval_seconds` | 0.5 | Seconds between screen captures |
| `cooldown_seconds` | 120 | Wait time after a scorecard is processed |
| `confidence_threshold` | 0.7 | Minimum OCR confidence for name extraction |
| `detect_region` | `{x:0.28, y:0.12, w:0.44, h:0.16}` | Screen region to look for "SCORE CARD" text |
| `name_region` | `{x:0.12, y:0.40, w:0.16, h:0.17}` | Screen region containing player names |
| `score_region` | `{x:0.68, y:0.40, w:0.10, h:0.17}` | Screen region containing total scores |
| `course_region` | `{x:0.24, y:0.05, w:0.30, h:0.07}` | Screen region containing course name |

## Output

### Google Drive Structure

```
Google Drive/
└── Konegolf Scores/
    └── Bay 1/
        └── 2026-03-14/
            ├── 163629.jpg    # Screenshot of scorecard
            └── 163629.json   # Extracted data
```

### JSON Output Format

```json
{
  "timestamp": "2026-03-14T16:36:28.123456",
  "bay_number": 4,
  "source_version": "2.0.0",
  "course": "MAUNA OCEAN C.C",
  "players": [
    {
      "seat_index": 1,
      "name": "h",
      "total_score": 48,
      "name_confidence": 0.855,
      "score_confidence": 0.992
    },
    {
      "seat_index": 2,
      "name": "c",
      "total_score": 47,
      "name_confidence": 0.974,
      "score_confidence": 0.999
    }
  ],
  "screenshot_url": "https://drive.google.com/file/d/..."
}
```

## Troubleshooting

### PaddlePaddle crashes with oneDNN error
```
ConvertPirAttribute2RuntimeAttribute not support [pir::ArrayAttribute<pir::DoubleAttribute>]
```
**Fix:** Downgrade to PaddlePaddle 3.0.0:
```
py -m pip install paddlepaddle==3.0.0
```

### `python` not found but `py` works
Windows Python launcher (`py`) is registered but `python` is not on PATH.
**Fix:** Settings → Apps → Advanced app settings → App execution aliases → turn OFF python.exe and python3.exe. Then add Python's install folder to system PATH.

### Empty OCR text on every frame
Check the log for `OCR predict exception`. If present, it's a PaddlePaddle compatibility issue. Ensure you're on Python 3.13 and PaddlePaddle 3.0.0.

### Scorecard not detected
- Ensure the game is fullscreen on the primary display
- Check `score_capture.log` for `Color match` entries — if none, the color pre-filter points may need recalibrating for your screen
- Try increasing `capture_interval_seconds` if CPU usage is too high

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `dxcam` | latest | DXGI screen capture (Windows) |
| `paddlepaddle` | 3.0.0 | PaddlePaddle deep learning framework |
| `paddleocr` | latest | OCR engine |
| `opencv-python` | latest | Image processing |
| `Pillow` | latest | Image I/O |
| `requests` | latest | HTTP client |
| `google-auth` | latest | Google API authentication |
| `google-auth-oauthlib` | latest | Google OAuth flow |
| `google-api-python-client` | latest | Google Drive API |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-03-14 | Capture-first strategy, PaddleOCR, color pre-filter, 0.5s polling |
