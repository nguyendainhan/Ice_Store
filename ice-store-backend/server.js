require('dotenv').config();
const express = require("express");
const mysql = require("mysql2");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const aiRoutes = require('./ai');
const serverUrl = process.env.RENDER_EXTERNAL_URL || "http://localhost:3000";

const app = express();

const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({
    origin: clientUrl, 
    credentials: true  
}));

app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('⚠️ Lỗi xác minh chữ ký Stripe Webhook:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const orderId = session.metadata.order_id; 
        console.log(`✅ Webhook báo về: Đơn hàng #${orderId} đã thanh toán qua Stripe!`);
        
        // BẮT ĐẦU TRANSACTION BẢO VỆ DATABASE
        const promiseDb = db.promise();
        
        try {
            await promiseDb.beginTransaction();

            // 1. Cập nhật trạng thái đơn hàng
            const [updateResult] = await promiseDb.query("UPDATE orders SET status = 'pending' WHERE id = ?", [orderId]);
            if (updateResult.affectedRows === 0) throw new Error("OrderNotFound");

            // Lấy thông tin đơn hàng để tính toán các bước sau
            const [orders] = await promiseDb.query("SELECT * FROM orders WHERE id = ?", [orderId]);
            const order = orders[0];

            // 2. Trừ tồn kho sản phẩm
            const [items] = await promiseDb.query("SELECT product_id, quantity FROM order_items WHERE order_id = ?", [orderId]);
            for (let item of items) {
                await promiseDb.query("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, item.product_id]);
            }

            // 3. Cộng điểm chi tiêu
            await promiseDb.query("UPDATE users SET total_spent = total_spent + ? WHERE id = ?", [order.total, order.user_id]);

            // 4. Cộng dồn lượt sử dụng Voucher (nếu có)
            if (order.voucher_code) {
                await promiseDb.query("UPDATE vouchers SET used_count = used_count + 1 WHERE code = ?", [order.voucher_code]);
            }

            // MỌI THỨ HOÀN HẢO -> LƯU VÀO DB
            await promiseDb.commit();

            // --- CÁC TÁC VỤ PHỤ BÊN NGOÀI DATABASE (Chạy sau khi commit) ---
            io.emit("new_order_alert", { orderId: orderId, total: order.total });
            checkAndUpdateUserTier(order.user_id);

            // 5. Gửi Email thông báo thành công
            const [users] = await promiseDb.query("SELECT email, full_name, username FROM users WHERE id = ?", [order.user_id]);
            if (users.length > 0 && users[0].email) {
                const userEmail = users[0].email;
                const customerName = users[0].full_name || users[0].username; 

                const mailOptions = {
                    from: `"Cửa hàng IceStore" <${process.env.EMAIL_USER}>`,
                    to: userEmail,
                    subject: `🎉 Xác nhận thanh toán Online Đơn #${orderId} - IceStore`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                            <div style="background-color: #1e293b; padding: 20px; text-align: center;">
                                <h1 style="margin: 0; color: #38bdf8; font-size: 28px; letter-spacing: 1px;">IceStore</h1>
                            </div>
                            <div style="padding: 30px; background-color: #ffffff;">
                                <h2 style="color: #0f172a; margin-top: 0;">Xin chào ${customerName}!</h2>
                                <p style="color: #475569; font-size: 16px; line-height: 1.6;">Cảm ơn bạn đã thanh toán thành công qua thẻ. Đơn hàng của bạn đã được hệ thống ghi nhận và đang trong quá trình xử lý để giao đến bạn.</p>
                                
                                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin: 25px 0;">
                                    <h3 style="margin-top: 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Thông tin đơn hàng #${orderId}</h3>
                                    <p style="margin: 10px 0; color: #334155;"><strong>📍 Giao đến:</strong> ${order.delivery_address}</p>
                                    <p style="margin: 10px 0; color: #334155;"><strong>📞 Số điện thoại:</strong> ${order.phone_number}</p>
                                    <p style="margin: 10px 0; color: #334155;"><strong>🕒 Thời gian đặt:</strong> ${new Date(order.created_at).toLocaleString('vi-VN')}</p>
                                    <p style="margin: 10px 0; color: #10b981;"><strong>🎟️ Mã áp dụng:</strong> ${order.voucher_code || 'Không có'}</p>
                                    <p style="margin: 10px 0; color: #6366f1;"><strong>💳 Phương thức:</strong> Thanh toán Online (Stripe)</p>
                                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #cbd5e1;">
                                        <p style="margin: 0; font-size: 18px; color: #1e293b;"><strong>Đã thanh toán:</strong> <span style="color: #dc2626; font-size: 22px; font-weight: bold; float: right;">${Number(order.total).toLocaleString('vi-VN')} VND</span></p>
                                    </div>
                                </div>
                                
                                <p style="color: #475569; font-size: 15px;">Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất để xác nhận thời gian giao hàng.</p>
                                <p style="color: #475569; font-size: 15px; margin-bottom: 0;">Trân trọng,<br><strong style="color: #1e293b;">Đội ngũ IceStore</strong></p>
                            </div>
                        </div>
                    `
                };

                transporter.sendMail(mailOptions, (error) => {
                    if (error) console.error("Lỗi gửi email Nodemailer:", error);
                    else console.log("Đã gửi email hóa đơn thành công đến:", userEmail);
                });
            }

        } catch (dbError) {
            await promiseDb.rollback();
            console.error("🚨 Lỗi Transaction khi xử lý Webhook Stripe:", dbError);
            return res.status(500).json({ error: 'Lỗi ghi nhận cơ sở dữ liệu' });
        }
    }

    res.status(200).json({ received: true });
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// === CẤU HÌNH SOCKET.IO (MỚI THÊM) ===
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");

const io = new Server(server, {
    cors: {
        origin: clientUrl, // Chặn mọi Frontend lạ kết nối Socket
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

app.use('/api', aiRoutes);

io.on("connection", (socket) => {
    console.log("⚡ Có thiết bị vừa kết nối Socket: " + socket.id);
    
    socket.on("join_chat", (userId) => {
        const roomName = `chat_room_${userId}`;
        socket.join(roomName);
        console.log(`Socket ${socket.id} đã tham gia phòng: ${roomName}`);
    });

    socket.on("send_message", (data) => {
        const { user_id, sender_id, message } = data;
        const now = new Date();
        
        db.query(
            "INSERT INTO chat_messages (user_id, sender_id, message, created_at) VALUES (?, ?, ?, ?)",
            [user_id, sender_id, message, now],
            (err, result) => {
                if (err) return console.error("Lỗi lưu tin nhắn vào DB:", err);
                
                const newMessage = {
                    id: result.insertId,
                    user_id,
                    sender_id,
                    message,
                    created_at: now.toISOString()
                };
                io.to(`chat_room_${user_id}`).emit("receive_message", newMessage);                
                io.emit("admin_new_message_alert", { user_id, message });
            }
        );
    });

    // Code cũ của bạn (nếu có) có thể nằm dưới này...
    socket.on("disconnect", () => {
        console.log("NGƯỜI DÙNG ĐÃ NGẮT KẾT NỐI:", socket.id);
    });
});

// HÀM GÁC CỔNG (MIDDLEWARE) BẢO VỆ API
const verifyToken = (req, res, next) => {
    // 1. Lấy token từ request do Frontend gửi lên
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Bạn chưa đăng nhập hoặc thiếu Token!" });
    }

    // 2. Kiểm tra xem Token có đúng là do hệ thống mình tạo ra không
    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).json({ message: "Phiên đăng nhập đã hết hạn!" });
        
        req.user = decoded; // Lưu lại thông tin user (id, role) để dùng cho các API sau

        // 3. TÍNH NĂNG "ĐÁ" THIẾT BỊ CŨ (Chỉ áp dụng Admin/Staff)
        if (req.user.role === 'admin' || req.user.role === 'staff') {
            db.query("SELECT current_token FROM users WHERE id = ?", [req.user.id], (dbErr, result) => {
                if (dbErr || result.length === 0) return res.status(500).json({ message: "Lỗi xác thực cơ sở dữ liệu" });
                
                // So sánh token gửi lên với token mới nhất trong DB
                if (result[0].current_token !== token) {
                    return res.status(401).json({ 
                        message: "Tài khoản của bạn vừa được đăng nhập ở một thiết bị khác!",
                        force_logout: true 
                    });
                }
                next(); // Token khớp -> Cho phép đi qua cổng!
            });
        } else {
            // Nếu là Khách hàng bình thường thì cho qua luôn
            next();
        }
    });
};

const verifyAdmin = (req, res, next) => {
    // req.user đã được giải mã từ hàm verifyToken chạy trước đó
    if (req.user && req.user.role === 'admin') {
        next(); // Khớp role Admin -> Cho phép đi tiếp
    } else {
        return res.status(403).json({ message: "Cảnh báo: Bạn không có quyền quản trị trị hệ thống!" });
    }
};

// HÀM GÁC CỔNG DÀNH CHO CẢ ADMIN VÀ NHÂN VIÊN (STAFF)
const verifyStaffOrAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'staff')) {
        next();
    } else {
        return res.status(403).json({ message: "Cảnh báo: Chỉ nhân viên nội bộ mới được truy cập!" });
    }
};

// Cấu hình upload ảnh
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Khởi tạo dịch vụ Bưu điện (Transporter)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// 2. Hàm gửi email chúc mừng
const sendGoldVipEmail = (userEmail, fullName) => {
    const mailOptions = {
        from: '"Hệ thống IceStore" <nguyendainhan001@gmail.com>',
        to: userEmail,
        subject: '🎉 CHÚC MỪNG BẠN ĐÃ THĂNG HẠNG VIP VÀNG TẠI ICESTORE!',
        html: `
            <div style="font-family: Arial; padding: 20px; background: #f8fafc; border-radius: 10px;">
                <h2 style="color: #d97706;">Chào ${fullName},</h2>
                <p>Hệ thống ghi nhận bạn vừa hoàn thành một đơn hàng mới. Chúc mừng bạn đã chính thức trở thành <strong>Khách hàng VIP Vàng (Gold)</strong> của IceStore!</p>
                <p>Đẳng cấp VIP Vàng mang đến cho bạn những đặc quyền Voucher giảm giá cực sốc chỉ dành riêng cho giới tinh hoa.</p>
                <p>Cảm ơn bạn đã luôn tin tưởng và đồng hành cùng IceStore!</p>
            </div>
        `
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if(err) console.log("Lỗi gửi email VIP:", err);
        else console.log("Đã gửi email VIP Gold thành công tới:", userEmail);
    });
};

// Cấu hình thông tin Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

// Thiết lập nơi lưu trữ trên Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ice_store_products', // Tên thư mục trên Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage: storage });

// Kết nối MySQL
// Thay thế đoạn db.connect cũ bằng đoạn này
const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    timezone: "+08:00",
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,     
    queueLimit: 0
});

db.getConnection((err, connection) => {
    if (err) {
        console.error("🚨 Lỗi kết nối MySQL Pool:", err);
    } else {
        console.log("✅ Đã kết nối thành công tới MySQL qua Pool!");
        connection.release(); 
    }
});
// API DANH MỤC SẢN PHẨM 
app.get("/categories", (req, res) => {
    db.query("SELECT * FROM categories", (err, result) => {
        if (err) {
            console.error("Lỗi lấy danh mục:", err);
            return res.status(500).json({ message: "Lỗi hệ thống" });
        }
        res.json(result);
    });
});

app.post("/categories", verifyToken, (req, res) => {
    const { name } = req.body;
    db.query("INSERT INTO categories (name) VALUES (?)", [name], (err, result) => {
        if (err) return res.status(500).json({ message: "Lỗi thêm danh mục" });
        res.json({ message: "Thêm thành công", id: result.insertId });
    });
});

// Xóa danh mục
app.delete("/categories/:id", verifyToken, (req, res) => {
    const { id } = req.params;

    // Bước 1: Chuyển tất cả sản phẩm thuộc danh mục này thành "Chưa phân loại" (category_id = NULL)
    db.query("UPDATE products SET category_id = NULL WHERE category_id = ?", [id], (err) => {
        if (err) {
            console.error("Lỗi cập nhật sản phẩm khi xóa danh mục:", err);
            return res.status(500).json({ message: "Lỗi hệ thống" });
        }

        // Bước 2: Tiến hành xóa danh mục
        db.query("DELETE FROM categories WHERE id = ?", [id], (err) => {
            if (err) return res.status(500).json({ message: "Lỗi xóa danh mục" });
            res.json({ message: "Xóa danh mục thành công" });
        });
    });
});

// === API SẢN PHẨM ===
app.get("/products", (req, res) => {
    const category_id = req.query.category_id;
    
    let query = "SELECT * FROM products WHERE is_deleted = 0";
    let params = [];

    // Lọc theo category_id nếu có gửi lên từ Front-end
    if (category_id) {
        query += " AND category_id = ?";
        params.push(category_id);
    }

    query += " ORDER BY id DESC"; // Mới nhất lên đầu

    db.query(query, params, (err, result) => {
        if (err) return res.status(500).json({ message: "Lỗi lấy sản phẩm" });
        res.json(result);
    });
});

// Thêm sản phẩm mới
app.post("/products", verifyToken, upload.single("image"), (req, res) => {
    const { name, price, category_id, stock, import_price } = req.body; 
    const image = req.file ? req.file.path : ""; 
    
    if (!image) {
        return res.status(400).json({ message: "Vui lòng chọn ảnh" });
    }
  
  // CHÈN THÊM import_price VÀO CÂU LỆNH SQL
    db.query(
        "INSERT INTO products (name, price, image, category_id, stock, import_price) VALUES (?,?,?,?,?,?)",
        [name, price, image, category_id || null, stock || 0, import_price || 0],
        (err, result) => {
        if (err) {
            console.error("Lỗi thêm sản phẩm:", err);
            return res.status(500).json({ message: "Lỗi thêm sản phẩm" });
        }
        io.emit("product_updated", { id: result.insertId, name, price, image, category_id, stock, import_price });
        res.json({ message: "Thêm sản phẩm thành công", id: result.insertId, imageUrl: image });
        }
    );
});

// Sửa sản phẩm
app.put("/products/:id", verifyToken, upload.single("image"), (req, res) => {
  const { id } = req.params;
  const { name, price, category_id, stock, import_price } = req.body; 
  
  if (req.file) {
    const image = req.file.path; 
    db.query(
      "UPDATE products SET name=?, price=?, image=?, category_id=?, stock=?, import_price=? WHERE id=?",
      [name, price, image, category_id || null, stock || 0, import_price || 0, id],
      (err) => {
        if (err) {
          console.error("Lỗi sửa sản phẩm:", err);
          return res.status(500).json({ message: "Lỗi sửa sản phẩm" });
        }
        io.emit("product_updated", { id, name, price, image, category_id, stock, import_price });
        res.json({ message: "Cập nhật sản phẩm thành công", imageUrl: image });
      }
    );
  } else {
    db.query(
      "UPDATE products SET name=?, price=?, category_id=?, stock=?, import_price=? WHERE id=?",
      [name, price, category_id || null, stock || 0, import_price || 0, id],
      (err) => {
        if (err) {
          console.error("Lỗi sửa sản phẩm:", err);
          return res.status(500).json({ message: "Lỗi sửa sản phẩm" });
        }
        io.emit("product_updated", { id, name, price, category_id, stock, import_price });
        res.json({ message: "Cập nhật thông tin thành công" });
      }
    );
  }
});

// Xóa sản phẩm
app.delete("/products/:id", verifyToken, (req, res) => {
  const { id } = req.params;

  // 1. Chỉ xóa sản phẩm này khỏi giỏ hàng (carts) để khách không mua được nữa
  db.query("DELETE FROM carts WHERE product_id = ?", [id], (err) => {
    if (err) return res.status(500).json({ message: "Lỗi dọn dẹp giỏ hàng" });

    // 2. KHÔNG XÓA trong order_items. Chỉ CẬP NHẬT bảng products thành is_deleted = 1
    db.query("UPDATE products SET is_deleted = 1 WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json({ message: "Lỗi xóa sản phẩm" });
      io.emit("product_deleted", { id });
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
app.put("/products/:id/restore", verifyToken, (req, res) => {
    const { id } = req.params;
    db.query("UPDATE products SET is_deleted = 0 WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi khôi phục sản phẩm" });
        res.json({ message: "Khôi phục sản phẩm thành công" });
    });
});

// === API Cảnh báo đơn hàng quá hạn (SLA) ===
app.get("/orders/overdue", verifyToken, (req, res) => {
    
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
    const { username, password, full_name, email, phone, address } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Vui lòng nhập đầy đủ username và password" });
    }

    try {
        let checkQuery = "SELECT username, email, phone FROM users WHERE username = ?";
        let queryParams = [username];

        if (email) {
            checkQuery += " OR email = ?";
            queryParams.push(email);
        }
        if (phone) {
            checkQuery += " OR phone = ?";
            queryParams.push(phone);
        }

        db.query(checkQuery, queryParams, async (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi kiểm tra dữ liệu tồn tại" });
            
            if (results.length > 0) {
                for (let row of results) {
                    if (row.username === username) {
                        return res.status(400).json({ message: "Tên đăng nhập (Username) đã tồn tại!" });
                    }
                    if (email && row.email === email) {
                        return res.status(400).json({ message: "Email này đã được sử dụng!" });
                    }
                    if (phone && row.phone === phone) {
                        return res.status(400).json({ message: "Số điện thoại này đã được đăng ký!" });
                    }
                }
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const insertQuery = `
                INSERT INTO users (username, password, full_name, email, phone, address, role, is_supervisor) 
                VALUES (?, ?, ?, ?, ?, ?, 'customer', 0)
            `;
            
            const values = [username, hashedPassword, full_name || null, email || null, phone || null, address || null];

            db.query(insertQuery, values, (err, result) => {
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

    // Tạo token mới cho lần đăng nhập này
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.SECRET_KEY);

    const responseData = { 
      token, 
      role: user.role, 
      user_id: user.id, 
      username: user.username,
      is_supervisor: user.is_supervisor || 0
    };

    // NẾU LÀ ADMIN HOẶC STAFF -> LƯU TOKEN VÀO DATABASE ĐỂ CHẶN MÁY CŨ
    if (user.role === 'admin' || user.role === 'staff') {
      db.query("UPDATE users SET current_token = ? WHERE id = ?", [token, user.id], (updateErr) => {
        if (updateErr) return res.status(500).json({ message: "Lỗi hệ thống khi cập nhật phiên đăng nhập" });
        return res.json(responseData);
      });
    } 
    // NẾU LÀ KHÁCH HÀNG -> CHO QUA LUÔN, KHÔNG CẦN CHẶN
    else {
      return res.json(responseData);
    }
  });
});

// === API Khôi phục mật khẩu (Quên mật khẩu) ===
app.post("/reset-password", async (req, res) => {
    const { username, email, new_password } = req.body;

    if (!username || !email || !new_password) {
        return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
    }

    // Lấy thêm cột 'role' từ database để kiểm tra
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

// API STRIPE: TẠO PHIÊN THANH TOÁN 
app.post("/create-checkout-session", verifyToken, async (req, res) => {
    try {
        const { items, order_id } = req.body;

        const lineItems = items.map((item) => ({
            price_data: {
                currency: "vnd", 
                product_data: {
                    name: item.name, 
                },
                unit_amount: Math.round(Number(item.price)),
            },
            quantity: item.quantity,
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"], 
            line_items: lineItems,
            mode: "payment", 
            metadata: {
                order_id: order_id // Gửi order_id để Stripe trả lại qua Webhook
            },
            // Nếu khách xẹt thẻ thành công, đẩy về trang này:
            success_url: `${clientUrl}/payment-success?order_id=${order_id}`,
            cancel_url: `${clientUrl}/cart?canceled=true&order_id=${order_id}`,
        });

        res.json({ url: session.url });

    } catch (error) {
        console.error("Lỗi tạo Stripe Session:", error);
        res.status(500).json({ error: "Không thể tạo phiên thanh toán" });
    }
});

// API: Xóa đơn hàng (Dùng khi khách hủy thanh toán Stripe)
app.delete("/orders/:id", (req, res) => {
    const orderId = req.params.id;

    db.query("DELETE FROM order_items WHERE order_id = ?", [orderId], (err1, result1) => {
        if (err1) {
            console.error("🚨 Lỗi xóa order_items:", err1);
            return res.status(500).json({ error: "Lỗi xóa chi tiết đơn" });
        }

        db.query("DELETE FROM orders WHERE id = ?", [orderId], (err2, result2) => {
            if (err2) {
                console.error("🚨 Lỗi xóa orders:", err2);
                return res.status(500).json({ error: "Lỗi xóa vỏ đơn hàng" });
            }

            console.log(`🗑️ Đã hủy thành công đơn hàng #${orderId} do khách quay xe!`);
            res.json({ message: "Đã hủy đơn hàng tạm thành công" });
        });
    });
});

