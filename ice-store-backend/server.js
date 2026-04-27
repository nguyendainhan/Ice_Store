require('dotenv').config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// Cấu hình upload ảnh
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// Serve static files
app.use(express.static(uploadDir));

// Kết nối MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: "+08:00",
  ssl: { rejectUnauthorized: false }
});

db.connect(err => {
  if (err) throw err;
  console.log("Connected to MySQL");
});

// === API sản phẩm ===
// Lấy tất cả sản phẩm đang bán (is_deleted = 0)
app.get("/products", (req, res) => {
  db.query("SELECT * FROM products WHERE is_deleted = 0", (err, result) => {
    if (err) return res.status(500).json({ message: "Lỗi lấy sản phẩm" });
    res.json(result);
  });
});

// Thêm sản phẩm mới
app.post("/products", upload.single("image"), (req, res) => {
  const { name, price } = req.body;
  const image = req.file ? `http://localhost:3000/${req.file.filename}` : "";
  
  if (!image) {
    return res.status(400).json({ message: "Vui lòng chọn ảnh" });
  }
  
  db.query(
    "INSERT INTO products (name, price, image) VALUES (?,?,?)",
    [name, price, image],
    (err, result) => {
      if (err) {
        console.error("Lỗi thêm sản phẩm:", err);
        return res.status(500).json({ message: "Lỗi thêm sản phẩm" });
      }
      res.json({ message: "Thêm sản phẩm thành công", id: result.insertId });
    }
  );
});

// Sửa sản phẩm
app.put("/products/:id", upload.single("image"), (req, res) => {
  const { id } = req.params;
  const { name, price } = req.body;
  
  // Nếu có upload ảnh mới, lưu path; nếu không, giữ ảnh cũ
  if (req.file) {
    const image = `http://localhost:3000/${req.file.filename}`;
    db.query(
      "UPDATE products SET name=?, price=?, image=? WHERE id=?",
      [name, price, image, id],
      (err) => {
        if (err) {
          console.error("Lỗi sửa sản phẩm:", err);
          return res.status(500).json({ message: "Lỗi sửa sản phẩm" });
        }
        res.json({ message: "Cập nhật sản phẩm thành công" });
      }
    );
  } else {
    // Chỉ cập nhật name và price, giữ image cũ
    db.query(
      "UPDATE products SET name=?, price=? WHERE id=?",
      [name, price, id],
      (err) => {
        if (err) {
          console.error("Lỗi sửa sản phẩm:", err);
          return res.status(500).json({ message: "Lỗi sửa sản phẩm" });
        }
        res.json({ message: "Cập nhật sản phẩm thành công" });
      }
    );
  }
});

// Xóa sản phẩm (Xóa mềm - Ẩn đi chứ không xóa thật)
app.delete("/products/:id", (req, res) => {
  const { id } = req.params;

  // 1. Chỉ xóa sản phẩm này khỏi giỏ hàng (carts) để khách không mua được nữa
  db.query("DELETE FROM carts WHERE product_id = ?", [id], (err) => {
    if (err) return res.status(500).json({ message: "Lỗi dọn dẹp giỏ hàng" });

    // 2. KHÔNG XÓA trong order_items. Chỉ CẬP NHẬT bảng products thành is_deleted = 1
    db.query("UPDATE products SET is_deleted = 1 WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json({ message: "Lỗi xóa sản phẩm" });
      res.json({ message: "Xóa sản phẩm thành công (Đã ẩn)" });
    });
  });
});

// API Lấy danh sách thùng rác
app.get("/products/trash", (req, res) => {
    db.query("SELECT * FROM products WHERE is_deleted = 1", (err, result) => {
        if (err) return res.status(500).json({ message: "Lỗi lấy thùng rác" });
        res.json(result);
    });
});

// API Khôi phục sản phẩm
app.put("/products/:id/restore", (req, res) => {
    const { id } = req.params;
    db.query("UPDATE products SET is_deleted = 0 WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi khôi phục sản phẩm" });
        res.json({ message: "Khôi phục sản phẩm thành công" });
    });
});

