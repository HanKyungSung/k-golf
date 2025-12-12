# File Swap Mechanism - Detailed Explanation

## The Critical Lines That Do the Swap

### Windows Version (Lines 129-137)

```typescript
// Line 129: Create update.bat script
const scriptContent = `
@echo off
echo Updating K-Golf Print Server...
timeout /t 2 /nobreak > nul          ← WAIT 2 seconds
move /y "${updatePath}" "${currentExe}"  ← SWAP FILES
echo Update complete!
start "" "${currentExe}"              ← START NEW VERSION
exit
`;
```

### macOS Version (Lines 148-156)

```typescript
// Line 148: Create update.sh script
const scriptContent = `#!/bin/bash
echo "Updating K-Golf Print Server..."
sleep 2                               ← WAIT 2 seconds
mv -f "${updatePath}" "${currentExe}"     ← SWAP FILES
chmod +x "${currentExe}"              ← Make executable
echo "Update complete!"
"${currentExe}" &                     ← START NEW VERSION
`;
```

## Timeline - What Happens Step by Step

```
TIME    PROCESS                          FILE SYSTEM
─────   ─────────────────────────────    ─────────────────────────────
00:00   k-golf-printer.exe (v1.0.0)     
        ↓ Running normally               
        ↓ Prints receipts                ├── k-golf-printer.exe (50MB, v1.0.0)
        ↓                                └── config.json

06:00   Timer fires: Check for update    
        Downloads new version...         
                                         ├── k-golf-printer.exe (50MB, v1.0.0) ← OLD
                                         ├── k-golf-printer-new.exe (50MB, v1.0.5) ← NEW
                                         └── config.json

06:01   Creates update.bat:
        ┌────────────────────────┐
        │ timeout /t 2           │
        │ move k-golf-printer... │       ├── k-golf-printer.exe (OLD, still running)
        │ start k-golf-printer   │       ├── k-golf-printer-new.exe (NEW, waiting)
        └────────────────────────┘       ├── update.bat ← JUST CREATED
                                         └── config.json

06:01   Launches update.bat in          
        background (detached)            

06:01   process.exit(0)                  ├── k-golf-printer.exe (OLD, file unlocked now!)
        ↓                                ├── k-golf-printer-new.exe (NEW)
        OLD PROCESS EXITS                ├── update.bat (running in background)
        (file no longer locked)          └── config.json

06:03   update.bat runs:
        "timeout /t 2"                   
        ↓ Waiting...                     
        ↓ Waiting...                     
        (2 seconds pass)                 

06:03   update.bat runs:
        "move /y k-golf-printer-new.exe 
         k-golf-printer.exe"             
        ↓                                ├── k-golf-printer.exe (50MB, v1.0.5) ← REPLACED!
        FILES SWAPPED!                   ├── update.bat (still running)
        Old file deleted                 └── config.json
        New file renamed                 
                                         (k-golf-printer-new.exe is GONE)

06:03   update.bat runs:
        "start k-golf-printer.exe"      
        ↓                                
        NEW PROCESS STARTS               ├── k-golf-printer.exe (v1.0.5) ← NOW RUNNING
        VERSION 1.0.5 is live!           ├── update.bat (about to exit)
                                         └── config.json

06:03   update.bat exits                
        Cleanup complete                 ├── k-golf-printer.exe (v1.0.5, running)
                                         └── config.json
                                         
                                         (update.bat deleted itself)
```

## Detailed Breakdown

### 1. **File Download** (Line 120)

```typescript
const updatePath = path.join(process.cwd(), newExeName);
//    updatePath = "C:\K-Golf\k-golf-printer-new.exe"

await this.downloadFile(versionInfo.downloadUrl, updatePath);
// Downloads to NEW filename (doesn't touch running file)
```

**Why new filename?** Because you **cannot replace a file while it's running**.

### 2. **Script Creation** (Lines 127-135)

```typescript
const currentExe = process.execPath;
//    currentExe = "C:\K-Golf\k-golf-printer.exe" (the RUNNING file)

const scriptContent = `
move /y "${updatePath}" "${currentExe}"
`;
// This creates: move /y "C:\K-Golf\k-golf-printer-new.exe" "C:\K-Golf\k-golf-printer.exe"
```

**The `/y` flag** means "overwrite without prompting"

