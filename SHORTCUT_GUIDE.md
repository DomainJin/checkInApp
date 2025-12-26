# Hướng Dẫn Sử Dụng Shortcut

## 📂 Các file shortcut đã tạo:

### 1. **Start_CheckIn.bat** - Khởi động đơn giản
- Double-click để chạy
- Tự động khởi động server
- Tự động mở trình duyệt trang chủ
- Giữ cửa sổ console mở

**Sử dụng:** Dành cho người mới, khởi động nhanh

---

### 2. **Start_CheckIn_Advanced.bat** - Khởi động nâng cao
- Chọn khu vực (HCM/Hà Nội/Cả hai)
- Tự động mở trang vận hành
- Tùy chọn mở màn hình chào mừng
- Server chạy trong cửa sổ console

**Sử dụng:** Dành cho sự kiện thực tế, có đầy đủ tùy chọn

---

### 3. **Quick_Start.bat** - Khởi động nhanh
- Chạy server ở chế độ nền (không hiện console)
- Tự động mở trang chủ
- Đóng ngay sau khi khởi động

**Sử dụng:** Khởi động nhanh nhất, không muốn thấy console

---

### 4. **Stop_Server.bat** - Dừng server
- Dừng tất cả Python processes
- Đóng server check-in

**Cảnh báo:** Sẽ đóng TẤT CẢ chương trình Python đang chạy!

---

## 🎯 Khuyến nghị sử dụng:

### Cho sự kiện:
1. Chạy **Start_CheckIn_Advanced.bat**
2. Chọn khu vực phù hợp
3. Mở màn hình chào mừng khi được hỏi
4. Đưa màn hình chào mừng sang màn hình/máy khác

### Để test nhanh:
1. Chạy **Quick_Start.bat**
2. Làm việc
3. Chạy **Stop_Server.bat** khi xong

---

## 💡 Tạo shortcut trên Desktop (tùy chọn):

1. Click phải vào file .bat
2. Chọn "Send to" > "Desktop (create shortcut)"
3. Đổi tên và icon nếu muốn

---

## ⚠️ Lưu ý:

- Đảm bảo Python đã được cài đặt và trong PATH
- File `source.xlsx` phải có trong thư mục
- Mật khẩu mặc định: `SCV2025`
- Truy cập từ `localhost` để camera hoạt động