// === API Cảnh báo đơn hàng quá hạn (SLA) ===
app.get("/orders/overdue", (req, res) => {
    
    // Tính thời gian "30 phút trước" bằng chính Node.js để chuẩn múi giờ
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

    const query = `
        SELECT id FROM orders 
        WHERE (status = 'pending' OR status IS NULL) 
        AND created_at <= ?
    `;
    
    // Truyền biến thirtyMinsAgo vào dấu ?
    db.query(query, [thirtyMinsAgo], (err, results) => {
        if (err) {
            console.error("Lỗi lấy đơn quá hạn:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
        res.json({ overdueCount: results.length });
    });
});

// === API người dùng ===
// Đăng ký
app.post("/register", async (req, res) => {
    // Nhận thêm full_name, email, phone, address từ Vue gửi lên
    const { username, password, full_name, email, phone, address } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Vui lòng nhập đầy đủ username và password" });
    }

    try {
        db.query("SELECT id FROM users WHERE username = ?", [username], async (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi kiểm tra username" });
            
            if (results.length > 0) {
                return res.status(400).json({ message: "Username đã tồn tại" });
            }
            const hashedPassword = await bcrypt.hash(password, 10);

            const query = `
                INSERT INTO users (username, password, full_name, email, phone, address, role, is_supervisor) 
                VALUES (?, ?, ?, ?, ?, ?, 'customer', 0)
            `;
            
            const values = [username, hashedPassword, full_name || null, email || null, phone || null, address || null];

            db.query(query, values, (err, result) => {
                if (err) {
                    console.error("Lỗi đăng ký:", err);
                    return res.status(500).json({ message: "Lỗi tạo tài khoản" });
                }
                res.json({ message: "Đăng ký thành công!" });
            });
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi server" });
    }
});

// Đăng nhập
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Vui lòng nhập username và password" });

  db.query("SELECT id, username, password, role, is_supervisor FROM users WHERE username = ?", [username], async (err, result) => {
    if (err) return res.status(500).json({ message: "Lỗi server" });
    if (result.length === 0) return res.status(400).json({ message: "User not found" });

    const user = result[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Wrong password" });

    const token = jwt.sign({ id: user.id, role: user.role }, "SECRET_KEY");
    res.json({ 
      token, 
      role: user.role, 
      user_id: user.id, 
      username: user.username,
      is_supervisor: user.is_supervisor || 0
    });
  });
});

// === API Khôi phục mật khẩu (Quên mật khẩu) ===
app.post("/reset-password", async (req, res) => {
    const { username, email, new_password } = req.body;

    if (!username || !email || !new_password) {
        return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
    }

    // 1. CHÚ Ý: Lấy thêm cột 'role' từ database để kiểm tra
    db.query("SELECT id, role FROM users WHERE username = ? AND email = ?", [username, email], async (err, results) => {
        if (err) {
            console.error("Lỗi server:", err);
            return res.status(500).json({ message: "Lỗi kiểm tra thông tin" });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ message: "Username hoặc Email không chính xác!" });
        }

        const user = results[0];

        // 2. Chặn Admin và Staff
        if (user.role === 'admin' || user.role === 'staff') {
            return res.status(403).json({ 
                message: "Tài khoản nội bộ không được phép dùng chức năng này. Vui lòng liên hệ Super Admin!" 
            });
        }

        // 3. Nếu là customer thì cho phép đổi bình thường
        try {
            const hashedPassword = await bcrypt.hash(new_password, 10);
            
            db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, user.id], (err) => {
                if (err) return res.status(500).json({ message: "Lỗi cập nhật mật khẩu" });
                res.json({ message: "Khôi phục mật khẩu thành công!" });
            });
        } catch (error) {
            res.status(500).json({ message: "Lỗi mã hóa mật khẩu" });
        }
    });
});

