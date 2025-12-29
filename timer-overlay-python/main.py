import tkinter as tk
from tkinter import ttk
import time
import platform
import logging
import os

# Setup logging
log_file = os.path.join(os.getcwd(), 'timer_debug.log')
logging.basicConfig(
    filename=log_file,
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Check if running on Windows for specific API calls
IS_WINDOWS = platform.system() == "Windows"

if IS_WINDOWS:
    import ctypes
    from ctypes import windll, wintypes
    
    # Define RECT structure for GetWindowRect
    class RECT(ctypes.Structure):
        _fields_ = [("left", ctypes.c_long),
                    ("top", ctypes.c_long),
                    ("right", ctypes.c_long),
                    ("bottom", ctypes.c_long)]

class TimerOverlay:
    def __init__(self, root):
        logging.info("TimerOverlay initializing...")
        self.root = root
        self.root.title("Timer Overlay")
        self.root.geometry("300x150+100+100")
        
        # Window Configuration
        self.root.overrideredirect(True)  # Remove window decorations (frameless)
        self.root.attributes('-topmost', True)  # Keep on top
        
        # Transparency
        # On Windows, we use a specific color as the "transparent key"
        # Everything with this color will be fully transparent (click-through in some cases)
        self.bg_color = '#000001'  # Almost black, but not quite, to avoid accidental transparency if we use black text
        self.root.config(bg=self.bg_color)
        if IS_WINDOWS:
            self.root.attributes('-transparentcolor', self.bg_color)
        else:
            # Fallback for macOS/Linux (alpha transparency)
            self.root.attributes('-alpha', 0.8)

        # State
        self.time_left = 5 * 60  # 5 minutes
        self.running = False
        self.is_small = False
        
        # UI Setup
        self.setup_ui()
        
        # Dragging Logic
        self.root.bind('<Button-1>', self.start_move)
        self.root.bind('<B1-Motion>', self.do_move)
        
        # Timer Loop
        self.update_timer()
        
        # Force Topmost Loop (Aggressive)
        self.force_topmost()
        
        # Apply Extended Window Styles (ToolWindow, etc.)
        self.apply_window_styles()
        
        # Start Debug Logging Loop
        self.log_debug_info()

    def apply_window_styles(self):
        if IS_WINDOWS:
            try:
                hwnd = windll.user32.GetParent(self.root.winfo_id())
                if hwnd == 0:
                    hwnd = self.root.winfo_id()
                
                logging.info(f"Applying styles to HWND: {hwnd}")
                
                # Constants
                GWL_EXSTYLE = -20
                WS_EX_TOOLWINDOW = 0x00000080
                WS_EX_TOPMOST = 0x00000008
                WS_EX_NOACTIVATE = 0x08000000
                
                # Get current style
                style = windll.user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
                logging.info(f"Old ExStyle: {hex(style)}")
                
                # Add new styles
                new_style = style | WS_EX_TOOLWINDOW | WS_EX_TOPMOST | WS_EX_NOACTIVATE
                
                # Set new style
                result = windll.user32.SetWindowLongW(hwnd, GWL_EXSTYLE, new_style)
                if result == 0:
                    logging.warning(f"SetWindowLongW might have failed. Last Error: {ctypes.get_last_error()}")
                else:
                    logging.info(f"New ExStyle applied: {hex(new_style)}")
                    
            except Exception as e:
                logging.error(f"Error applying styles: {e}")

    def setup_ui(self):
        # Main Container
        self.container = tk.Frame(self.root, bg=self.bg_color)
        self.container.pack(fill='both', expand=True)
        
        # Time Display
        self.time_label = tk.Label(
            self.container, 
            text=self.format_time(self.time_left),
            font=('Consolas', 48, 'bold'),
            fg='white',
            bg=self.bg_color
        )
        self.time_label.pack(pady=(10, 0))
        
        # Controls Frame
        self.controls_frame = tk.Frame(self.container, bg=self.bg_color)
        self.controls_frame.pack(pady=10)
        
        # Buttons
        style = ttk.Style()
        style.configure('TButton', font=('Arial', 10))
        
        self.btn_start = tk.Button(self.controls_frame, text="Start", command=self.toggle_timer, bg='white', fg='black')
        self.btn_start.pack(side='left', padx=5)
        
        self.btn_reset = tk.Button(self.controls_frame, text="Reset", command=self.reset_timer, bg='white', fg='black')
        self.btn_reset.pack(side='left', padx=5)
        
        self.btn_small = tk.Button(self.controls_frame, text="Small", command=self.toggle_size, bg='white', fg='black')
        self.btn_small.pack(side='left', padx=5)
        
        self.btn_close = tk.Button(self.controls_frame, text="X", command=self.root.quit, bg='red', fg='white')
        self.btn_close.pack(side='left', padx=5)

    def format_time(self, seconds):
        mins = seconds // 60
        secs = seconds % 60
        return f"{mins:02d}:{secs:02d}"

    def update_timer(self):
        if self.running and self.time_left > 0:
            self.time_left -= 1
            self.time_label.config(text=self.format_time(self.time_left))
        elif self.time_left == 0:
            self.running = False
            self.btn_start.config(text="Start")
            
        self.root.after(1000, self.update_timer)

    def toggle_timer(self):
        self.running = not self.running
        self.btn_start.config(text="Pause" if self.running else "Start")
        logging.info(f"Timer toggled. Running: {self.running}")

    def reset_timer(self):
        self.running = False
        self.time_left = 5 * 60
        self.time_label.config(text=self.format_time(self.time_left))
        self.btn_start.config(text="Start")
        logging.info("Timer reset")

    def toggle_size(self):
        self.is_small = not self.is_small
        if self.is_small:
            self.root.geometry("150x80")
            self.time_label.config(font=('Consolas', 24, 'bold'))
            self.btn_reset.pack_forget()
            self.btn_close.pack_forget()
            self.btn_small.config(text="+")
        else:
            self.root.geometry("300x150")
            self.time_label.config(font=('Consolas', 48, 'bold'))
            self.btn_reset.pack(side='left', padx=5)
            self.btn_small.config(text="Small")
            self.btn_close.pack(side='left', padx=5)
        logging.info(f"Size toggled. Small: {self.is_small}")

    def start_move(self, event):
        self.x = event.x
        self.y = event.y

    def do_move(self, event):
        deltax = event.x - self.x
        deltay = event.y - self.y
        x = self.root.winfo_x() + deltax
        y = self.root.winfo_y() + deltay
        self.root.geometry(f"+{x}+{y}")

    def force_topmost(self):
        """
        Aggressively force the window to be on top using Windows API.
        """
        if IS_WINDOWS:
            try:
                hwnd = windll.user32.GetParent(self.root.winfo_id())
                if hwnd == 0:
                    hwnd = self.root.winfo_id()
                
                # HWND_TOPMOST = -1
                # SWP_NOMOVE = 0x0002
                # SWP_NOSIZE = 0x0001
                # SWP_NOACTIVATE = 0x0010
                # SWP_SHOWWINDOW = 0x0040
                # Flags: NOMOVE | NOSIZE | NOACTIVATE | SHOWWINDOW
                result = windll.user32.SetWindowPos(hwnd, -1, 0, 0, 0, 0, 0x0053)
                if result == 0:
                    logging.warning(f"SetWindowPos failed. Last Error: {ctypes.get_last_error()}")
            except Exception as e:
                logging.error(f"Error forcing topmost: {e}")
        
        # Re-schedule this check every 500ms (more aggressive)
        self.root.after(500, self.force_topmost)

    def log_debug_info(self):
        """
        Logs information about the current window state and the foreground window.
        """
        if IS_WINDOWS:
            try:
                # 1. Timer Window Info
                hwnd = windll.user32.GetParent(self.root.winfo_id())
                if hwnd == 0: hwnd = self.root.winfo_id()
                
                GWL_EXSTYLE = -20
                ex_style = windll.user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
                WS_EX_TOPMOST = 0x00000008
                is_topmost = (ex_style & WS_EX_TOPMOST) != 0
                
                # 2. Foreground Window Info
                fg_hwnd = windll.user32.GetForegroundWindow()
                length = windll.user32.GetWindowTextLengthW(fg_hwnd)
                buff = ctypes.create_unicode_buffer(length + 1)
                windll.user32.GetWindowTextW(fg_hwnd, buff, length + 1)
                fg_title = buff.value
                
                # 3. Foreground Window Rect (to check for fullscreen)
                rect = RECT()
                windll.user32.GetWindowRect(fg_hwnd, ctypes.byref(rect))
                width = rect.right - rect.left
                height = rect.bottom - rect.top
                
                screen_w = windll.user32.GetSystemMetrics(0)
                screen_h = windll.user32.GetSystemMetrics(1)
                
                is_fullscreen = (width >= screen_w and height >= screen_h)
                
                logging.debug(
                    f"STATUS CHECK:\n"
                    f"  Timer HWND: {hwnd} | Topmost: {is_topmost} | ExStyle: {hex(ex_style)}\n"
                    f"  Foreground: '{fg_title}' (HWND: {fg_hwnd})\n"
                    f"  Foreground Size: {width}x{height} (Screen: {screen_w}x{screen_h}) | Fullscreen: {is_fullscreen}"
                )
                
            except Exception as e:
                logging.error(f"Debug log error: {e}")
        
        # Log every 5 seconds
        self.root.after(5000, self.log_debug_info)

if __name__ == "__main__":
    root = tk.Tk()
    app = TimerOverlay(root)
    root.mainloop()
