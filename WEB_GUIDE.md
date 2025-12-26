# Hướng Dẫn Sử Dụng Web Interface

## Chạy Web App

1. Mở terminal và chạy lệnh:
```bash
python web_app.py
```

2. Mở trình duyệt và truy cập:
```
http://localhost:5000
```

3. Chọn khu vực check-in:
   - HCM (314 người)
   - Hà Nội (115 người)
   - Cả hai khu vực (429 người)

4. Camera sẽ tự động mở và quét QR code

## Tính Năng

✅ **Giao diện web hiện đại**
- Responsive design (tự động điều chỉnh theo màn hình)
- Giao diện đẹp mắt với gradient màu

✅ **Quét QR code trực tiếp trên web**
- Sử dụng thư viện ZXing
- Tự động phát hiện và quét QR code
- Tránh quét trùng trong 3 giây

✅ **Thống kê real-time**
- Tổng số khách mời
- Số lượng đã check-in
- Số lượng chưa check-in
- Tỷ lệ check-in (%)

✅ **Lịch sử check-in**
- Hiển thị 10 check-in gần nhất
- Thông tin chi tiết từng người

✅ **Tải file Excel**
- Download file kết quả check-in

## Lưu Ý

- Web app chạy trên cổng 5000
- Cần cho phép trình duyệt truy cập camera
- File Excel kết quả được lưu tự động
- Hỗ trợ nhiều người cùng check-in đồng thời (nếu chạy trên server)

## So Sánh

**Console App (checkin_app.py):**
- Chạy trên terminal
- Phù hợp cho 1 máy check-in

**Web App (web_app.py):**
- Chạy trên trình duyệt
- Giao diện đẹp, dễ sử dụng
- Có thể mở nhiều tab/máy cùng lúc
- Xem thống kê real-time
- Phù hợp cho nhiều điểm check-in