// === Tạo đơn hàng ===
app.post("/orders", (req, res) => {
  const { user_id, items, total, delivery_address, phone_number } = req.body;
  
  // Lấy thời gian hiện tại ở múi giờ Taipei (UTC+8)
  const createdAt = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Taipei' });

  db.query(
    "INSERT INTO orders (user_id, total, created_at, delivery_address, phone_number) VALUES (?,?,?,?,?)",
    [user_id, total, createdAt, delivery_address, phone_number],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Lỗi tạo đơn hàng" });

      const orderId = result.insertId;

      items.forEach(item => {
        db.query(
          "INSERT INTO order_items (order_id, product_id, quantity) VALUES (?,?,?)",
          [orderId, item.product_id, item.quantity]
        );
      });

      res.json({ message: "Order created", orderId });
    }
  );
});

// Thêm hoặc cập nhật sản phẩm trong giỏ hàng
app.post("/cart", (req, res) => {
    const { user_id, product_id, quantity } = req.body;

    db.query(
        "INSERT INTO carts (user_id, product_id, quantity) VALUES (?,?,?) ON DUPLICATE KEY UPDATE quantity = quantity + ?",
        [user_id, product_id, quantity, quantity],
        (err) => {
            if (err) return res.status(500).json({ message: "Lỗi thêm giỏ hàng" });
            res.json({ message: "Thêm vào giỏ hàng thành công" });
        }
    );
});

// Lấy giỏ hàng theo user
app.get("/cart/:user_id", (req, res) => {
    const { user_id } = req.params;
    db.query(
        `SELECT c.id, c.quantity, p.id AS product_id, p.name, p.price, p.image
         FROM carts c
         JOIN products p ON c.product_id = p.id
         WHERE c.user_id = ?`,
        [user_id],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: "Lỗi lấy giỏ hàng" });
            }
            console.log("Cart items:", result); // <-- check log
            res.json(result);
        }
    );
});

// Xóa sản phẩm khỏi giỏ hàng
app.delete("/cart/:id", (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM carts WHERE id=?", [id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi xóa giỏ hàng" });
        res.json({ message: "Xóa thành công" });
    });
});

// --- 1. API Lấy thông tin User ---
app.get("/profile", (req, res) => {
    const { user_id } = req.headers;
    if (!user_id) return res.status(401).json({ message: "Chưa đăng nhập" });

    db.query("SELECT full_name, email, phone, address FROM users WHERE id = ?", [user_id], (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi server" });
        if (results.length === 0) return res.status(404).json({ message: "Không tìm thấy user" });
        res.json(results[0]);
    });
});

// --- 2. API Cập nhật thông tin User ---
app.put("/profile", (req, res) => {
    const { user_id } = req.headers;
    const { full_name, email, phone, address } = req.body;
    
    if (!user_id) return res.status(401).json({ message: "Chưa đăng nhập" });

    const query = "UPDATE users SET full_name = ?, email = ?, phone = ?, address = ? WHERE id = ?";
    db.query(query, [full_name, email, phone, address, user_id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi cập nhật thông tin" });
        res.json({ message: "Cập nhật thành công" });
    });
});

// --- 3. API Đổi mật khẩu ---
app.put("/change-password", async (req, res) => {
    const { user_id } = req.headers;
    const { old_password, new_password } = req.body;

    if (!user_id) return res.status(401).json({ message: "Chưa đăng nhập" });

    // Lấy mật khẩu cũ từ DB ra để so sánh
    db.query("SELECT password FROM users WHERE id = ?", [user_id], async (err, results) => {
        if (err || results.length === 0) return res.status(500).json({ message: "Lỗi hệ thống" });

        const user = results[0];
        // Dùng thư viện bcrypt (của bạn) để so khớp pass cũ
        const isMatch = await bcrypt.compare(old_password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });

        // Mã hóa pass mới và lưu lại
        const hashedNewPassword = await bcrypt.hash(new_password, 10);
        db.query("UPDATE users SET password = ? WHERE id = ?", [hashedNewPassword, user_id], (err) => {
            if (err) return res.status(500).json({ message: "Lỗi cập nhật mật khẩu" });
            res.json({ message: "Đổi mật khẩu thành công" });
        });
    });
});

