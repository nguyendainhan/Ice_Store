<template>
    <div class="page-container">
        <header class="page-header">
            <h1>Quy Định & Chính Sách</h1>
            <p>Vui lòng đọc kỹ để đảm bảo quyền lợi tốt nhất cho bạn.</p>
        </header>

        <div class="policy-content">
            <div class="policy-item">
                <div class="policy-icon">❄️</div>
                <div class="policy-text">
                    <h3>1. Chính sách kiểm hàng & Đổi trả</h3>
                    <p>
                        Do đặc thù mặt hàng đá lạnh rất dễ tan chảy theo thời gian, quý khách vui lòng <strong>kiểm tra
                            kỹ chất lượng và số lượng</strong> ngay khi nhận hàng cùng shipper.
                        Cửa hàng xin phép <strong>không hỗ trợ đổi trả</strong> sau khi quý khách đã xác nhận nhận đủ
                        hàng và thanh toán.
                    </p>
                </div>
            </div>

            <div class="policy-item">
                <div class="policy-icon">💵</div>
                <div class="policy-text">
                    <h3>2. Hình thức thanh toán</h3>
                    <p>
                        Chúng tôi hỗ trợ linh hoạt 2 hình thức:
                        <strong>Thanh toán tiền mặt khi nhận hàng (COD)</strong> hoặc
                        <strong>Chuyển khoản ngân hàng/Momo</strong> cho tài xế giao hàng.
                    </p>
                </div>
            </div>

            <div class="policy-item">
                <div class="policy-icon">⏰</div>
                <div class="policy-text">
                    <h3>3. Quy định đặt số lượng lớn</h3>
                    <p>
                        Đối với các đối tác cần lấy đá cây hoặc đá viên số lượng lớn (từ 10 bao trở lên), vui lòng báo
                        trước ít nhất <strong>2 tiếng</strong> để xưởng kịp chuẩn bị và sắp xếp xe tải giao hàng.
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.page-container {
    font-family: 'Segoe UI', Tahoma, sans-serif;
    color: #333;
    padding-bottom: 60px;
    background-color: #fff;
}

.page-header {
    background: linear-gradient(135deg, #0056b3, #0099ff);
    color: white;
    text-align: center;
    padding: 50px 20px;
    margin-bottom: 40px;
}

.page-header h1 {
    margin: 0 0 10px 0;
    font-size: 2.2rem;
}

.policy-content {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 20px;
}

.policy-item {
    display: flex;
    align-items: flex-start;
    gap: 20px;
    background-color: #f9fbff;
    padding: 25px;
    border-radius: 10px;
    margin-bottom: 20px;
    border-left: 5px solid #0099ff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.policy-icon {
    font-size: 2.5rem;
    line-height: 1;
}

.policy-text h3 {
    margin: 0 0 10px 0;
    color: #003366;
    font-size: 1.2rem;
}

.policy-text p {
    margin: 0;
    color: #555;
    line-height: 1.6;
}
</style>