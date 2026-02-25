# Database Migration - Quản lý Nhân viên

## 1. Thêm cột `is_supervisor` vào table `users`

Chạy SQL command sau để thêm cột:

```sql
ALTER TABLE users ADD COLUMN is_supervisor BOOLEAN DEFAULT 0 AFTER role;
```

## 2. Thiết đặt tài khoản Supervisor

Bạn cần chọn **1 tài khoản duy nhất** để làm super admin có quyền quản lý nhân viên.

Ví dụ: Nếu bạn có tài khoản admin với username là "admin", chạy:

```sql
UPDATE users SET is_supervisor = 1 WHERE username = 'admin' LIMIT 1;
```

**Hoặc theo ID (nếu biết ID):**

```sql
UPDATE users SET is_supervisor = 1 WHERE id = 1;
```

## 3. Xác nhận cấu hình

Kiểm tra xem tài khoản supervisor đã được cấu hình:

```sql
SELECT id, username, is_supervisor FROM users WHERE role IN ('admin', 'staff');
```

Kết quả sẽ hiển thị tài khoản nào có `is_supervisor = 1`

## 4. Hệ thống phân quyền

Sau khi cập nhật:

- **1 tài khoản supervisor** (is_supervisor = 1):
  - ✅ Quản lý nhân viên (thêm, sửa, xóa)
  - ✅ Quản lý sản phẩm
  - ✅ Quản lý khách hàng
  - ✅ Quản lý đơn hàng

- **Các tài khoản nhân viên khác** (role = 'admin', is_supervisor = 0):
  - ❌ KHÔNG thể quản lý nhân viên
  - ✅ Quản lý sản phẩm
  - ✅ Quản lý khách hàng
  - ✅ Quản lý đơn hàng

## 5. Đăng nhập lại

Sau khi cấu hình database, hãy:

1. Đăng xuất khỏi ứng dụng
2. Đăng nhập lại với tài khoản supervisor
3. Truy cập "Quản lý nhân viên" để thêm/sửa/xóa nhân viên

**LƯU Ý:** Link "Quản lý nhân viên" chỉ hiển thị nếu đăng nhập bằng tài khoản supervisor.