// === API Quản lý khách hàng ===
// Lấy danh sách tất cả khách hàng
app.get("/customers", (req, res) => {
    // Thêm các cột dữ liệu mới vào câu lệnh SELECT
    db.query("SELECT id, username, full_name, email, phone, address, created_at FROM users WHERE role = 'customer' ORDER BY created_at DESC", (err, result) => {
        if (err) {
            console.error("Lỗi lấy danh sách khách hàng:", err);
            return res.status(500).json({ message: "Lỗi lấy danh sách khách hàng", error: err.message });
        }
        res.json(result);
    });
});

// Xóa khách hàng
app.delete("/customers/:id", (req, res) => {
    const { id } = req.params;
    
    console.log("Attempting to delete customer:", id);
    
    // Step 1: Get all order IDs for this customer
    db.query("SELECT id FROM orders WHERE user_id = ?", [id], (err, orderIds) => {
        if (err) {
            console.error("Lỗi lấy orders:", err);
            return res.status(500).json({ message: "Lỗi xóa khách hàng", error: err.message });
        }
        
        // Step 2: Delete order items for these orders
        if (orderIds.length > 0) {
            const ordersArray = orderIds.map(o => o.id);
            db.query("DELETE FROM order_items WHERE order_id IN (?)", [ordersArray], (err) => {
                if (err) {
                    console.error("Lỗi xóa order items:", err);
                    return res.status(500).json({ message: "Lỗi xóa khách hàng", error: err.message });
                }
                continueDelete();
            });
        } else {
            continueDelete();
        }
        
        function continueDelete() {
            // Step 3: Delete orders
            db.query("DELETE FROM orders WHERE user_id = ?", [id], (err) => {
                if (err) {
                    console.error("Lỗi xóa orders:", err);
                    return res.status(500).json({ message: "Lỗi xóa khách hàng", error: err.message });
                }
                
                // Step 4: Delete carts
                db.query("DELETE FROM carts WHERE user_id = ?", [id], (err) => {
                    if (err) {
                        console.error("Lỗi xóa carts:", err);
                        return res.status(500).json({ message: "Lỗi xóa khách hàng", error: err.message });
                    }
                    
                    // Step 5: Delete user
                    db.query("DELETE FROM users WHERE id = ? AND role = 'customer'", [id], (err, result) => {
                        if (err) {
                            console.error("Lỗi xóa user:", err);
                            return res.status(500).json({ message: "Lỗi xóa khách hàng", error: err.message });
                        }
                        if (result.affectedRows === 0) {
                            return res.status(404).json({ message: "Khách hàng không tồn tại" });
                        }
                        console.log("Xóa khách hàng " + id + " thành công");
                        res.json({ message: "Xóa khách hàng thành công" });
                    });
                });
            });
        }
    });
});

// === API Quản lý đơn hàng ===
// Lấy tất cả đơn hàng với thông tin khách hàng
app.get("/orders", (req, res) => {
    db.query(`
        SELECT 
            o.id, 
            o.user_id, 
            o.total, 
            o.created_at,
            COALESCE(o.status, 'pending') as status,
            o.delivery_address,
            o.phone_number,
            u.username
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
    `, (err, result) => {
        if (err) {
            console.error("Lỗi lấy danh sách đơn hàng:", err);
            return res.status(500).json({ message: "Lỗi lấy danh sách đơn hàng", error: err.message });
        }
        console.log("Danh sách đơn hàng:", result);
        res.json(result);
    });
});

// Lấy chi tiết đơn hàng (với danh sách sản phẩm)
app.get("/orders/:order_id", (req, res) => {
    const { order_id } = req.params;
    
    db.query(`
        SELECT 
            oi.id,
            oi.quantity,
            p.id AS product_id,
            p.name,
            p.price,
            p.image
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
    `, [order_id], (err, items) => {
        if (err) {
            console.error("Lỗi lấy chi tiết đơn hàng:", err);
            return res.status(500).json({ message: "Lỗi lấy chi tiết đơn hàng", error: err.message });
        }
        
        db.query(`
            SELECT 
                o.id,
                o.user_id,
                o.total,
                o.created_at,
                o.status,
                o.delivery_address,
                o.phone_number,
                u.username
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.id = ?
        `, [order_id], (err, orderData) => {
            if (err) {
                console.error("Lỗi lấy thông tin đơn hàng:", err);
                return res.status(500).json({ message: "Lỗi lấy thông tin đơn hàng", error: err.message });
            }
            
            if (orderData.length === 0) {
                return res.status(404).json({ message: "Đơn hàng không tồn tại" });
            }
            
            res.json({
                order: orderData[0],
                items: items
            });
        });
    });
});

