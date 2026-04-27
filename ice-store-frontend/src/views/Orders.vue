<template>
    <div class="orders-container">
        <h2 class="page-title">Đơn hàng của tôi</h2>

        <div v-if="loading" class="loading">Đang tải đơn hàng...</div>
        <div v-else-if="userOrders.length === 0" class="empty">Bạn chưa từng đặt đơn hàng nào</div>

        <div v-else class="orders-list">
            <div class="tabs">
                <button @click="activeTab = 'pending'" :class="['tab-btn', { active: activeTab === 'pending' }]">
                    Chờ giao ({{ pendingCount }})
                </button>
                <button @click="activeTab = 'awaiting'" :class="['tab-btn', { active: activeTab === 'awaiting' }]">
                    Chờ xác nhận ({{ awaitingCount }})
                </button>
                <button @click="activeTab = 'completed'" :class="['tab-btn', { active: activeTab === 'completed' }]">
                    Đã nhận ({{ completedCount }})
                </button>
            </div>

            <div class="toolbar" style="display: flex; gap: 10px; flex-wrap: wrap;">
                <input v-model="searchKeyword" placeholder="Tìm kiếm theo ID đơn..." class="search-input" />

                <input type="month" v-model="selectedMonth" class="search-input" style="width: auto;">

                <button v-if="selectedMonth" @click="selectedMonth = ''" class="btn-view"
                    style="width: auto; background: #6b7280;">Xem tất cả thời gian</button>
            </div>

            <div v-if="filteredOrders.length === 0" class="empty" style="padding: 20px 0;">Không có đơn hàng nào khớp
                với tìm kiếm trong thời gian này.</div>

            <div v-else>
                <div class="orders-grid">
                    <div v-for="order in paginatedOrders" :key="order.id" class="order-card">
                        <div class="order-header">
                            <h3>Đơn hàng #{{ order.id }}</h3>
                            <span class="order-date">{{ formatDate(order.created_at) }}</span>
                        </div>

                        <div class="order-body">
                            <div class="order-info">
                                <label>Tổng tiền:</label>
                                <span class="total">{{ Number(order.total).toLocaleString('vi-VN') }} VND</span>
                            </div>
                        </div>

                        <div class="order-footer">
                            <button @click="viewOrderDetails(order.id)" class="btn-view">Xem chi tiết</button>
                            <button v-if="order.status === 'awaiting_confirmation'" @click="confirmReceived(order.id)"
                                class="btn-confirm">
                                ✓ Xác nhận đã nhận
                            </button>
                        </div>
                    </div>
                </div>

                <div class="pagination" v-if="totalPages > 0">
                    <button :disabled="currentPage === 1" @click="currentPage--">Trang trước</button>
                    <span>Trang {{ currentPage }} / {{ totalPages }}</span>
                    <button :disabled="currentPage === totalPages" @click="currentPage++">Trang sau</button>
                </div>
            </div>
        </div>
    </div>

    <div v-if="selectedOrder" class="modal-overlay" @click="selectedOrder = null">
        <div class="modal-content" @click.stop>
            <button class="btn-close" @click="selectedOrder = null">✕</button>
            <h2>Chi tiết đơn hàng #{{ selectedOrder.order.id }}</h2>

            <div class="order-info-section">
                <div class="info-row">
                    <label>Ngày đặt:</label>
                    <p>{{ formatDate(selectedOrder.order.created_at) }}</p>
                </div>
                <div class="info-row">
                    <label>Số điện thoại:</label>
                    <p>{{ selectedOrder.order.phone_number || 'N/A' }}</p>
                </div>
                <div class="info-row">
                    <label>Địa chỉ giao hàng:</label>
                    <p class="address">{{ selectedOrder.order.delivery_address || 'N/A' }}</p>
                </div>
            </div>

            <h3>Danh sách sản phẩm</h3>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Sản phẩm</th>
                        <th>Giá</th>
                        <th>Số lượng</th>
                        <th>Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="item in selectedOrder.items" :key="item.id">
                        <td>{{ item.name }}</td>
                        <td>{{ Number(item.price).toLocaleString('vi-VN') }} VND</td>
                        <td>{{ item.quantity }}</td>
                        <td>{{ (Number(item.price) * item.quantity).toLocaleString('vi-VN') }} VND</td>
                    </tr>
                </tbody>

                <tfoot>
                    <tr>
                        <td colspan="3" class="text-right font-weight-bold">Tổng cộng:</td>
                        <td class="total-amount">
                            {{ Number(selectedOrder.order.total).toLocaleString('vi-VN') }} VND
                        </td>
                    </tr>
                </tfoot>
            </table>

            <div class="modal-actions">
                <button @click="selectedOrder = null" class="btn-close-modal">Đóng</button>
            </div>
        </div>
    </div>
</template>