// Lấy danh sách các khách hàng đã từng nhắn tin
app.get("/admin/chats", verifyToken, verifyAdmin, (req, res) => {
    // Lấy danh sách khách hàng, sắp xếp theo ai nhắn gần nhất thì lên đầu
    const query = `
        SELECT u.id, u.full_name, u.username, u.avatar, MAX(c.created_at) as last_msg_time,
               SUM(CASE WHEN c.is_read = 0 AND c.sender_id = u.id THEN 1 ELSE 0 END) as unread_count
        FROM chat_messages c
        JOIN users u ON c.user_id = u.id
        GROUP BY u.id
        ORDER BY last_msg_time DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Lỗi lấy danh sách chat cho admin:", err);
            return res.status(500).json({ message: "Lỗi hệ thống" });
        }
        res.json(results);
    });
});

app.get("/chats/unread-count", async (req, res) => {
    try {
        const sql = `
            SELECT COUNT(*) AS count 
            FROM chat_messages 
            WHERE is_read = 0 AND sender_id = user_id
        `;

        db.query(sql, (err, result) => {
            if (err) {
                console.error("Lỗi đếm tin nhắn:", err);
                return res.status(500).json({ message: "Lỗi câu lệnh SQL" });
            }
            
            res.json({ count: result[0].count });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi server" });
    }
});

app.put("/chats/mark-read/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;

        const sql = `
            UPDATE chat_messages 
            SET is_read = 1 
            WHERE user_id = ? AND sender_id = ? AND is_read = 0
        `;

        db.query(sql, [userId, userId], (err, result) => {
            if (err) {
                console.error("Lỗi cập nhật trạng thái đã đọc:", err);
                return res.status(500).json({ message: "Lỗi câu lệnh SQL" });
            }
            
            res.json({ message: "Đã cập nhật trạng thái", updatedRows: result.affectedRows });
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi server" });
    }
});

// API Cập nhật ảnh đại diện
app.put("/profile/avatar", verifyToken, upload.single("avatar"), (req, res) => {
    const user_id = req.user.id; // Lấy ID người dùng từ token

    if (!user_id) return res.status(401).json({ message: "Chưa đăng nhập" });
    if (!req.file) return res.status(400).json({ message: "Vui lòng chọn ảnh" });

    // Link ảnh xịn từ Cloudinary
    const avatarUrl = req.file.path;

    // Cập nhật vào bảng users
    const query = "UPDATE users SET avatar = ? WHERE id = ?";
    db.query(query, [avatarUrl, user_id], (err) => {
        if (err) {
            console.error("Lỗi cập nhật avatar:", err);
            return res.status(500).json({ message: "Lỗi hệ thống" });
        }
        res.json({ 
            message: "Cập nhật ảnh đại diện thành công!", 
            avatarUrl: avatarUrl 
        });
    });
});

function checkAndUpdateUserTier(userId) {
    db.query("SELECT total_spent, tier, email, full_name FROM users WHERE id = ?", [userId], (err, results) => {
        if (err || results.length === 0) return;
        
        const user = results[0];
        const spent = user.total_spent;
        const oldTier = user.tier || 'normal';
        let newTier = 'normal';
        
        if (spent >= 50000000) {
            newTier = 'gold';      
        } else if (spent >= 20000000) {
            newTier = 'silver';
        } else if (spent >= 5000000) {
            newTier = 'bronze'; 
        }

        if (oldTier !== newTier) {
            db.query("UPDATE users SET tier = ? WHERE id = ?", [newTier, userId], (err2) => {
                if (err2) {
                    console.error("Lỗi cập nhật hạng:", err2);
                } else {
                    console.log(`User #${userId} vừa thăng hạng từ ${oldTier.toUpperCase()} lên ${newTier.toUpperCase()}`);
                    
                    if (newTier === 'gold') {
                        sendGoldVipEmail(user.email, user.full_name);
                    }
                }
            });
        }
    });
}

