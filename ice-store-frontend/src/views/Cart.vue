<script setup>
import { ref, onMounted, computed } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";
import { toast } from "vue3-toastify";

const router = useRouter();
const cartItems = ref([]);
const userId = localStorage.getItem("user_id");
const loading = ref(false);
const errorMessage = ref("");
const deliveryAddress = ref("");
const phoneNumber = ref("");
const fullName = ref("");
const email = ref("");
const saveAsDefault = ref(false);
const userCurrentTier = ref('normal');

const voucherCode = ref("");
const discountAmount = ref(0);
const appliedVoucher = ref(null);
const showVoucherModal = ref(false);
const walletVouchers = ref([]);

// Lấy danh sách Voucher từ Ví của khách
async function fetchWalletVouchers() {
    if (!userId) return;
    try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/vouchers/wallet/${userId}`);
        walletVouchers.value = res.data.vouchers; // Lấy danh sách mã
        userCurrentTier.value = res.data.userTier; // Lấy huy hiệu hạng
    } catch (err) {
        console.error("Lỗi lấy ví voucher:", err);
    }
}

// Mở cửa sổ Ví
function openVoucherModal() {
    fetchWalletVouchers();
    showVoucherModal.value = true;
}

// Khi khách bấm nút "Dùng ngay" trong Ví
function selectVoucher(code) {
    voucherCode.value = code;
    showVoucherModal.value = false;
    applyVoucher();
}

// Lấy thông tin người dùng
async function fetchUserProfile() {
    if (!userId) return;
    try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/profile`, {
            headers: { user_id: userId }
        });
        if (res.data) {
            phoneNumber.value = res.data.phone || "";
            deliveryAddress.value = res.data.address || "";
            fullName.value = res.data.full_name || "";
            email.value = res.data.email || "";
        }
    } catch (err) {
        console.error("Lỗi lấy thông tin người dùng:", err);
    }
}

// Lấy giỏ hàng theo user
async function fetchCart() {
    if (!userId) {
        toast.warning("Vui lòng đăng nhập để xem giỏ hàng");
        router.push("/login");
        return;
    }

    loading.value = true;
    errorMessage.value = "";
    try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/cart/${userId}`);
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
    try {
        await axios.delete(`${import.meta.env.VITE_API_URL}/cart/${id}`);
        toast.success("Đã xóa sản phẩm khỏi giỏ hàng");
        fetchCart();
    } catch (err) {
        toast.error("Lỗi khi xóa sản phẩm!");
    }
}

// Cập nhật số lượng
async function updateQuantity(item, newQty) {
    if (newQty < 1) return;
    const diff = newQty - item.quantity;
    try {
        await axios.post(`${import.meta.env.VITE_API_URL}/cart`, {
            user_id: userId,
            product_id: item.product_id,
            quantity: diff
        });
        fetchCart();
    } catch (err) {
        toast.error("Lỗi cập nhật số lượng");
    }
}

// Tính tổng tiền Tạm tính
function calculateTotal() {
    return cartItems.value.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Tính tiền Thành Toán cuối cùng (tránh bị âm tiền)
const finalTotal = computed(() => {
    const subTotal = calculateTotal();
    return subTotal > discountAmount.value ? subTotal - discountAmount.value : 0;
});

// Áp dụng mã giảm giá
async function applyVoucher() {
    if (!voucherCode.value.trim()) {
        toast.warning("Vui lòng nhập mã!");
        return;
    }

    try {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/vouchers/apply`, {
            code: voucherCode.value.trim().toUpperCase(),
            // Dùng hàm calculateTotal() thay vì cartTotal.value
            cart_total: calculateTotal()
        });

        discountAmount.value = res.data.discount_amount;
        appliedVoucher.value = res.data.voucher_code;
        toast.success(`Áp dụng thành công! Được giảm ${discountAmount.value.toLocaleString('vi-VN')} VND`);
    } catch (err) {
        toast.error(err.response?.data?.message || "Lỗi áp dụng mã");
        discountAmount.value = 0;
        appliedVoucher.value = null;
    }
}

// Hủy mã giảm giá
function removeVoucher() {
    voucherCode.value = "";
    discountAmount.value = 0;
    appliedVoucher.value = null;
    toast.info("Đã hủy mã giảm giá");
}