<script setup>
// 👉 Bổ sung thêm 'watch' vào import
import { ref, onMounted, computed, watch } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";

const router = useRouter();
const userOrders = ref([]);
const selectedOrder = ref(null);
const loading = ref(false);
const searchKeyword = ref("");
const activeTab = ref('pending');
const userId = localStorage.getItem("user_id");

// 👉 KHAI BÁO BIẾN PHÂN TRANG
const currentPage = ref(1);
const itemsPerPage = 6; // Đặt 6 để grid hiển thị đẹp (bội số của 2 và 3)

const today = new Date();
const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
const selectedMonth = ref(currentYearMonth);

async function fetchUserOrders() {
    if (!userId) {
        router.push("/login");
        return;
    }

    loading.value = true;
    try {
        const res = await axios.get("https://icestore-api.onrender.com/orders");
        userOrders.value = res.data.filter(o => o.user_id == userId);
    } catch (err) {
        console.error("Lỗi lấy đơn hàng:", err);
    } finally {
        loading.value = false;
    }
}

const filteredOrdersByTab = computed(() => {
    return userOrders.value.filter(o => {
        if (activeTab.value === 'pending') {
            return o.status === 'pending' || o.status === undefined || o.status === null;
        } else if (activeTab.value === 'awaiting') {
            return o.status === 'awaiting_confirmation';
        } else {
            return o.status === 'completed';
        }
    });
});

const filteredOrders = computed(() => {
    return filteredOrdersByTab.value.filter(o => {
        const matchKeyword = o.id.toString().includes(searchKeyword.value);

        let matchMonth = true;
        if (selectedMonth.value) {
            const orderDate = new Date(o.created_at);
            const year = orderDate.getFullYear();
            const month = String(orderDate.getMonth() + 1).padStart(2, '0');
            matchMonth = (`${year}-${month}` === selectedMonth.value);
        }

        return matchKeyword && matchMonth;
    });
});

// 👉 TÍNH TOÁN PHÂN TRANG
const totalPages = computed(() => Math.ceil(filteredOrders.value.length / itemsPerPage));

const paginatedOrders = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    return filteredOrders.value.slice(start, start + itemsPerPage);
});

// 👉 RESET VỀ TRANG 1 KHI NGƯỜI DÙNG TÌM KIẾM HOẶC ĐỔI TAB/THÁNG
watch([activeTab, searchKeyword, selectedMonth], () => {
    currentPage.value = 1;
});

const pendingCount = computed(() =>
    userOrders.value.filter(o => {
        let matchMonth = true;
        if (selectedMonth.value) {
            const d = new Date(o.created_at);
            matchMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === selectedMonth.value;
        }
        return matchMonth && (o.status === 'pending' || !o.status);
    }).length
);

const awaitingCount = computed(() =>
    userOrders.value.filter(o => {
        let matchMonth = true;
        if (selectedMonth.value) {
            const d = new Date(o.created_at);
            matchMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === selectedMonth.value;
        }
        return matchMonth && o.status === 'awaiting_confirmation';
    }).length
);

const completedCount = computed(() =>
    userOrders.value.filter(o => {
        let matchMonth = true;
        if (selectedMonth.value) {
            const d = new Date(o.created_at);
            matchMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === selectedMonth.value;
        }
        return matchMonth && o.status === 'completed';
    }).length
);

function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" }) + " " + date.toLocaleTimeString("zh-TW", { timeZone: "Asia/Taipei" });
}

async function viewOrderDetails(orderId) {
    try {
        const res = await axios.get(`https://icestore-api.onrender.com/orders/${orderId}`);
        selectedOrder.value = res.data;
    } catch (err) {
        console.error("Lỗi lấy chi tiết đơn hàng:", err);
        alert("Không thể lấy chi tiết đơn hàng");
    }
}

async function confirmReceived(orderId) {
    if (!confirm("Xác nhận bạn đã nhận đúng hàng?")) return;

    try {
        await axios.put(`https://icestore-api.onrender.com/orders/${orderId}/confirm-received`);
        alert("Cảm ơn bạn! Đơn hàng đã hoàn thành.");
        const order = userOrders.value.find(o => o.id === orderId);
        if (order) order.status = 'completed';
        if (selectedOrder.value?.order.id === orderId) {
            selectedOrder.value.order.status = 'completed';
        }
    } catch (err) {
        console.error("Lỗi xác nhận nhận hàng:", err);
        alert("Không thể xác nhận nhận hàng");
    }
}

onMounted(fetchUserOrders);
</script>

<style scoped>
/* TABS */
.tabs {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    border-bottom: 2px solid #ddd;
}

.tab-btn {
    padding: 12px 20px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    color: #666;
    border-bottom: 3px solid transparent;
    transition: all 0.3s ease;
    margin-bottom: -2px;
}

.tab-btn:hover {
    color: #1e293b;
}