// Api lấy lịch sử chat
app.get("/chat/:user_id", verifyToken, (req, res) => {
    const userId = req.params.user_id;
    
    const query = `
        SELECT * FROM chat_messages 
        WHERE user_id = ? 
        ORDER BY created_at ASC
    `; // ASC để tin nhắn cũ ở trên, mới ở dưới

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error("Lỗi lấy lịch sử chat:", err);
            return res.status(500).json({ message: "Lỗi hệ thống" });
        }
        res.json(results);
    });
});

// TẠO ĐƠN HÀNG MỚI (Đã áp dụng Transaction & Async/Await)
app.post("/orders", verifyToken, async (req, res) => {
    const { user_id, items, total, delivery_address, phone_number, voucher_code, payment_method } = req.body;
    const createdAt = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Taipei' });
    const initialStatus = (payment_method === 'STRIPE') ? 'unpaid' : 'pending';

    const promiseDb = db.promise();

    try {
        await promiseDb.beginTransaction();

        const [orderResult] = await promiseDb.query(
            "INSERT INTO orders (user_id, total, created_at, delivery_address, phone_number, voucher_code, status) VALUES (?,?,?,?,?,?,?)",
            [user_id, total, createdAt, delivery_address, phone_number, voucher_code, initialStatus]
        );
        const orderId = orderResult.insertId;

        for (let item of items) {
            await promiseDb.query(
                "INSERT INTO order_items (order_id, product_id, quantity) VALUES (?,?,?)",
                [orderId, item.product_id, item.quantity]
            );
        }

        if (payment_method === 'STRIPE') {
            await promiseDb.commit(); // Xác nhận lưu đơn tạm
            return res.json({ message: "Đã tạo đơn tạm thời cho Stripe", orderId });
        }

        for (let item of items) {
            await promiseDb.query(
                "UPDATE products SET stock = stock - ? WHERE id = ?",
                [item.quantity, item.product_id]
            );
        }

        await promiseDb.query(
            "UPDATE users SET total_spent = total_spent + ? WHERE id = ?",
            [total, user_id]
        );

        if (voucher_code) {
            await promiseDb.query(
                "UPDATE vouchers SET used_count = used_count + 1 WHERE code = ?",
                [voucher_code]
            );
        }

        await promiseDb.commit();

        io.emit("new_order_alert", { orderId: orderId, total: total });
        checkAndUpdateUserTier(user_id); 

        db.query("SELECT email, full_name, username FROM users WHERE id = ?", [user_id], (err, users) => {
            if (!err && users.length > 0 && users[0].email) {
                const userEmail = users[0].email;
                const customerName = users[0].full_name || users[0].username; 
                const mailOptions = {
                    from: `"Cửa hàng IceStore" <${process.env.EMAIL_USER}>`,
                    to: userEmail,
                    subject: `🎉 Xác nhận đơn hàng #${orderId} - IceStore`,
                    html: `<h3>Xin chào ${customerName}, đơn hàng #${orderId} trị giá ${Number(total).toLocaleString('vi-VN')} VND đã được đặt thành công!</h3>` // (Bạn dán lại phần HTML đẹp của bạn vào đây nhé)
                };
                transporter.sendMail(mailOptions, (error) => {
                    if (error) console.error("Lỗi gửi email Nodemailer:", error);
                });
            }
        });

        res.json({ message: "Order created", orderId });

    } catch (error) {
        // 8. CÓ LỖI XẢY RA -> QUAY XE (ROLLBACK) HỦY BỎ MỌI THAY ĐỔI
        await promiseDb.rollback();
        console.error("🚨 Lỗi Transaction khi tạo đơn hàng:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi tạo đơn hàng, đã hoàn tác!" });
    }
});

