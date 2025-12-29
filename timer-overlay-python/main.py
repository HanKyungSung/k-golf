import tkinter as tk
from tkinter import ttk
import time
import platform

# Check if running on Windows for specific API calls
IS_WINDOWS = platform.system() == "Windows"

if IS_WINDOWS:
    import ctypes
    from ctypes import windll

class TimerOverlay:
    def __init__(self, root):
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

    def reset_timer(self):
        self.running = False
        self.time_left = 5 * 60
        self.time_label.config(text=self.format_time(self.time_left))
        self.btn_start.config(text="Start")

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
                windll.user32.SetWindowPos(hwnd, -1, 0, 0, 0, 0, 0x0003)
            except Exception as e:
                print(f"Error forcing topmost: {e}")
        
        # Re-schedule this check every 2 seconds
        self.root.after(2000, self.force_topmost)

if __name__ == "__main__":
    root = tk.Tk()
    app = TimerOverlay(root)
    root.mainloop()