.tab-btn.active {
    color: #1e293b;
    border-bottom-color: #3b82f6;
}

.orders-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f9f9f9;
    min-height: calc(100vh - 80px);
}

.page-title {
    font-size: 28px;
    font-weight: bold;
    margin-bottom: 20px;
    color: #1e293b;
}

.loading {
    text-align: center;
    padding: 40px;
    color: #666;
    font-size: 16px;
}

.empty {
    text-align: center;
    padding: 40px;
    color: #999;
    font-size: 18px;
}

/* Toolbar */
.toolbar {
    margin-bottom: 20px;
}

.search-input {
    padding: 8px 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    width: 300px;
}

/* Orders Grid */
.orders-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
}

.order-card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
}

.order-card:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
}

.order-header {
    background-color: #1e293b;
    color: white;
    padding: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.order-header h3 {
    margin: 0;
    font-size: 16px;
}

.order-date {
    font-size: 12px;
    opacity: 0.8;
}

.order-body {
    padding: 15px;
    flex: 1;
}

.order-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.order-info label {
    font-weight: bold;
    color: #555;
}

.order-info .total {
    color: #dc2626;
    font-size: 18px;
    font-weight: bold;
}

.order-footer {
    padding: 15px;
    border-top: 1px solid #ddd;
    display: flex;
    gap: 10px;
}

.btn-view {
    flex: 1;
    padding: 8px;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.3s ease;
}

.btn-view:hover {
    background-color: #2563eb;
}

.btn-confirm {
    flex: 1;
    padding: 8px;
    background-color: #10b981;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.3s ease;
}

.btn-confirm:hover {
    background-color: #059669;
}

/* 👉 CSS STYLE CHO THANH PHÂN TRANG */
.pagination {
    margin-top: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px;
}

.pagination button {
    padding: 8px 16px;
    border: 1px solid #cbd5e1;
    background: white;
    color: #334155;
    cursor: pointer;
    border-radius: 6px;
    font-weight: 500;
    transition: all 0.2s;
}

.pagination button:hover:not(:disabled) {
    background-color: #3b82f6;
    /* Xanh lam đồng bộ với giao diện user */
    color: white;
    border-color: #3b82f6;
}

.pagination button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.modal-items-table tfoot td {
    padding: 15px 10px;
    border-top: 2px solid #1e293b;
    background-color: #f8fafc;
}

.text-right {
    text-align: right;
}

.font-weight-bold {
    font-weight: bold;
    font-size: 16px;
    color: #333;
}

.total-amount {
    color: #dc2626;
    font-weight: 900;
    font-size: 18px;
}

/* MODAL */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1001;
    overflow-y: auto;
    padding: 20px;
}

.modal-content {
    background: white;
    padding: 30px;
    border-radius: 8px;
    min-width: 500px;
    max-width: 700px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    position: relative;
}

.btn-close {
    position: absolute;
    top: 15px;
    right: 15px;
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #999;
}

.btn-close:hover {
    color: #333;
}

.modal-content h2 {
    margin-top: 0;
    margin-bottom: 20px;
    color: #1e293b;
}

.modal-content h3 {
    margin: 20px 0 15px;
    color: #1e293b;
    font-size: 16px;
}

.order-info-section {
    background-color: #f9f9f9;
    padding: 15px;
    border-radius: 6px;
    margin-bottom: 20px;
}

.info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.info-row:last-child {
    margin-bottom: 0;
}

.info-row label {
    font-weight: bold;
    color: #555;
}

.info-row p {
    color: #333;
    margin: 0;
}

.info-row .total {
    color: #dc2626;
    font-weight: bold;
    font-size: 16px;
}

.info-row .address {
    white-space: pre-wrap;
    word-wrap: break-word;
    line-height: 1.5;
}

/* Items Table */
.items-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
}

.items-table th {
    background-color: #f0f0f0;
    padding: 10px;
    text-align: left;
    font-weight: bold;
    border-bottom: 1px solid #ddd;
}

.items-table td {
    padding: 10px;
    border-bottom: 1px solid #ddd;
}

/* Modal Actions */
.modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 20px;
}

.btn-close-modal {
    padding: 8px 20px;
    background-color: #6b7280;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.3s ease;
}

.btn-close-modal:hover {
    background-color: #4b5563;
}

/* RESPONSIVE */
@media (max-width: 768px) {
    .orders-grid {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 15px;
    }

    .search-input {
        width: 100%;
    }

    .modal-content {
        min-width: auto;
        max-width: 90%;
        padding: 20px;
    }
}

@media (max-width: 480px) {
    .page-title {
        font-size: 22px;
    }

    .orders-grid {
        grid-template-columns: 1fr;
    }

    .modal-content {
        min-width: auto;
        max-width: 95%;
        padding: 15px;
    }

    .order-header {
        flex-direction: column;
        gap: 5px;
        text-align: center;
    }
}
</style>