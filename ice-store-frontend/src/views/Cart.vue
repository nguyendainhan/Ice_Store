<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";

const router = useRouter();
const cartItems = ref([]);
const userId = localStorage.getItem("user_id"); // ID người dùng hiện tại
const loading = ref(false);
const errorMessage = ref("");
const deliveryAddress = ref("");
const phoneNumber = ref("");

// Lấy giỏ hàng theo user
async function fetchCart() {
    if (!userId) {
        errorMessage.value = "Vui lòng đăng nhập để xem giỏ hàng";
        router.push("/login");
        return;
    }

    loading.value = true;
    errorMessage.value = "";
    try {
        console.log("Lấy giỏ hàng cho user:", userId);
        const res = await axios.get(`http://localhost:3000/cart/${userId}`);
        console.log("Dữ liệu giỏ hàng:", res.data);
        cartItems.value = res.data || [];
    } catch (err) {
        console.error("Lỗi lấy giỏ hàng:", err);
        errorMessage.value = "Lỗi lấy giỏ hàng: " + err.message;
    } finally {
        loading.value = false;
    }
}

// Xóa sản phẩm khỏi giỏ hàng
async function removeItem(id) {
    await axios.delete(`http://localhost:3000/cart/${id}`);
    fetchCart();
}

// Cập nhật số lượng
async function updateQuantity(item, newQty) {
    if (newQty < 1) return;
    const diff = newQty - item.quantity; // tính số lượng thay đổi
    await axios.post("http://localhost:3000/cart", {
        user_id: userId,
        product_id: item.product_id,
        quantity: diff
    });
    fetchCart();
}

// Tính tổng tiền
function calculateTotal() {
    return cartItems.value.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Thanh toán
async function checkout() {
    if (cartItems.value.length === 0) {
        alert("Giỏ hàng trống!");
        return;
    }

    if (!deliveryAddress.value.trim()) {
        alert("Vui lòng nhập địa chỉ giao hàng!");
        return;
    }

    if (!phoneNumber.value.trim()) {
        alert("Vui lòng nhập số điện thoại!");
        return;
    }

    const total = calculateTotal();
    const items = cartItems.value.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
    }));

    try {
        const res = await axios.post("http://localhost:3000/orders", {
            user_id: userId,
            items: items,
            total: total,
            delivery_address: deliveryAddress.value,
            phone_number: phoneNumber.value
        });
        alert("Thanh toán thành công! Đơn hàng #" + res.data.orderId);
        // Reset address fields
        deliveryAddress.value = "";
        phoneNumber.value = "";
        // Xóa tất cả sản phẩm khỏi giỏ hàng sau khi thanh toán
        for (const item of cartItems.value) {
            await axios.delete(`http://localhost:3000/cart/${item.id}`);
        }
        fetchCart();
    } catch (err) {
        console.error("Lỗi thanh toán:", err);
        alert("Thanh toán thất bại: " + err.message);
    }
}

onMounted(() => {
    fetchCart();
});
</script>

<template>
    <div class="cart-container">
        <h2 class="cart-title">Giỏ hàng của bạn</h2>

        <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
        <div v-else-if="loading" class="loading">Đang tải giỏ hàng...</div>
        <div v-else-if="cartItems.length === 0" class="empty">Chưa có sản phẩm</div>

        <div v-else class="cart-content">
            <!-- Table -->
            <table class="cart-table">
                <thead>
                    <tr>
                        <th>Tên sản phẩm</th>
                        <th>Giá</th>
                        <th>Số lượng</th>
                        <th>Ảnh</th>
                        <th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="item in cartItems" :key="item.id">
                        <td>{{ item.name }}</td>
                        <td>{{ item.price.toLocaleString('vi-VN') }} VND</td>
                        <td>
                            <input type="number" min="1" v-model.number="item.quantity"
                                @change="updateQuantity(item, item.quantity)" class="qty-input" />
                        </td>
                        <td>
                            <img :src="item.image" class="cart-image" />
                        </td>
                        <td>
                            <button @click="removeItem(item.id)" class="btn-delete">Xóa</button>
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Total and Checkout -->
            <div class="cart-footer">
                <div class="delivery-form">
                    <h3>Thông tin giao hàng</h3>
                    <div class="form-group">
                        <label for="phone">Số điện thoại:</label>
                        <input id="phone" v-model="phoneNumber" type="tel" placeholder="Nhập số điện thoại"
                            class="form-input" />
                    </div>
                    <div class="form-group">
                        <label for="address">Địa chỉ giao hàng:</label>
                        <textarea id="address" v-model="deliveryAddress"
                            placeholder="Nhập địa chỉ giao hàng (ví dụ: 123 Đường ABC, Phường XYZ, Quận 1, TP.HCM)"
                            class="form-textarea" rows="3"></textarea>
                    </div>
                </div>

                <div class="total-section">
                    <h3>Tổng tiền: <span class="total-amount">{{ calculateTotal().toLocaleString('vi-VN') }}</span> VND
                    </h3>
                </div>
                <button @click="checkout" class="btn-checkout">Thanh toán</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.cart-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f9f9f9;
    min-height: calc(100vh - 80px);
}