// API: KHÁCH HÀNG TỰ HỦY ĐƠN HÀNG (Đã nâng cấp Transaction)
app.put("/orders/:id/cancel", async (req, res) => {
    const orderId = req.params.id;
    const promiseDb = db.promise();

    try {
        await promiseDb.beginTransaction(); // 1. Bắt đầu giao dịch

        // 2. Lấy thông tin đơn hàng
        const [orders] = await promiseDb.query("SELECT * FROM orders WHERE id = ?", [orderId]);
        if (orders.length === 0) throw new Error("NOT_FOUND");
        
        const order = orders[0];
        if (order.status !== 'pending') throw new Error("BAD_STATUS");

        // 3. Cập nhật trạng thái thành đã hủy
        await promiseDb.query("UPDATE orders SET status = 'cancelled' WHERE id = ?", [orderId]);

        // 4. Lấy danh sách sản phẩm và Hoàn lại kho
        const [items] = await promiseDb.query("SELECT product_id, quantity FROM order_items WHERE order_id = ?", [orderId]);
        for (let item of items) {
            await promiseDb.query("UPDATE products SET stock = stock + ? WHERE id = ?", [item.quantity, item.product_id]);
        }

        // 5. Trừ lại tổng chi tiêu của user
        await promiseDb.query("UPDATE users SET total_spent = total_spent - ? WHERE id = ?", [order.total, order.user_id]);

        // 6. Hoàn lại lượt sử dụng voucher (nếu có)
        if (order.voucher_code) {
            await promiseDb.query("UPDATE vouchers SET used_count = used_count - 1 WHERE code = ?", [order.voucher_code]);
        }

        await promiseDb.commit(); // 7. Xác nhận thành công

        // Tác vụ phụ chạy ngầm
        checkAndUpdateUserTier(order.user_id);

        res.json({ message: "Đã hủy đơn hàng thành công và hoàn trả kho!" });
    } catch (error) {
        await promiseDb.rollback(); // Có lỗi thì quay xe
        
        if (error.message === "NOT_FOUND") return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        if (error.message === "BAD_STATUS") return res.status(400).json({ message: "Chỉ có thể hủy đơn hàng đang chờ xử lý" });
        
        console.error("Lỗi hủy đơn:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi hủy đơn" });
    }
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

// Khách hàng gửi đánh giá mới
app.post("/reviews", (req, res) => {
    const { user_id, product_id, rating, comment } = req.body;

    if (!user_id) return res.status(401).json({ message: "Vui lòng đăng nhập để đánh giá" });
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: "Vui lòng chọn số sao hợp lệ (1-5)" });

    const checkPurchasedQuery = `
        SELECT o.id FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'completed'
        LIMIT 1
    `;

    db.query(checkPurchasedQuery, [user_id, product_id], (err, results) => {
        if (err) {
            console.error("Lỗi kiểm tra lịch sử mua hàng:", err);
            return res.status(500).json({ message: "Lỗi hệ thống" });
        }

        if (results.length === 0) {
            return res.status(403).json({ message: "Bạn chỉ được đánh giá những sản phẩm đã mua và nhận hàng thành công!" });
        }

        const createdAt = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Taipei' });

        db.query(
            "INSERT INTO reviews (product_id, user_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?)",
            [product_id, user_id, rating, comment, createdAt],
            (err2, result) => {
                if (err2) {
                    console.error("Lỗi lưu đánh giá:", err2);
                    return res.status(500).json({ message: "Lỗi hệ thống khi lưu đánh giá" });
                }
                
                io.emit("new_review", { product_id, rating }); 
                
                res.json({ message: "Cảm ơn bạn đã đánh giá sản phẩm!" });
            }
        );
    });
});

