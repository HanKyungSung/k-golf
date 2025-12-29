# Timer Overlay (Python Version)

This is a lightweight alternative to the Electron timer, built with Python and Tkinter. It uses native Windows API calls to try and stay on top of fullscreen applications.

## Prerequisites

1.  **Install Python**: Download and install Python from [python.org](https://www.python.org/downloads/).
    *   **Important**: Check the box "Add Python to PATH" during installation.

## How to Run (Source Code)

1.  Open a terminal (Command Prompt or PowerShell).
2.  Navigate to this folder.
3.  Run the script:
    ```bash
    python main.py
    ```

## How to Build as .exe (Executable)

If you want to create a single `.exe` file to run on other computers without installing Python:

1.  Open a terminal in this folder.
2.  Install PyInstaller:
    ```bash
    pip install pyinstaller
    ```
3.  Build the executable:
    ```bash
    pyinstaller --noconsole --onefile --name "TimerOverlay" main.py
    ```
4.  The `TimerOverlay.exe` file will be in the `dist` folder.

## Troubleshooting

*   **Game still covers the timer**:
    *   Try running the timer *after* the game has started.
    *   Ensure the game is in "Borderless Windowed" mode if possible.
    *   If the game is in "Exclusive Fullscreen", Windows might block all overlays. This script tries to force itself to the top every 2 seconds, but some games are very aggressive.