.cart-title {
    font-size: 28px;
    font-weight: bold;
    margin-bottom: 20px;
    color: #1e293b;
}

.loading {
    padding: 40px;
    text-align: center;
    font-size: 16px;
    color: #666;
}

.error-message {
    padding: 15px;
    background-color: #fee;
    color: #c00;
    border: 1px solid #fcc;
    border-radius: 4px;
    margin-bottom: 20px;
    text-align: center;
}

.empty {
    padding: 40px;
    text-align: center;
    font-size: 18px;
    color: #999;
}

/* Giỏ hàng content */
.cart-content {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Table */
.cart-table {
    width: 100%;
    border-collapse: collapse;
}

.cart-table thead {
    background-color: #1e293b;
    color: white;
}

.cart-table th {
    padding: 15px;
    text-align: left;
    font-weight: bold;
}

.cart-table td {
    padding: 15px;
    border-bottom: 1px solid #ddd;
}

.cart-table tbody tr:hover {
    background-color: #f5f5f5;
}

/* Quantity input */
.qty-input {
    width: 70px;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    text-align: center;
    font-size: 14px;
}

.qty-input:focus {
    border-color: #38bdf8;
    outline: none;
}

/* Product image */
.cart-image {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 4px;
}

/* Delete button */
.btn-delete {
    padding: 6px 12px;
    background-color: #dc2626;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.3s ease;
}

.btn-delete:hover {
    background-color: #991b1b;
}

/* Footer with total and checkout */
.cart-footer {
    padding: 20px;
    background-color: #f9f9f9;
    border-top: 2px solid #e5e7eb;
}

.delivery-form {
    background: white;
    padding: 20px;
    border-radius: 6px;
    margin-bottom: 20px;
}

.delivery-form h3 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #1e293b;
    font-size: 16px;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 600;
    color: #555;
}

.form-input,
.form-textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    font-family: inherit;
}

.form-input:focus,
.form-textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.total-section {
    margin-bottom: 15px;
}

.total-section h3 {
    margin: 0;
    font-size: 20px;
    color: #1e293b;
    font-weight: bold;
}

.total-amount {
    color: #dc2626;
    font-size: 24px;
    font-weight: bold;
}

/* Checkout button */
.btn-checkout {
    padding: 12px 30px;
    background-color: #10b981;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
    transition: all 0.3s ease;
}

.btn-checkout:hover {
    background-color: #059669;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-checkout:active {
    transform: translateY(0);
}

/* Number input arrows removal */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

input[type="number"] {
    appearance: textfield;
    -moz-appearance: textfield;
}

/* RESPONSIVE */
@media (max-width: 768px) {
    .cart-container {
        padding: 15px;
    }

    .cart-title {
        font-size: 22px;
        margin-bottom: 15px;
    }

    .cart-table {
        font-size: 14px;
    }

    .cart-table th,
    .cart-table td {
        padding: 10px;
    }

    .cart-image {
        width: 50px;
        height: 50px;
    }

    .qty-input {
        width: 60px;
        padding: 6px;
        font-size: 12px;
    }

    .cart-footer {
        flex-direction: column;
        gap: 15px;
    }

    .total-section h3 {
        font-size: 18px;
        text-align: center;
    }

    .btn-checkout {
        width: 100%;
        padding: 12px;
    }
}

@media (max-width: 480px) {
    .cart-container {
        padding: 10px;
    }

    .cart-title {
        font-size: 18px;
    }

    .cart-table {
        font-size: 12px;
    }

    .cart-table th,
    .cart-table td {
        padding: 8px;
    }

    .cart-image {
        width: 45px;
        height: 45px;
    }

    .qty-input {
        width: 50px;
        padding: 5px;
        font-size: 11px;
    }

    .btn-delete {
        padding: 4px 8px;
        font-size: 11px;
    }

    .total-section h3 {
        font-size: 16px;
    }

    .btn-checkout {
        width: 100%;
        padding: 10px;
        font-size: 14px;
    }
}
</style>