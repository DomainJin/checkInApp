"""
Launcher script that checks and installs dependencies before running the app
This will be compiled into the .exe file
"""
import subprocess
import sys
import os
import pkg_resources
from pathlib import Path

def get_base_path():
    """Get the base path for the application"""
    if getattr(sys, 'frozen', False):
        # Running as compiled executable
        return Path(sys.executable).parent
    else:
        # Running as script
        return Path(__file__).parent

def check_and_install_dependencies():
    """Check if all required packages are installed, install if missing"""
    requirements_file = get_base_path() / "requirements.txt"
    
    if not requirements_file.exists():
        print("Không tìm thấy file requirements.txt")
        return True
    
    print("Đang kiểm tra các gói cần thiết...")
    
    # Read requirements
    with open(requirements_file, 'r') as f:
        requirements = [line.strip() for line in f if line.strip() and not line.startswith('#')]
    
    missing_packages = []
    
    for requirement in requirements:
        package_name = requirement.split('==')[0].split('>=')[0].split('<=')[0]
        try:
            pkg_resources.get_distribution(package_name)
        except pkg_resources.DistributionNotFound:
            missing_packages.append(requirement)
    
    if missing_packages:
        print(f"\nĐang cài đặt {len(missing_packages)} gói còn thiếu...")
        for package in missing_packages:
            print(f"  - {package}")
        
        try:
            subprocess.check_call([
                sys.executable, "-m", "pip", "install", "--upgrade", "pip"
            ])
            
            for package in missing_packages:
                print(f"\nĐang cài đặt {package}...")
                subprocess.check_call([
                    sys.executable, "-m", "pip", "install", package
                ])
            
            print("\n✓ Đã cài đặt tất cả các gói cần thiết")
            return True
        except subprocess.CalledProcessError as e:
            print(f"\n❌ Lỗi khi cài đặt gói: {e}")
            return False
    else:
        print("✓ Tất cả các gói đã được cài đặt")
        return True

def launch_app():
    """Launch the main application"""
    try:
        # Import and run the main app
        from web_app import app
        print("\n" + "="*60)
        print("Check-In Application đang chạy...")
        print("Mở trình duyệt và truy cập: http://localhost:5000")
        print("Nhấn Ctrl+C để dừng ứng dụng")
        print("="*60 + "\n")
        
        app.run(debug=False, host='0.0.0.0', port=5000, threaded=True)
    except Exception as e:
        print(f"\n❌ Lỗi khi chạy ứng dụng: {e}")
        input("\nNhấn Enter để thoát...")
        sys.exit(1)

def main():
    """Main launcher function"""
    print("="*60)
    print("Check-In Application Launcher")
    print("="*60)
    print()
    
    # Check and install dependencies
    if not check_and_install_dependencies():
        print("\n❌ Không thể cài đặt các gói cần thiết")
        input("\nNhấn Enter để thoát...")
        sys.exit(1)
    
    # Launch the application
    launch_app()

if __name__ == "__main__":
    main()