// Thanh toán
async function checkout() {
    if (cartItems.value.length === 0) {
        toast.warning("Giỏ hàng của bạn đang trống!");
        return;
    }
    if (!deliveryAddress.value.trim()) {
        toast.warning("Vui lòng nhập địa chỉ giao hàng!");
        return;
    }
    if (!phoneNumber.value.trim()) {
        toast.warning("Vui lòng nhập số điện thoại!");
        return;
    }

    const items = cartItems.value.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
    }));

    try {
        // Gửi đúng số tiền ĐÃ GIẢM và MÃ VOUCHER lên server
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/orders`, {
            user_id: userId,
            items: items,
            total: finalTotal.value, // Dùng tổng tiền đã trừ khuyến mãi
            voucher_code: appliedVoucher.value, // Báo cho server biết khách xài mã nào
            delivery_address: deliveryAddress.value,
            phone_number: phoneNumber.value
        });

        if (saveAsDefault.value) {
            await axios.put(`${import.meta.env.VITE_API_URL}/profile`, {
                full_name: fullName.value,
                email: email.value,
                phone: phoneNumber.value,
                address: deliveryAddress.value
            }, {
                headers: { user_id: userId }
            });
        }

        toast.success("Thanh toán thành công! Đơn hàng #" + res.data.orderId);

        for (const item of cartItems.value) {
            await axios.delete(`${import.meta.env.VITE_API_URL}/cart/${item.id}`);
        }

        // Trả lại trạng thái giỏ hàng như mới
        discountAmount.value = 0;
        appliedVoucher.value = null;
        voucherCode.value = "";

        fetchCart();
    } catch (err) {
        console.error("Lỗi thanh toán:", err);
        toast.error("Thanh toán thất bại: " + err.message);
    }
}

onMounted(() => {
    fetchCart();
    fetchUserProfile();
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
                        <td>{{ Number(item.price).toLocaleString('vi-VN') }} VND</td>
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
                    <div class="form-group" style="display: flex; align-items: center; gap: 8px; margin-top: -5px;">
                        <input type="checkbox" id="saveDefault" v-model="saveAsDefault"
                            style="width: 16px; height: 16px; cursor: pointer;" />
                        <label for="saveDefault"
                            style="margin: 0; cursor: pointer; font-weight: normal; font-size: 14px;">
                            Lưu SĐT và Địa chỉ này làm mặc định cho lần mua sau
                        </label>
                    </div>
                </div>

                <!-- KHU VỰC MÃ GIẢM GIÁ VÀ TÍNH TIỀN MỚI -->
                <div class="checkout-section">
                    <div class="voucher-box">
                        <h3>Mã giảm giá</h3>
                        <div class="voucher-input-group">
                            <input v-model="voucherCode" placeholder="Nhập mã (VD: ICEVIP20)" class="form-input"
                                :disabled="appliedVoucher !== null" />
                            <button v-if="!appliedVoucher" @click="applyVoucher" class="btn-apply">Áp dụng</button>
                            <button v-else @click="removeVoucher" class="btn-remove">Hủy mã</button>
                        </div>

                        <button v-if="!appliedVoucher" @click="openVoucherModal" class="btn-open-wallet">
                            Chọn mã giảm giá từ Ví của bạn
                        </button>

                        <div v-if="appliedVoucher" class="voucher-success">
                            ✓ Đang dùng mã: <strong>{{ appliedVoucher }}</strong>
                        </div>
                    </div>

                    <div class="total-section">
                        <div class="total-row">
                            <span>Tạm tính:</span>
                            <span>{{ Number(calculateTotal()).toLocaleString('vi-VN') }} VND</span>
                        </div>
                        <div v-if="discountAmount > 0" class="total-row discount">
                            <span>Giảm giá (Voucher):</span>
                            <span>-{{ Number(discountAmount).toLocaleString('vi-VN') }} VND</span>
                        </div>
                        <h3 class="final-total">
                            Thành tiền: <span class="total-amount">{{ Number(finalTotal).toLocaleString('vi-VN')
                                }}</span> VND
                        </h3>
                    </div>

                    <button @click="checkout" class="btn-checkout">Thanh toán</button>
                </div>
            </div>
        </div>
    </div>
    <div v-if="showVoucherModal" class="voucher-modal-overlay" @click="showVoucherModal = false">
        <div class="voucher-modal-content" @click.stop>
            <div class="modal-header">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <h2>Kho Voucher của bạn</h2>
                    <!-- Hiển thị Huy hiệu Hạng -->
                    <span :class="'tier-badge ' + userCurrentTier">
                        {{ userCurrentTier === 'normal' ? 'THÀNH VIÊN' : userCurrentTier.toUpperCase() }}
                    </span>
                </div>
                <button @click="showVoucherModal = false" class="close-btn">✕</button>
            </div>

            <div class="modal-body">
                <div v-if="walletVouchers.length === 0" class="empty-wallet">
                    <p>Chưa có mã giảm giá nào trong ví.</p>
                </div>

                <!-- Hiển thị từng mã như cái vé (Ticket) -->
                <div v-for="v in walletVouchers" :key="v.id" class="voucher-ticket">
                    <div class="ticket-left">
                        <span class="discount-val">{{ v.discount_percent }}%</span>
                        <span class="discount-label">GIẢM</span>
                    </div>
                    <div class="ticket-right">
                        <div class="ticket-info">
                            <h4>Mã: {{ v.code }}</h4>
                            <p>Đơn tối thiểu: {{ Number(v.min_order_value).toLocaleString('vi-VN') }}đ</p>
                            <p>Giảm tối đa: {{ Number(v.max_discount).toLocaleString('vi-VN') }}đ</p>
                            <p class="expiry">HSD: {{ new Date(v.expiry_date).toLocaleDateString('vi-VN') }}</p>
                        </div>
                        <button @click="selectVoucher(v.code)" class="btn-use-ticket">Dùng ngay</button>
                    </div>
                </div>
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

/* --- VOUCHER & CHECKOUT SECTION --- */
.checkout-section {
    background: white;
    padding: 20px;
    border-radius: 6px;
    border: 1px dashed #cbd5e1;
}

.voucher-box {
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid #e2e8f0;
}

.voucher-box h3 {
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 16px;
    color: #1e293b;
}

.voucher-input-group {
    display: flex;
    gap: 10px;
}

.btn-apply {
    padding: 10px 20px;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    white-space: nowrap;
    transition: background-color 0.2s;
}

.btn-apply:hover {
    background-color: #2563eb;
}

.btn-remove {
    padding: 10px 20px;
    background-color: #ef4444;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    white-space: nowrap;
}

.btn-remove:hover {
    background-color: #dc2626;
}

.voucher-success {
    margin-top: 10px;
    color: #10b981;
    font-size: 14px;
}

/* Nút mở Ví */
.btn-open-wallet {
    width: 100%;
    margin-top: 15px;
    padding: 10px;
    background-color: #f8fafc;
    color: #3b82f6;
    border: 1px dashed #3b82f6;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
}

.btn-open-wallet:hover {
    background-color: #eff6ff;
}

/* Modal Overlay làm mờ nền */
.voucher-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(15, 23, 42, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
}

.voucher-modal-content {
    background: white;
    width: 90%;
    max-width: 500px;
    border-radius: 12px;
    padding: 20px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 15px;
    margin-bottom: 15px;
}

.modal-header h2 {
    margin: 0;
    font-size: 18px;
    color: #1e293b;
}

.close-btn {
    background: transparent;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #64748b;
}

.modal-body {
    overflow-y: auto;
    padding-right: 5px;
}

.empty-wallet {
    text-align: center;
    color: #94a3b8;
    padding: 30px 0;
}

/* THIẾT KẾ VÉ VOUCHER (TICKET) */
.voucher-ticket {
    display: flex;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    margin-bottom: 15px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
    overflow: hidden;
}

.ticket-left {
    background: #10b981;
    /* Màu xanh ngọc bắt mắt */
    color: white;
    padding: 20px 15px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-width: 90px;
    border-right: 2px dashed #ffffff;
    /* Nếp gấp của vé */
}

.discount-val {
    font-size: 24px;
    font-weight: bold;
}

.discount-label {
    font-size: 12px;
    font-weight: 600;
    margin-top: 5px;
}

.ticket-right {
    padding: 15px;
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #ffffff;
}

.ticket-info h4 {
    margin: 0 0 5px 0;
    color: #1e293b;
    font-size: 16px;
}

.ticket-info p {
    margin: 3px 0;
    font-size: 13px;
    color: #475569;
}

.ticket-info .expiry {
    color: #ef4444;
    margin-top: 8px;
    font-size: 12px;
}

.btn-use-ticket {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    font-size: 13px;
    white-space: nowrap;
}

.btn-use-ticket:hover {
    background: #2563eb;
}

/* HUY HIỆU HẠNG THÀNH VIÊN */
.tier-badge {
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.tier-badge.normal {
    background: #f1f5f9;
    color: #64748b;
}

.tier-badge.bronze {
    background: #fef3c7;
    color: #b45309;
    border: 1px solid #fde68a;
}

.tier-badge.silver {
    background: #f8fafc;
    color: #475569;
    border: 1px solid #cbd5e1;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tier-badge.gold {
    background: #fef08a;
    color: #854d0e;
    border: 1px solid #fde047;
    box-shadow: 0 0 8px rgba(250, 204, 21, 0.5);
}

/* --- TỔNG TIỀN CHI TIẾT --- */
.total-section {
    margin-bottom: 20px;
}

.total-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    font-size: 16px;
    color: #475569;
}

.total-row.discount {
    color: #dc2626;
    font-weight: 500;
}

.final-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 15px 0 0 0;
    padding-top: 15px;
    border-top: 2px dashed #e2e8f0;
    font-size: 20px;
    color: #1e293b;
    font-weight: bold;
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