### 3. **Launch Script** (Lines 143-146)

```typescript
execSync(`start /min cmd /c "${updateScript}"`, {
  detached: true,    // ← Run independently, don't wait
  stdio: 'ignore'    // ← Don't capture output
});
```

**What `start /min cmd /c` does:**
- `start` - Launches a new process
- `/min` - Minimized (hidden window)
- `cmd /c` - Run command prompt, execute, then exit
- Script runs **separately** from current process

### 4. **Exit Current Process** (Lines 171-173)

```typescript
setTimeout(() => {
  process.exit(0);
}, 1000);
```

**Critical moment:** When this exits, the file lock is released!

### 5. **The Swap** (In update.bat)

```batch
timeout /t 2 /nobreak > nul
```
**Why wait 2 seconds?** To ensure old process is **fully exited** and file is **fully unlocked**.

```batch
move /y "C:\K-Golf\k-golf-printer-new.exe" "C:\K-Golf\k-golf-printer.exe"
```

**What `move` does:**
1. Deletes old `k-golf-printer.exe` (v1.0.0)
2. Renames `k-golf-printer-new.exe` to `k-golf-printer.exe` (v1.0.5)

**Result:** 
- Old file is **gone** (deleted by Windows)
- New file is **in its place**

### 6. **Restart** (In update.bat)

```batch
start "" "C:\K-Golf\k-golf-printer.exe"
```

Launches the **new file** (which is now named with the original name).

## What Happened to the Old File?

**The old file is DELETED.** Here's exactly when:

```
Before move command:
├── k-golf-printer.exe (v1.0.0) ← Old version (50MB)
└── k-golf-printer-new.exe (v1.0.5) ← New version (50MB)
Total: 100MB

After move command:
└── k-golf-printer.exe (v1.0.5) ← New version renamed
Total: 50MB

The old file is deleted by the operating system during the move operation.
```

## Why This Works

### The Trick:
1. **Running process** locks the file (can't be deleted/modified)
2. **Download to different name** (doesn't touch locked file)
3. **Exit process** (releases file lock)
4. **Wait 2 seconds** (ensure fully unlocked)
5. **Move command** atomically deletes old and renames new
6. **Start new process** with original filename

### The File Lock Problem:

```
❌ CANNOT DO THIS:
process.execPath = "C:\k-golf-printer.exe" (LOCKED)
download("new.exe", "C:\k-golf-printer.exe")  ← ERROR: File in use!

✅ MUST DO THIS:
process.execPath = "C:\k-golf-printer.exe" (LOCKED)
download("new.exe", "C:\k-golf-printer-NEW.exe")  ← Different name, works!
process.exit()  ← Unlocks file
(script waits)
move("C:\k-golf-printer-NEW.exe", "C:\k-golf-printer.exe")  ← Works now!
```

## Atomic Operation

The `move` command is **atomic** on Windows:
- Either it succeeds completely
- Or it fails completely (rollback)
- No half-updated state

```
move /y source destination
  ↓
  ├── Delete destination
  ├── Rename source to destination
  └── If any error, abort (source stays intact)
```

## What If Update Fails?

### Scenario 1: Download fails
```
Result: Old version keeps running (no files changed)
```

### Scenario 2: Script fails before swap
```
Result:
├── k-golf-printer.exe (OLD, still running)
└── k-golf-printer-new.exe (NEW, sitting there)

User can manually delete k-golf-printer-new.exe
```

### Scenario 3: Process doesn't exit
```
Result: Script waits 2 seconds, tries to move, gets error
        Old version keeps running
```

### Scenario 4: Move command fails
```
Result:
├── k-golf-printer.exe (OLD, intact)
└── k-golf-printer-new.exe (NEW, still there)

Next update check will try again
```

## Summary

**Q: Which part swaps the exe?**  
**A:** Line 133 in Windows (`move /y`), Line 152 in macOS (`mv -f`)

**Q: How does it run the new one?**  
**A:** Line 135 in Windows (`start ""`), Line 155 in macOS (`"${currentExe}" &`)

**Q: What happened to old one?**  
**A:** **Deleted by the OS** during the move/rename operation. It's gone forever.

The genius is: **The script runs OUTSIDE the process being replaced, so it can safely delete and replace it.**
