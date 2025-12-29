import ctypes
import sys
import time

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

GWL_STYLE = -16
WS_POPUP = 0x80000000
WS_OVERLAPPEDWINDOW = 0x00CF0000
WS_VISIBLE = 0x10000000
SWP_FRAMECHANGED = 0x0020
SWP_NOZORDER = 0x0004
SWP_NOMOVE = 0x0002
SWP_NOSIZE = 0x0001

def get_window_text(hwnd):
    length = user32.GetWindowTextLengthW(hwnd)
    if length > 0:
        buff = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buff, length + 1)
        return buff.value
    return ""

def is_window_visible(hwnd):
    return user32.IsWindowVisible(hwnd)

def enum_windows():
    windows = []
    def callback(hwnd, _):
        if is_window_visible(hwnd):
            title = get_window_text(hwnd)
            if title:
                windows.append((hwnd, title))
        return True
    
    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
    user32.EnumWindows(WNDENUMPROC(callback), 0)
    return windows

def force_windowed(hwnd):
    style = user32.GetWindowLongW(hwnd, GWL_STYLE)
    
    # Remove POPUP, Add OVERLAPPEDWINDOW
    new_style = (style & ~WS_POPUP) | WS_OVERLAPPEDWINDOW
    
    user32.SetWindowLongW(hwnd, GWL_STYLE, new_style)
    
    # Trigger frame update
    user32.SetWindowPos(hwnd, 0, 0, 0, 0, 0, SWP_FRAMECHANGED | SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER)
    print("Attempted to force windowed mode.")

def main():
    target_name = "CITEEZON"
    print(f"Searching for window containing '{target_name}'...")
    print("This tool will automatically apply windowed mode when the game is found.")
    print("Press Ctrl+C to exit if the game is not running.")

    while True:
        windows = enum_windows()
        found_hwnd = None
        found_title = ""

        for hwnd, title in windows:
            if target_name.lower() in title.lower():
                found_hwnd = hwnd
                found_title = title
                break
        
        if found_hwnd:
            print(f"\nFound target: '{found_title}'")
            force_windowed(found_hwnd)
            print("Successfully modified window style.")
            print("You should now be able to see the overlay.")
            break
        
        time.sleep(2)
    
    print("Exiting in 5 seconds...")
    time.sleep(5)

if __name__ == "__main__":
    main()
