<template>
    <div class="about-container">
        <header class="about-hero">
            <h1>Về Chúng Tôi</h1>
            <p>Hành trình mang sự mát lạnh và an toàn đến mọi đối tác.</p>
        </header>

        <div class="about-content">
            <section class="story-section">
                <h2>🧊 Lịch Sử Hình Thành</h2>
                <p>
                    Chính thức đi vào hoạt động từ <strong>năm 2024</strong>, Cửa Hàng Đá Lạnh Toàn Phát khởi đầu từ một
                    xưởng sản xuất nhỏ với mong muốn giải quyết bài toán "đá sạch" cho các quán cafe, nhà hàng tại khu
                    vực.
                </p>
                <p>
                    Trải qua quá trình nỗ lực, chúng tôi tự hào mang đến những viên đá tinh khiết 100%, được sản xuất
                    trên dây chuyền công nghệ khép kín, đạt chuẩn vệ sinh an toàn thực phẩm.
                </p>
            </section>

            <section class="mission-section">
                <h2>🎯 Cam Kết Của Chúng Tôi</h2>
                <ul class="commitments">
                    <li>
                        <strong>💧 Công nghệ lọc RO:</strong> Nguồn nước đầu vào được xử lý qua hệ thống lọc thẩm thấu
                        ngược, loại bỏ hoàn toàn tạp chất.
                    </li>
                    <li>
                        <strong>🚀 Giao hàng hỏa tốc:</strong> Cam kết giao đúng giờ, đủ số lượng 24/7 để không làm gián
                        đoạn việc kinh doanh của đối tác.
                    </li>
                    <li>
                        <strong>🤝 Đối tác tin cậy:</strong> Chính sách giá sỉ minh bạch, ổn định và chiết khấu cao cho
                        hợp đồng lâu dài.
                    </li>
                </ul>
            </section>
        </div>

        <section class="contact-info">
            <h2>Liên Hệ Trực Tiếp</h2>
            <div class="contact-grid">
                <div class="contact-card">
                    <span class="icon">📍</span>
                    <h3>Địa chỉ xưởng</h3>
                    <p>123 Đường Băng Tuyết, Quận 1, TP. HCM</p>
                </div>
                <div class="contact-card">
                    <span class="icon">📞</span>
                    <h3>Hotline (24/7)</h3>
                    <p>0909.123.456</p>
                </div>
                <div class="contact-card">
                    <span class="icon">✉️</span>
                    <h3>Email</h3>
                    <p>lienhe@dalanhtoanphat.com</p>
                </div>
            </div>
        </section>
    </div>
</template>

<style scoped>
/* --- Cài đặt chung --- */
.about-container {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color: #333;
    line-height: 1.8;
    background-color: #f9fbff;
    padding-bottom: 60px;
}

h1,
h2,
h3 {
    color: #003366;
    margin-bottom: 15px;
}

/* --- Banner Hero --- */
.about-hero {
    background: linear-gradient(135deg, #0056b3, #0099ff);
    color: white;
    text-align: center;
    padding: 60px 20px;
}

.about-hero h1 {
    color: white;
    font-size: 2.5rem;
    margin: 0 0 10px 0;
}

.about-hero p {
    font-size: 1.2rem;
    opacity: 0.9;
}

/* --- Nội dung chính --- */
.about-content {
    max-width: 1000px;
    margin: 40px auto;
    padding: 0 20px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
}

.story-section p {
    text-align: justify;
    margin-bottom: 15px;
    color: #555;
}

.commitments {
    list-style: none;
    padding: 0;
}

.commitments li {
    background-color: white;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 15px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
    border-left: 4px solid #0099ff;
}

.commitments strong {
    color: #0056b3;
}

/* --- Liên hệ --- */
.contact-info {
    max-width: 1000px;
    margin: 60px auto 0;
    padding: 0 20px;
    text-align: center;
}

.contact-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-top: 30px;
}

.contact-card {
    background-color: white;
    padding: 30px 20px;
    border-radius: 10px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.contact-card .icon {
    font-size: 2.5rem;
    display: block;
    margin-bottom: 15px;
}

/* --- Responsive cho Mobile --- */
@media (max-width: 768px) {
    .about-content {
        grid-template-columns: 1fr;
        /* Gộp thành 1 cột trên điện thoại */
        gap: 20px;
    }
}
</style>