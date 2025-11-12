# POS Versioning Convention

**Format:** `pos-v{MAJOR}.{MINOR}.{PATCH}`

## Semantic Versioning Rules:

**MAJOR (X.0.0)** - Breaking changes
- Major UI/UX overhaul
- Database schema changes requiring migration
- API breaking changes
- Example: `pos-v1.0.0`, `pos-v2.0.0`

**MINOR (0.X.0)** - New features (backward compatible)
- New features (e.g., add printing, new reports)
- New sync capabilities
- Performance improvements
- Example: `pos-v0.2.0`, `pos-v0.3.0`

**PATCH (0.0.X)** - Bug fixes
- Bug fixes
- Small UI tweaks
- Documentation updates
- Example: `pos-v0.1.1`, `pos-v0.1.2`

## Current Status:
- **First release:** `pos-v0.1.0` (MVP - manual booking, sync, menu)
- **Pre-production:** Start with `0.x.x` until production-ready
- **Production ready:** Bump to `1.0.0`

## Examples:
```
pos-v0.1.0  → Initial MVP release
pos-v0.1.1  → Fix UI refresh bug
pos-v0.2.0  → Add printing feature
pos-v0.3.0  → Add reporting dashboard
pos-v1.0.0  → Production ready (deployed to venue)
pos-v1.0.1  → Hotfix for sync issue
pos-v1.1.0  → Add customer history feature
```

## Tag Naming:
- Always prefix with `pos-v` (distinguishes from backend/frontend releases)
- Always use lowercase `v`
- No spaces: `pos-v0.1.0` ✅ NOT `POS-V0.1.0` ❌