// API QUẢN LÝ VOUCHER (DÀNH CHO ADMIN)

// Lấy danh sách Voucher
app.get("/vouchers", verifyToken, (req, res) => {
    db.query("SELECT * FROM vouchers ORDER BY created_at DESC", (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi lấy danh sách voucher" });
        res.json(results);
    });
});

app.get("/vouchers/wallet/:user_id", verifyToken, (req, res) => {
    const { user_id } = req.params;

    db.query("SELECT tier FROM users WHERE id = ?", [user_id], (err, users) => {
        if (err || users.length === 0) return res.status(404).json({ message: "User not found" });
        
        const userTier = users[0].tier || 'normal';
        const tierRanks = { 'normal': 0, 'bronze': 1, 'silver': 2, 'gold': 3 };
        const userRank = tierRanks[userTier];

        const query = `
            SELECT DISTINCT v.* 
            FROM vouchers v
            LEFT JOIN user_vouchers uv ON v.id = uv.voucher_id AND uv.user_id = ?
            WHERE (
                (v.type = 'public' AND (
                    v.target_tier = 'all' OR 
                    (v.target_tier = 'bronze' AND ? >= 1) OR 
                    (v.target_tier = 'silver' AND ? >= 2) OR 
                    (v.target_tier = 'gold' AND ? >= 3)
                )) 
                OR uv.user_id = ?
            )
              AND (uv.is_used IS NULL OR uv.is_used = FALSE)
              AND v.expiry_date > NOW()
              AND v.used_count < v.usage_limit
            ORDER BY v.discount_percent DESC
        `;

        db.query(query, [user_id, userRank, userRank, userRank, user_id], (err2, results) => {
            if (err2) return res.status(500).json({ message: "Lỗi lấy ví" });
            
            res.json({ 
                userTier: userTier, 
                vouchers: results 
            }); 
        });
    });
});