// Xác nhận đơn hàng đã giao (cập nhật status)
app.put("/orders/:order_id/confirm", (req, res) => {
    const { order_id } = req.params;
    
    db.query("UPDATE orders SET status = 'awaiting_confirmation' WHERE id = ?", [order_id], (err, result) => {
        if (err) {
            console.error("Lỗi cập nhật đơn hàng:", err);
            return res.status(500).json({ message: "Lỗi cập nhật đơn hàng", error: err.message });
        }
        res.json({ message: "Đơn hàng chuyển sang chờ xác nhận" });
    });
});

// Khách hàng xác nhận đã nhận hàng (chuyển sang completed)
app.put("/orders/:order_id/confirm-received", (req, res) => {
    const { order_id } = req.params;
    
    db.query("UPDATE orders SET status = 'completed' WHERE id = ?", [order_id], (err, result) => {
        if (err) {
            console.error("Lỗi cập nhật đơn hàng:", err);
            return res.status(500).json({ message: "Lỗi cập nhật đơn hàng", error: err.message });
        }
        res.json({ message: "Cảm ơn bạn đã xác nhận nhận hàng" });
    });
});

// === QUẢN LÝ NHÂN VIÊN ===

// Lấy danh sách nhân viên
app.get("/members", (req, res) => {
    const { user_id } = req.headers;
    
    // Kiểm tra user có quyền supervisor không
    if (!user_id) {
        return res.status(401).json({ message: "Yêu cầu user_id" });
    }
    
    db.query("SELECT is_supervisor FROM users WHERE id = ?", [user_id], (err, results) => {
        if (err || !results.length || !results[0].is_supervisor) {
            return res.status(403).json({ message: "Bạn không có quyền quản lý nhân viên" });
        }
        
        db.query("SELECT id, username, email, role, is_supervisor, created_at FROM users WHERE role IN ('admin', 'staff') ORDER BY id DESC", (err, staffResults) => {
            if (err) {
                console.error("Lỗi lấy danh sách nhân viên:", err);
                return res.status(500).json({ message: "Lỗi lấy danh sách nhân viên" });
            }
            res.json(staffResults);
        });
    });
});

// Tạo nhân viên mới
app.post("/members", async (req, res) => {
    const { username, email, password, role } = req.body;
    const { user_id } = req.headers;
    
    // Kiểm tra supervisor role
    if (!user_id) {
        return res.status(401).json({ message: "Yêu cầu user_id" });
    }
    
    db.query("SELECT is_supervisor FROM users WHERE id = ?", [user_id], async (err, results) => {
        if (err || !results.length || !results[0].is_supervisor) {
            return res.status(403).json({ message: "Bạn không có quyền quản lý nhân viên" });
        }
        
        if (!username || !password) {
            return res.status(400).json({ message: "Vui lòng nhập username và mật khẩu" });
        }

        // Kiểm tra username tồn tại
        db.query("SELECT id FROM users WHERE username = ?", [username], async (err, checkResults) => {
            if (err) {
                console.error("Lỗi kiểm tra username:", err);
                return res.status(500).json({ message: "Lỗi kiểm tra username" });
            }

            if (checkResults.length > 0) {
                return res.status(400).json({ message: "Username đã tồn tại" });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            const query = "INSERT INTO users (username, email, password, role, is_supervisor, created_at) VALUES (?, ?, ?, ?, 0, NOW())";
            db.query(query, [username, email || null, hashedPassword, role || 'staff'], (err, result) => {
                if (err) {
                    console.error("Lỗi tạo nhân viên:", err);
                    return res.status(500).json({ message: "Lỗi tạo nhân viên" });
                }
                res.json({ message: "Tạo nhân viên thành công", memberId: result.insertId });
            });
        });
    });
});

// Cập nhật nhân viên
app.put("/members/:id", async (req, res) => {
    const { id } = req.params;
    const { email, role, password } = req.body;
    const { user_id } = req.headers;
    
    // Kiểm tra supervisor role
    if (!user_id) {
        return res.status(401).json({ message: "Yêu cầu user_id" });
    }
    
    db.query("SELECT is_supervisor FROM users WHERE id = ?", [user_id], async (err, results) => {
        if (err || !results.length || !results[0].is_supervisor) {
            return res.status(403).json({ message: "Bạn không có quyền quản lý nhân viên" });
        }
        
        let query = "UPDATE users SET email = ?, role = ?";
        const params = [email || null, role || 'staff', id];

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query = "UPDATE users SET email = ?, role = ?, password = ?";
            params.splice(2, 0, hashedPassword);
        }

        query += " WHERE id = ?";

        db.query(query, params, (err, result) => {
            if (err) {
                console.error("Lỗi cập nhật nhân viên:", err);
                return res.status(500).json({ message: "Lỗi cập nhật nhân viên" });
            }
            res.json({ message: "Cập nhật nhân viên thành công" });
        });
    });
});

