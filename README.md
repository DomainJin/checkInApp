# Hệ Thống Check-In Sự Kiện

Ứng dụng Python để quản lý check-in khách mời tại sự kiện.

## Tính năng

- 📊 Hiển thị thống kê tổng số khách mời, đã check-in, chưa check-in
- 📈 Biểu đồ donut trực quan theo phần trăm
- 🔍 Tìm kiếm khách theo tên hoặc số điện thoại
- ✅ Check-in và hủy check-in khách
- 💾 Lưu trữ dữ liệu trong file Excel
- 🔄 Làm mới dữ liệu

## Cài đặt

1. Cài đặt Python (phiên bản 3.8 trở lên)

2. Cài đặt các thư viện cần thiết:
```bash
pip install -r requirements.txt
```

## Sử dụng

1. Chạy ứng dụng:
```bash
python checkin_app.py
```

2. Ứng dụng sẽ tự động:
   - Đọc dữ liệu từ file `source.xlsx`
   - Nếu file chưa có, sẽ tạo dữ liệu mẫu

3. Các chức năng:
   - **Tìm kiếm**: Nhập tên hoặc số điện thoại để lọc danh sách
   - **Check-in**: Chọn khách và nhấn nút "CHECK-IN"
   - **Hủy Check-in**: Chọn khách và nhấn "HỦY CHECK-IN"
   - **Làm mới**: Nhấn "LÀM MỚI" để cập nhật dữ liệu

## Cấu trúc dữ liệu

File Excel cần có các cột:
- `STT`: Số thứ tự
- `HoTen`: Họ và tên khách
- `SoDienThoai`: Số điện thoại
- `CheckedIn`: Trạng thái check-in (True/False)
- `CheckInTime`: Thời gian check-in

## Giao diện

- **Panel trái**: Thống kê và biểu đồ
- **Panel phải**: Danh sách khách và các nút thao tác

## Lưu ý

- Dữ liệu được tự động lưu sau mỗi thao tác check-in
- Màu xanh: Đã check-in
- Màu đỏ: Chưa check-in
"# checkInApp" 