// API KHÁCH HÀNG TỰ LƯU MÃ PUBLIC VÀO VÍ
app.post("/vouchers/save", verifyToken, (req, res) => {
    const { user_id, voucher_code } = req.body;

    db.query("SELECT id FROM vouchers WHERE code = ? AND type = 'public'", [voucher_code], (err, vouchers) => {
        if (err || vouchers.length === 0) return res.status(404).json({ message: "Mã không hợp lệ hoặc không thể lưu" });

        const voucher_id = vouchers[0].id;

        db.query("INSERT INTO user_vouchers (user_id, voucher_id) VALUES (?, ?)", [user_id, voucher_id], (err2) => {
            if (err2) {
                if (err2.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: "Bạn đã lưu mã này vào ví rồi!" });
                return res.status(500).json({ message: "Lỗi lưu mã" });
            }
            io.emit("voucher_saved", { user_id, voucher_code });
            res.json({ message: "Đã lưu mã vào ví thành công!" });
        });
    });
});

// Thêm Voucher mới
app.post("/vouchers", verifyToken, verifyAdmin, (req, res) => {
    const { code, discount_percent, max_discount, min_order_value, usage_limit, expiry_date, type, target_user_id, target_tier } = req.body;
    
    db.query("SELECT id FROM vouchers WHERE code = ?", [code], (err, results) => {
        if (results.length > 0) return res.status(400).json({ message: "Mã code này đã tồn tại!" });

        const voucherType = type === 'private' ? 'private' : 'public';
        const voucherTier = target_tier || 'all'; 

        db.query(
            "INSERT INTO vouchers (code, discount_percent, max_discount, min_order_value, usage_limit, expiry_date, type, target_tier) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [code, discount_percent, max_discount, min_order_value, usage_limit, expiry_date, voucherType, voucherTier],
            (err2, result) => {
                if (err2) return res.status(500).json({ message: "Lỗi tạo voucher" });

                const newVoucherId = result.insertId;

                // Nếu là mã Private thì bắn vào ví như cũ
                if (voucherType === 'private' && target_user_id) {
                    db.query("INSERT INTO user_vouchers (user_id, voucher_id) VALUES (?, ?)", [target_user_id, newVoucherId], (err3) => {
                        if (err3) return res.status(400).json({ message: "Đã tạo mã nhưng lỗi gửi vào ví" });
                        res.json({ message: `Đã tạo mã Private cho khách #${target_user_id}!` });
                    });
                } else {
                    res.json({ message: "Tạo mã Public thành công!" });
                }
            }
        );
    });
});

// Xóa Voucher
app.delete("/vouchers/:id", verifyToken, (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM vouchers WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ message: "Lỗi xóa voucher" });
        res.json({ message: "Xóa voucher thành công" });
    });
});

