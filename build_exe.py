"""
Script to build the Check-In application as a standalone executable
"""
import subprocess
import sys
import os

def install_pyinstaller():
    """Install PyInstaller if not already installed"""
    print("Đang cài đặt PyInstaller...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
    print("✓ Đã cài đặt PyInstaller\n")

def build_exe():
    """Build the executable using PyInstaller"""
    print("Đang build ứng dụng thành file .exe...")
    
    # PyInstaller command with all necessary options
    pyinstaller_args = [
        'pyinstaller',
        '--name=CheckInApp',
        '--onefile',
        '--windowed',
        '--icon=NONE',
        '--add-data=templates;templates',
        '--add-data=static;static',
        '--add-data=README.md;.',
        '--add-data=requirements.txt;.',
        '--hidden-import=pyzbar',
        '--hidden-import=pyzbar.pyzbar',
        '--hidden-import=cv2',
        '--hidden-import=pandas',
        '--hidden-import=openpyxl',
        '--hidden-import=flask',
        '--hidden-import=msoffcrypto',
        '--collect-all=pyzbar',
        '--collect-all=cv2',
        'web_app.py'
    ]
    
    subprocess.check_call(pyinstaller_args)
    print("\n✓ Build hoàn tất!")
    print("File .exe được tạo trong thư mục 'dist'")

def main():
    print("=" * 60)
    print("Check-In App - Build Tool")
    print("=" * 60)
    print()
    
    try:
        # Check if PyInstaller is installed
        try:
            import PyInstaller
        except ImportError:
            install_pyinstaller()
        
        # Build the executable
        build_exe()
        
        print("\n" + "=" * 60)
        print("HOÀN TẤT!")
        print("=" * 60)
        print("\nFile thực thi: dist\\CheckInApp.exe")
        print("\nLưu ý: File source.xlsx cần được đặt cùng thư mục với CheckInApp.exe")
        
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
