<template>
    <div class="success-container">
        <div class="success-card">
            <div class="icon-wrapper">
                <span class="icon">✅</span>
            </div>
            <h2>Thanh toán thành công!</h2>
            <p class="message">Cảm ơn bạn đã mua sắm tại IceStore. Giao dịch qua thẻ của bạn đã được xác nhận.</p>

            <div class="order-info" v-if="orderId">
                <p>Mã đơn hàng của bạn:</p>
                <h3>#{{ orderId }}</h3>
            </div>

            <div class="action-buttons">
                <router-link to="/orders" class="btn btn-primary">Xem đơn hàng của tôi</router-link>
                <router-link to="/" class="btn btn-secondary">Tiếp tục mua sắm</router-link>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios'; // Nhớ import axios

// Lấy thông tin từ URL và LocalStorage
const route = useRoute();
const orderId = ref(route.query.order_id);
const userId = localStorage.getItem("user_id");

onMounted(async () => {
    console.log("Đã thanh toán thành công cho đơn hàng ID:", orderId.value);

    if (userId) {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/orders/${orderId.value}/paid`);
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/cart/${userId}`);
            const cartItems = res.data || [];

            for (const item of cartItems) {
                await axios.delete(`${import.meta.env.VITE_API_URL}/cart/${item.id}`);
            }
            console.log("Đã dọn sạch giỏ hàng sau khi thanh toán!");
        } catch (error) {
            console.error("Lỗi khi dọn giỏ hàng:", error);
        }
    }
});
</script>
<style scoped>
.success-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: calc(100vh - 80px);
    background-color: #f8fafc;
    padding: 20px;
}

.success-card {
    background: white;
    padding: 40px;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
    text-align: center;
    max-width: 500px;
    width: 100%;
}

.icon-wrapper {
    width: 80px;
    height: 80px;
    background-color: #d1fae5;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0 auto 20px;
}

.icon {
    font-size: 40px;
    color: #10b981;
}

h2 {
    color: #1e293b;
    margin-bottom: 10px;
    font-size: 24px;
}

.message {
    color: #64748b;
    line-height: 1.6;
    margin-bottom: 25px;
}

.order-info {
    background-color: #f1f5f9;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 30px;
}

.order-info p {
    margin: 0 0 5px 0;
    color: #475569;
    font-size: 14px;
}

.order-info h3 {
    margin: 0;
    color: #3b82f6;
    font-size: 22px;
}

.action-buttons {
    display: flex;
    gap: 15px;
    justify-content: center;
}

.btn {
    padding: 12px 24px;
    border-radius: 6px;
    font-weight: bold;
    text-decoration: none;
    transition: all 0.3s ease;
}

.btn-primary {
    background-color: #3b82f6;
    color: white;
}

.btn-primary:hover {
    background-color: #2563eb;
    transform: translateY(-2px);
}

.btn-secondary {
    background-color: #e2e8f0;
    color: #475569;
}

.btn-secondary:hover {
    background-color: #cbd5e1;
}

/* Responsive */
@media (max-width: 480px) {
    .action-buttons {
        flex-direction: column;
    }
}
</style>