// API KIỂM TRA MÃ GIẢM GIÁ (DÀNH CHO KHÁCH HÀNG)
app.post("/vouchers/apply", (req, res) => {
    const { code, cart_total } = req.body;

    if (!code) return res.status(400).json({ message: "Vui lòng nhập mã giảm giá" });

    db.query("SELECT * FROM vouchers WHERE code = ?", [code], (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi hệ thống khi kiểm tra mã" });
        
        // Kiểm tra mã có tồn tại không
        if (results.length === 0) return res.status(404).json({ message: "Mã giảm giá không tồn tại hoặc sai tả!" });

        const voucher = results[0];

        if (voucher.type === 'private') {
            db.query("SELECT * FROM user_vouchers WHERE user_id = ? AND voucher_id = ? AND is_used = FALSE", 
            [req.body.user_id, voucher.id], 
            (err3, walletCheck) => {
                if (walletCheck.length === 0) {
                    return res.status(403).json({ message: "Mã này chỉ dành cho khách hàng đặc biệt!" });
                }
            });
        }
        
        // Lấy thời gian hiện tại ở Đài Loan để so sánh chuẩn xác
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
        const expiry = new Date(voucher.expiry_date);

        // Kiểm tra hạn sử dụng
        if (expiry < now) {
            return res.status(400).json({ message: "Mã giảm giá này đã hết hạn sử dụng!" });
        }

        // Kiểm tra số lượng lượt dùng
        if (voucher.used_count >= voucher.usage_limit) {
            return res.status(400).json({ message: "Rất tiếc! Mã giảm giá này đã hết lượt sử dụng." });
        }

        // Kiểm tra điều kiện đơn hàng tối thiểu
        if (cart_total < voucher.min_order_value) {
            return res.status(400).json({ 
                message: `Đơn hàng của bạn chưa đạt mức tối thiểu ${voucher.min_order_value.toLocaleString('vi-VN')} VND để dùng mã này.` 
            });
        }

        let discount_amount = (cart_total * voucher.discount_percent) / 100;
        
        if (discount_amount > voucher.max_discount) {
            discount_amount = voucher.max_discount;
        }

        res.json({
            message: "Áp dụng mã thành công!",
            discount_amount: discount_amount,
            voucher_code: voucher.code
        });
    });
});