// Xóa nhân viên
app.delete("/members/:id", (req, res) => {
    const { id } = req.params;
    const { user_id } = req.headers;
    
    // Kiểm tra supervisor role
    if (!user_id) {
        return res.status(401).json({ message: "Yêu cầu user_id" });
    }
    
    db.query("SELECT is_supervisor FROM users WHERE id = ?", [user_id], (err, results) => {
        if (err || !results.length || !results[0].is_supervisor) {
            return res.status(403).json({ message: "Bạn không có quyền quản lý nhân viên" });
        }
        
        deleteStaffMember(res, id);
    });
});

// Hàm helper xóa nhân viên (dùng chung)
function deleteStaffMember(res, id) {

    // Kiểm tra xem nhân viên này có đơn hàng không
    db.query("SELECT COUNT(*) as count FROM orders WHERE user_id = ?", [id], (err, results) => {
        if (err) {
            console.error("Lỗi kiểm tra đơn hàng:", err);
            return res.status(500).json({ message: "Lỗi kiểm tra đơn hàng" });
        }

        const orderCount = results[0].count;

        if (orderCount > 0) {
            // Xóa tất cả order_items liên quan
            db.query("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)", [id], (err) => {
                if (err) {
                    console.error("Lỗi xóa order_items:", err);
                    return res.status(500).json({ message: "Lỗi xóa dữ liệu liên quan" });
                }

                // Xóa tất cả orders
                db.query("DELETE FROM orders WHERE user_id = ?", [id], (err) => {
                    if (err) {
                        console.error("Lỗi xóa orders:", err);
                        return res.status(500).json({ message: "Lỗi xóa dữ liệu liên quan" });
                    }

                    // Xóa cart items
                    db.query("DELETE FROM carts WHERE user_id = ?", [id], (err) => {
                        if (err) {
                            console.error("Lỗi xóa carts:", err);
                            return res.status(500).json({ message: "Lỗi xóa dữ liệu liên quan" });
                        }

                        // Xóa user
                        db.query("DELETE FROM users WHERE id = ?", [id], (err) => {
                            if (err) {
                                console.error("Lỗi xóa nhân viên:", err);
                                return res.status(500).json({ message: "Lỗi xóa nhân viên" });
                            }
                            res.json({ message: "Xóa nhân viên thành công" });
                        });
                    });
                });
            });
        } else {
            // Không có đơn hàng, xóa luôn
            db.query("DELETE FROM carts WHERE user_id = ?", [id], (err) => {
                if (err) {
                    console.error("Lỗi xóa carts:", err);
                    return res.status(500).json({ message: "Lỗi xóa dữ liệu liên quan" });
                }

                db.query("DELETE FROM users WHERE id = ?", [id], (err) => {
                    if (err) {
                        console.error("Lỗi xóa nhân viên:", err);
                        return res.status(500).json({ message: "Lỗi xóa nhân viên" });
                    }
                    res.json({ message: "Xóa nhân viên thành công" });
                });
            });
        }
    });
}

// === Chạy server ===
const PORT = process.env.PORT || 3000; 
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});