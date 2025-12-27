# HƯỚNG DẪN ĐÓNG GÓI ỨNG DỤNG THÀNH FILE .EXE

## Giới thiệu
Tài liệu này hướng dẫn cách đóng gói ứng dụng Check-In thành file thực thi (.exe) có thể chạy trên các máy Windows khác nhau mà không cần cài đặt Python.

## Yêu cầu hệ thống
- Windows 7 trở lên (32-bit hoặc 64-bit)
- Python 3.8 trở lên đã được cài đặt trên máy build
- Kết nối Internet (để tải các gói cần thiết)
- Dung lượng trống: ít nhất 500MB

## Phương pháp 1: Build file .exe đơn (KHUYẾN NGHỊ)

### Bước 1: Chạy file Build_EXE.bat
```
Double-click vào file: Build_EXE.bat
```

### Bước 2: Đợi quá trình build hoàn tất
- Script sẽ tự động:
  - Kiểm tra Python
  - Cài đặt PyInstaller
  - Cài đặt các dependencies
  - Build file .exe

### Bước 3: Lấy file .exe
- File được tạo tại: `dist\CheckInApp.exe`
- Kích thước: khoảng 50-100MB

### Bước 4: Triển khai
1. Sao chép `CheckInApp.exe` sang máy đích
2. Đặt file `source.xlsx` cùng thư mục với CheckInApp.exe
3. Double-click vào CheckInApp.exe để chạy
4. Mở trình duyệt và truy cập: http://localhost:5000

## Phương pháp 2: Build package di động (Portable)

### Bước 1: Chạy file Build_Portable.bat
```
Double-click vào file: Build_Portable.bat
```

### Bước 2: Lấy thư mục ứng dụng
- Thư mục được tạo tại: `dist\CheckInApp\`
- Chứa toàn bộ files cần thiết

### Bước 3: Triển khai
1. Sao chép toàn bộ thư mục `dist\CheckInApp` sang máy đích
2. Đặt file `source.xlsx` vào thư mục CheckInApp
3. Chạy `Run_CheckIn.bat` hoặc `CheckInApp.exe`

## Tính năng đặc biệt

### Tự động tải packages (Chỉ với file đơn)
- Lần đầu chạy, ứng dụng sẽ tự động kiểm tra và cài đặt các gói Python cần thiết
- Không cần cài đặt Python trên máy đích
- Tự động phát hiện thiếu gói và cài đặt

### Tương thích đa nền tảng
- **32-bit và 64-bit**: File .exe tự động tương thích với cả 2 kiến trúc
- **Windows 7/8/10/11**: Chạy trên mọi phiên bản Windows hiện đại
- **Nhiều CPU**: Intel, AMD, ARM đều được hỗ trợ

## Cấu trúc file sau khi build

### Build đơn (Single file):
```
CheckInApp.exe          <- File thực thi chính
source.xlsx             <- File dữ liệu (cần copy thêm)
```

### Build di động (Portable):
```
CheckInApp/
├── CheckInApp.exe      <- File thực thi
├── Run_CheckIn.bat     <- Script chạy nhanh
├── _internal/          <- Thư viện và dependencies
├── templates/          <- HTML templates
├── static/             <- CSS, JS files
├── README.md           <- Tài liệu
└── source.xlsx         <- File dữ liệu (cần copy thêm)
```

## Xử lý lỗi thường gặp

### Lỗi: "Python chưa được cài đặt"
- **Nguyên nhân**: Máy build chưa có Python
- **Giải pháp**: Cài đặt Python từ https://www.python.org/

### Lỗi: "Không thể cài đặt PyInstaller"
- **Nguyên nhân**: Không có kết nối Internet hoặc pip lỗi
- **Giải pháp**: 
  ```
  python -m pip install --upgrade pip
  python -m pip install pyinstaller
  ```

### Lỗi khi chạy .exe: "MSVCP140.dll not found"
- **Nguyên nhân**: Thiếu Visual C++ Redistributable
- **Giải pháp**: Cài đặt Microsoft Visual C++ 2015-2022 Redistributable

### Lỗi: Camera không hoạt động
- **Nguyên nhân**: Thiếu codec hoặc driver camera
- **Giải pháp**: Cài đặt K-Lite Codec Pack hoặc cập nhật driver camera

## Build thủ công (Nâng cao)

### Sử dụng Python script:
```bash
python build_exe.py
```

### Sử dụng PyInstaller trực tiếp:
```bash
pyinstaller --onefile --windowed --name=CheckInApp ^
    --add-data="templates;templates" ^
    --add-data="static;static" ^
    --hidden-import=pyzbar ^
    --hidden-import=cv2 ^
    --collect-all=pyzbar ^
    web_app.py
```

## Tùy chỉnh build

### Thay đổi icon:
1. Tạo file icon (.ico)
2. Sửa trong Build_EXE.bat:
```batch
--icon=icon.ico
```

### Giảm kích thước file:
1. Sử dụng UPX compression:
```batch
--upx-dir=path\to\upx
```

### Thêm dữ liệu bổ sung:
```batch
--add-data="new_file.txt;."
```

## Phân phối ứng dụng

### Cách 1: File ZIP
```
1. Nén thư mục dist\CheckInApp thành CheckInApp.zip
2. Upload lên Google Drive / Dropbox
3. Chia sẻ link download
```

### Cách 2: Installer
- Sử dụng Inno Setup để tạo installer chuyên nghiệp
- Tự động cài đặt dependencies
- Tạo shortcuts trên Desktop

### Cách 3: USB
```
1. Copy thư mục CheckInApp vào USB
2. Cắm USB vào máy đích và chạy
```

## Bảo mật và chữ ký số

### Ký file .exe (Windows):
```bash
signtool sign /f certificate.pfx /p password CheckInApp.exe
```

### Tạo checksum:
```bash
certutil -hashfile CheckInApp.exe SHA256
```

## Hỗ trợ

Nếu gặp vấn đề trong quá trình build:
1. Kiểm tra log trong terminal
2. Xem file `build.log` trong thư mục build
3. Đảm bảo tất cả dependencies đã được cài đặt

## Ghi chú quan trọng

⚠️ **LƯU Ý:**
- File .exe có kích thước lớn (50-100MB) vì chứa toàn bộ Python runtime
- Lần chạy đầu tiên có thể chậm hơn do Windows Defender scan
- Một số antivirus có thể cảnh báo false positive
- File source.xlsx luôn cần được đặt cùng thư mục với .exe

✅ **ƯU ĐIỂM:**
- Không cần cài đặt Python trên máy đích
- Chạy standalone hoàn toàn
- Tương thích đa nền tảng Windows
- Dễ dàng phân phối

---

**Phiên bản tài liệu:** 1.0  
**Ngày cập nhật:** 2025-12-27