// Lấy danh sách đánh giá của một sản phẩm cụ thể
app.get("/products/:id/reviews", (req, res) => {
    const productId = req.params.id;

    const query = `
        SELECT r.id, r.rating, r.comment, r.created_at, u.full_name, u.username, u.avatar 
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.product_id = ?
        ORDER BY r.created_at DESC
    `;

    db.query(query, [productId], (err, results) => {
        if (err) {
            console.error("Lỗi lấy danh sách đánh giá:", err);
            return res.status(500).json({ message: "Lỗi hệ thống" });
        }
        
        // 👉 TÍNH TOÁN SAO TRUNG BÌNH Ở ĐÂY
        const totalStars = results.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = results.length > 0 ? (totalStars / results.length).toFixed(1) : 0;
        
        // Trả về Object chứa cả danh sách lẫn thống kê
        res.json({
            averageRating: avgRating, 
            totalReviews: results.length, 
            reviews: results 
        });
    });
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

// --- API Lấy thông tin User ---
app.get("/profile", verifyToken, (req, res) => {
    const user_id = req.user.id;
    if (!user_id) return res.status(401).json({ message: "Chưa đăng nhập" });

    db.query(
        "SELECT full_name, email, phone, address, avatar, tier, total_spent FROM users WHERE id = ?", 
        [user_id], 
        (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi server" });
            if (results.length === 0) return res.status(404).json({ message: "Không tìm thấy user" });
            
            res.json(results[0]);
        }
    );
});

// --- API Cập nhật thông tin User ---
app.put("/profile", verifyToken, (req, res) => {
    const user_id = req.user.id;
    const { full_name, email, phone, address } = req.body;
    
    if (!user_id) return res.status(401).json({ message: "Chưa đăng nhập" });

    const executeUpdate = () => {
        const query = "UPDATE users SET full_name = ?, email = ?, phone = ?, address = ? WHERE id = ?";
        db.query(query, [full_name, email, phone, address, user_id], (err) => {
            if (err) {
                console.error("Lỗi cập nhật profile:", err);
                return res.status(500).json({ message: "Lỗi cập nhật thông tin" });
            }
            res.json({ message: "Cập nhật hồ sơ thành công!" });
        });
    };
    let conditions = [];
    let checkParams = [user_id]; 

    if (email) {
        conditions.push("email = ?");
        checkParams.push(email);
    }
    if (phone) {
        conditions.push("phone = ?");
        checkParams.push(phone);
    }

    if (conditions.length > 0) {
        const checkQuery = `SELECT email, phone FROM users WHERE id != ? AND (${conditions.join(" OR ")})`;
        
        db.query(checkQuery, checkParams, (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi hệ thống khi kiểm tra dữ liệu" });

            if (results.length > 0) {
                for (let row of results) {
                    if (email && row.email === email) {
                        return res.status(400).json({ message: "Email này đã được sử dụng bởi tài khoản khác!" });
                    }
                    if (phone && row.phone === phone) {
                        return res.status(400).json({ message: "Số điện thoại này đã được sử dụng bởi tài khoản khác!" });
                    }
                }
            }

            executeUpdate();
        });
    } else {
        executeUpdate();
    }
});

// --- API Đổi mật khẩu ---
app.put("/change-password", verifyToken, async (req, res) => {
    const user_id = req.user.id;
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
    db.query("SELECT id, username, full_name, email, phone, address, created_at, tier FROM users WHERE role = 'customer' ORDER BY created_at DESC", (err, result) => {
        if (err) {
            console.error("Lỗi lấy danh sách khách hàng:", err);
            return res.status(500).json({ message: "Lỗi lấy danh sách khách hàng", error: err.message });
        }
        res.json(result);
    });
});

// Xóa khách hàng
app.delete("/customers/:id", verifyToken, (req, res) => {
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

// === API Nhập hàng (Restock) ===
app.post("/products/:id/restock", verifyToken, (req, res) => {
    const productId = req.params.id;
    const { quantity_added, import_price, note } = req.body;
    
    if (!quantity_added || quantity_added <= 0) {
        return res.status(400).json({ message: "Số lượng nhập phải lớn hơn 0" });
    }
    
    // Tính tổng tiền cho lô hàng này
    const totalCost = quantity_added * (import_price || 0);
    const createdAt = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Taipei' });

    // Lưu vào sổ nhật ký nhập hàng
    db.query(
        "INSERT INTO import_logs (product_id, quantity_added, import_price, total_cost, note, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [productId, quantity_added, import_price || 0, totalCost, note || "", createdAt],
        (err) => {
            if (err) {
                console.error("Lỗi ghi log nhập hàng:", err);
                return res.status(500).json({ message: "Lỗi hệ thống khi ghi log" });
            }

            // CỘNG DỒN số lượng vào kho & Cập nhật giá vốn mới nhất
            db.query(
                "UPDATE products SET stock = stock + ?, import_price = ? WHERE id = ?",
                [quantity_added, import_price || 0, productId],
                (err) => {
                    if (err) return res.status(500).json({ message: "Lỗi cập nhật kho" });
                    io.emit("product_updated", { id: productId });
                    res.json({ message: "Nhập hàng thành công! Kho đã được cộng dồn." });
                }
            );
        }
    );
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

// Xác nhận đơn hàng đã giao
app.put("/orders/:order_id/confirm", verifyToken, (req, res) => {
    const { order_id } = req.params;
    
    // 1. Tìm xem đơn này của khách hàng nào
    db.query("SELECT user_id FROM orders WHERE id = ?", [order_id], (err, results) => {
        if (err || results.length === 0) return res.status(500).json({ message: "Không tìm thấy đơn" });
        
        const targetUserId = results[0].user_id;

        // 2. Cập nhật trạng thái
        db.query("UPDATE orders SET status = 'awaiting_confirmation' WHERE id = ?", [order_id], (updateErr) => {
            if (updateErr) return res.status(500).json({ message: "Lỗi cập nhật" });
            
            // 3. PHÁT LOA KÈM THEO ID KHÁCH HÀNG
            io.emit("order_status_updated", { target_user_id: targetUserId });

            res.json({ message: "Đơn hàng chuyển sang chờ xác nhận" });
        });
    });
});

// Khách hàng xác nhận đã nhận hàng
app.put("/orders/:order_id/confirm-received", verifyToken, (req, res) => {
    const { order_id } = req.params;
    const userId = req.user.id; 

    db.query("SELECT total FROM orders WHERE id = ? AND user_id = ?", [order_id, userId], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: "Không tìm thấy đơn" });
        
        const orderTotal = results[0].total;

        db.query("UPDATE orders SET status = 'completed' WHERE id = ?", [order_id], (updateErr) => {
            if (updateErr) return res.status(500).json({ message: "Lỗi cập nhật đơn" });

            db.query("UPDATE users SET total_spent = total_spent + ? WHERE id = ?", [orderTotal, userId], (errSpent) => {
                if (!errSpent) {
                    checkAndUpdateUserTier(userId);
                }
            });

            io.emit("order_status_updated", { target_user_id: userId });
            res.json({ message: "Cảm ơn bạn đã xác nhận nhận hàng" });
        });
    });
});

// === QUẢN LÝ NHÂN VIÊN ===

// Lấy danh sách nhân viên
app.get("/members", verifyToken, verifyAdmin, (req, res) => {
    // Chỉ cần 1 câu lệnh này vì verifyAdmin đã bảo kê rồi
    db.query("SELECT id, username, email, role, is_supervisor, created_at FROM users WHERE role IN ('admin', 'staff') ORDER BY id DESC", (err, staffResults) => {
        if (err) return res.status(500).json({ message: "Lỗi lấy danh sách nhân viên" });
        res.json(staffResults);
    });
});

// Tạo nhân viên mới
app.post("/members", verifyToken, verifyAdmin, async (req, res) => {
    const { username, email, password, role } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ message: "Vui lòng nhập username và mật khẩu" });
    }

    db.query("SELECT id FROM users WHERE username = ?", [username], async (err, checkResults) => {
        if (checkResults.length > 0) return res.status(400).json({ message: "Username đã tồn tại" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const query = "INSERT INTO users (username, email, password, role, is_supervisor, created_at) VALUES (?, ?, ?, ?, 0, NOW())";
        db.query(query, [username, email || null, hashedPassword, role || 'staff'], (err, result) => {
            if (err) return res.status(500).json({ message: "Lỗi tạo nhân viên" });
            res.json({ message: "Tạo nhân viên thành công", memberId: result.insertId });
        });
    });
});

// Cập nhật nhân viên
app.put("/members/:id", verifyToken, verifyAdmin, async (req, res) => {
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
app.delete("/members/:id", verifyToken, verifyAdmin, (req, res) => {
    const { id } = req.params;
    deleteStaffMember(res, id); // Gọi thẳng hàm xóa
});

// Hàm helper xóa nhân viên (Đã áp dụng Transaction & Async/Await)
async function deleteStaffMember(res, id) {
    const promiseDb = db.promise();

    try {
        await promiseDb.beginTransaction(); 

        await promiseDb.query(
            "DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)", 
            [id]
        );

        await promiseDb.query("DELETE FROM orders WHERE user_id = ?", [id]);

        await promiseDb.query("DELETE FROM carts WHERE user_id = ?", [id]);

        const [deleteUserResult] = await promiseDb.query("DELETE FROM users WHERE id = ?", [id]);
        
        if (deleteUserResult.affectedRows === 0) {
            await promiseDb.rollback();
            return res.status(404).json({ message: "Không tìm thấy nhân viên này" });
        }

        await promiseDb.commit();
        res.json({ message: "Xóa nhân viên và các dữ liệu liên quan thành công!" });

    } catch (error) {
        await promiseDb.rollback();
        console.error("🚨 Lỗi Transaction khi xóa nhân viên:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi xóa dữ liệu, đã hoàn tác an toàn!" });
    }
}

// === API Lấy lịch sử nhập hàng (Để tính Chi phí & Lợi nhuận) ===
app.get("/import-logs", (req, res) => {
    db.query("SELECT * FROM import_logs", (err, result) => {
        if (err) {
            console.error("Lỗi lấy dữ liệu nhập hàng:", err);
            return res.status(500).json({ message: "Lỗi hệ thống" });
        }
        res.json(result);
    });
});

// === Chạy server (Đổi từ app.listen sang server.listen) ===
const PORT = process.env.PORT || 3000; 
server.listen(PORT, () => {
  console.log(`🚀 Server & Socket.io running on port ${PORT}`);
});