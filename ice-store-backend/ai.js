require('dotenv').config();
const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 1. Thêm dòng này để gọi thư viện mysql2
const mysql = require('mysql2'); 

// 2. Chỉ khai báo biến db MỘT LẦN duy nhất và truyền cấu hình vào
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  timezone: "+08:00",
  ssl: { rejectUnauthorized: false }
});

// Khởi tạo Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/chat", async (req, res) => {
    try {
        const { message } = req.body; 

        // 1. KÉO DỮ LIỆU TỪ DATABASE
        const [products] = await db.promise().query("SELECT id, name, price, stock FROM products");
        
        const productListInfo = products.map(p => 
            `- ID: ${p.id} | ${p.name}: Giá ${p.price} VNĐ (Tồn kho: ${p.stock})`
        ).join('\n');

        // 2. KỊCH BẢN NÂNG CẤP (Đa ngôn ngữ & Chốt đơn)
        const systemPrompt = `
            Bạn là trợ lý ảo bán hàng của IceStore.
            Danh sách sản phẩm đang có:
            ${productListInfo}

            QUY TẮC HOẠT ĐỘNG NGHIÊM NGẶT:
            1. ĐA NGÔN NGỮ: Khách hàng hỏi bằng ngôn ngữ nào (Việt, Anh, Trung Phồn thể...), bạn PHẢI trả lời bằng chính ngôn ngữ đó. 
            2. CHỈ TƯ VẤN dựa trên danh sách trên. Không tự bịa giá.
            3. PHÁT HIỆN CHỐT ĐƠN: Nếu câu nói của khách thể hiện ý định MUA HÀNG (ví dụ: "cho mình 2 bịch đá viên", "tôi muốn mua cái này", "我要買兩包冰塊"), bạn KHÔNG ĐƯỢC trả lời bằng câu chữ bình thường.
               Bạn BẮT BUỘC phải trả về DUY NHẤT một chuỗi JSON theo đúng định dạng sau, không kèm theo bất kỳ văn bản nào khác:
               {"action": "add_to_cart", "product_id": ID_Sản_Phẩm, "quantity": Số_Lượng_Khách_Yêu_Cầu}
        `;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const fullPrompt = `${systemPrompt}\n\nKhách hàng: ${message}\nTrợ lý ảo:`;

        // 3. GỌI AI VÀ XỬ LÝ KẾT QUẢ
        const result = await model.generateContent(fullPrompt);
        let aiResponse = result.response.text().trim();

        // Xóa các ký tự thừa (nếu AI lỡ bọc JSON trong markdown ```json)
        aiResponse = aiResponse.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            // 4. KIỂM TRA XEM AI CÓ CHỐT ĐƠN HAY KHÔNG
            const parsedData = JSON.parse(aiResponse);
            
            // Chuyển dữ liệu thành mảng để xử lý chung (dù AI trả về 1 Object hay 1 Mảng)
            const orders = Array.isArray(parsedData) ? parsedData : [parsedData];
            
            let orderMessages = [];
            let hasOrder = false;

            // Chạy vòng lặp để xử lý từng món khách đặt
            for (const order of orders) {
                if (order.action === "add_to_cart") {
                    hasOrder = true;
                    // Tìm tên sản phẩm trong danh sách
                    const product = products.find(p => p.id === order.product_id);
                    
                    if (product) {
                        orderMessages.push(`${order.quantity}x ${product.name}`);
                        
                        // Ở BƯỚC NÀY: Bạn gọi db.query INSERT từng món vào database
                        await db.promise().query("INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)", [1, order.product_id, order.quantity]);
                    }
                }
            }

            // Nếu có đơn hàng, gom tất cả lại báo cáo 1 câu cho khách
            if (hasOrder && orderMessages.length > 0) {
                return res.json({ 
                    reply: `🛒 Đã thêm thành công: ${orderMessages.join(', ')} vào giỏ hàng!`,
                    isOrder: true 
                });
            }

        } catch (parseError) {
            // Nếu parse lỗi, nghĩa là AI đang trả lời văn bản bình thường (tư vấn)
            // Cứ để code chạy tiếp xuống dưới
        }
        // Nếu không phải là lệnh chốt đơn, trả về câu tư vấn bình thường
        res.json({ reply: aiResponse });

    } catch (error) {
        console.error("Lỗi khi gọi Gemini API:", error);
        res.status(500).json({ error: "Hệ thống AI đang bận, vui lòng thử lại sau!" });
    }
});

module.exports = router;