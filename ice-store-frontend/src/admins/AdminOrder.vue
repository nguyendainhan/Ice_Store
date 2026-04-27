<template>
    <div class="tabs">
        <button @click="activeTab = 'pending'" :class="['tab-btn', { active: activeTab === 'pending' }]">
            Danh sách chờ giao ({{ pendingCount }})
        </button>
        <button @click="activeTab = 'awaiting'" :class="['tab-btn', { active: activeTab === 'awaiting' }]">
            Danh sách chờ xác nhận ({{ awaitingCount }})
        </button>
        <button @click="activeTab = 'completed'" :class="['tab-btn', { active: activeTab === 'completed' }]">
            Danh sách đã giao ({{ completedCount }})
        </button>
    </div>

    <div class="toolbar">
        <input v-model="searchKeyword" placeholder="Tìm kiếm theo tên khách hoặc ID đơn..." class="search-input" />

        <input type="month" v-model="selectedMonth" class="date-input"
            style="padding: 8px; border: 1px solid #ccc; border-radius: 4px;">

        <button v-if="selectedMonth" @click="selectedMonth = ''" class="btn gray clear-btn">Xem tất cả thời
            gian</button>
    </div>

    <div class="table-container">
        <table class="orders-table">
            <thead>
                <tr>
                    <th>ID Đơn</th>
                    <th>Khách hàng</th>
                    <th>Tổng tiền</th>
                    <th>Ngày tạo</th>
                    <th>Hành động</th>
                </tr>
            </thead>
            <tbody>
                <tr v-if="loading">
                    <td colspan="5" class="text-center">Đang tải...</td>
                </tr>
                <tr v-else-if="paginatedOrders.length === 0">
                    <td colspan="5" class="text-center">Không có đơn hàng nào trong tháng này.</td>
                </tr>
                <tr v-for="order in paginatedOrders" v-else :key="order.id">
                    <td>#{{ order.id }}</td>
                    <td>{{ order.username }}</td>
                    <td style="color: #b45309; font-weight: bold;">{{ Number(order.total).toLocaleString('vi-VN') }} VND
                    </td>
                    <td>{{ formatDate(order.created_at) }}</td>
                    <td class="actions">
                        <button @click="viewOrder(order.id)" class="btn yellow">Chi tiết</button>
                        <button v-if="order.status === 'pending'" @click="confirmDelivery(order.id)" class="btn green">
                            Xác nhận đã giao
                        </button>
                        <button v-else-if="order.status === 'awaiting_confirmation'" disabled class="btn gray"
                            style="cursor: not-allowed; opacity: 0.6;">
                            Chờ xác nhận
                        </button>
                        <button v-else disabled class="btn gray" style="cursor: not-allowed; opacity: 0.6;">
                            Đã giao
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="pagination" v-if="totalPages > 0">
        <button :disabled="currentPage === 1" @click="currentPage--">Prev</button>
        <span>Trang {{ currentPage }} / {{ totalPages }}</span>
        <button :disabled="currentPage === totalPages" @click="currentPage++">Next</button>
    </div>

    <div v-if="selectedOrder" class="modal-overlay" @click="selectedOrder = null">
        <div class="modal-content" @click.stop>
            <h2>Chi tiết đơn hàng #{{ selectedOrder.order.id }}</h2>

            <div class="order-info">
                <div class="info-group">
                    <label>Khách hàng:</label>
                    <p>{{ selectedOrder.order.username }}</p>
                </div>
                <div class="info-group">
                    <label>Ngày tạo:</label>
                    <p>{{ formatDate(selectedOrder.order.created_at) }}</p>
                </div>
                <div class="info-group">
                    <label>Số điện thoại:</label>
                    <p>{{ selectedOrder.order.phone_number || 'N/A' }}</p>
                </div>
                <div class="info-group">
                    <label>Địa chỉ giao hàng:</label>
                    <p class="address">{{ selectedOrder.order.delivery_address || 'N/A' }}</p>
                </div>
            </div>

            <h3>Danh sách sản phẩm</h3>
            <table class="modal-items-table">
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
                <button @click="selectedOrder = null" class="btn gray">Đóng cửa sổ</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from "vue";
import axios from "axios";

const orders = ref([]);
const selectedOrder = ref(null);
const searchKeyword = ref("");
const loading = ref(false);
const currentPage = ref(1);
const itemsPerPage = 8;
const activeTab = ref('pending');

// 👉 TẠO BIẾN LƯU THÁNG MẶC ĐỊNH LÀ THÁNG HIỆN TẠI (Định dạng YYYY-MM)
const today = new Date();
const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
const selectedMonth = ref(currentYearMonth);

async function fetchOrders() {
    loading.value = true;
    try {
        const res = await axios.get("http://localhost:3000/orders");
        orders.value = res.data;
        console.log("Danh sách đơn hàng:", res.data);
    } catch (err) {
        console.error("Lỗi lấy danh sách đơn hàng:", err);
        alert("Không thể lấy danh sách đơn hàng");
    } finally {
        loading.value = false;
    }
}

// Lọc theo tùy chọn tab
const filteredOrdersByTab = computed(() => {
    return orders.value.filter(o => {
        if (activeTab.value === 'pending') {
            return o.status === 'pending' || o.status === undefined || o.status === null;
        } else if (activeTab.value === 'awaiting') {
            return o.status === 'awaiting_confirmation';
        } else {
            return o.status === 'completed';
        }
    });
});

// Lọc theo tìm kiếm VÀ theo Tháng
const filteredOrders = computed(() => {
    return filteredOrdersByTab.value.filter(o => {
        // Lọc Text
        const matchKeyword =
            o.id.toString().includes(searchKeyword.value) ||
            o.username.toLowerCase().includes(searchKeyword.value.toLowerCase());

        // Lọc Tháng
        let matchMonth = true;
        if (selectedMonth.value) { // Có chọn tháng
            const orderDate = new Date(o.created_at);
            const year = orderDate.getFullYear();
            const month = String(orderDate.getMonth() + 1).padStart(2, '0');
            const formattedOrderMonth = `${year}-${month}`;

            matchMonth = (formattedOrderMonth === selectedMonth.value);
        }

        return matchKeyword && matchMonth;
    });
});

watch([activeTab, searchKeyword, selectedMonth], () => {
    currentPage.value = 1; // Reset về trang 1 khi thay đổi bộ lọc
});


// Đếm số đơn hàng theo trạng thái (CHỈ ĐẾM CÁC ĐƠN ĐANG HIỂN THỊ THEO THÁNG VÀ TÌM KIẾM)
// Sửa lại logic đếm để nó thay đổi linh hoạt theo tháng bạn đang chọn
const pendingCount = computed(() =>
    orders.value.filter(o => {
        let matchMonth = true;
        if (selectedMonth.value) {
            const d = new Date(o.created_at);
            matchMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === selectedMonth.value;
        }
        return matchMonth && (o.status === 'pending' || !o.status);
    }).length
);

const awaitingCount = computed(() =>
    orders.value.filter(o => {
        let matchMonth = true;
        if (selectedMonth.value) {
            const d = new Date(o.created_at);
            matchMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === selectedMonth.value;
        }
        return matchMonth && o.status === 'awaiting_confirmation';
    }).length
);

const completedCount = computed(() =>
    orders.value.filter(o => {
        let matchMonth = true;
        if (selectedMonth.value) {
            const d = new Date(o.created_at);
            matchMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === selectedMonth.value;
        }
        return matchMonth && o.status === 'completed';
    }).length
);

// Tổng số trang
const totalPages = computed(() =>
    Math.ceil(filteredOrders.value.length / itemsPerPage)
);

// Đơn hàng theo trang
const paginatedOrders = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    return filteredOrders.value.slice(start, start + itemsPerPage);
});

function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" }) + " " + date.toLocaleTimeString("zh-TW", { timeZone: "Asia/Taipei" });
}

async function viewOrder(orderId) {
    try {
        const res = await axios.get(`http://localhost:3000/orders/${orderId}`);
        selectedOrder.value = res.data;
        console.log("Chi tiết đơn hàng:", res.data);
    } catch (err) {
        console.error("Lỗi lấy chi tiết đơn hàng:", err);
        alert("Không thể lấy chi tiết đơn hàng");
    }
}

async function confirmDelivery(orderId) {
    if (!confirm("Xác nhận đã giao đơn hàng này?")) return;

    try {
        await axios.put(`http://localhost:3000/orders/${orderId}/confirm`);
        alert("Đơn hàng đã được xác nhận giao");
        // Update order status in list
        const order = orders.value.find(o => o.id === orderId);
        if (order) {
            order.status = 'awaiting_confirmation';
        }
        // Close modal if it's the current order
        if (selectedOrder.value?.order.id === orderId) {
            selectedOrder.value.order.status = 'awaiting_confirmation';
        }
    } catch (err) {
        console.error("Lỗi xác nhận giao đơn hàng:", err);
        alert("Không thể xác nhận giao đơn hàng");
    }
}

onMounted(fetchOrders);
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

/* SEARCH */
.toolbar {
    margin-bottom: 20px;
    display: flex;
    gap: 10px;
}

.search-input {
    padding: 8px 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    width: 300px;
}

/* TABLE */
.table-container {
    overflow-x: auto;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.orders-table {
    width: 100%;
    border-collapse: collapse;
}

.orders-table th {
    background-color: #1e293b;
    color: white;
    padding: 12px;
    text-align: left;
    font-weight: bold;
}

.orders-table td {
    padding: 12px;
    border-bottom: 1px solid #ddd;
}

.orders-table tbody tr:hover {
    background-color: #f5f5f5;
}

.text-center {
    text-align: center;
}

.actions {
    display: flex;
    gap: 10px;
}

.btn {
    padding: 6px 10px;
    border: none;
    cursor: pointer;
    color: white;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
    transition: all 0.3s ease;
}

.btn.yellow {
    background: #f59e0b;
}

.btn.yellow:hover {
    background: #d97706;
}

.btn.green {
    background: #10b981;
}

.btn.green:hover {
    background: #059669;
}

.btn.gray {
    background: #6b7280;
}

.btn.gray:hover {
    background: #4b5563;
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

/* PAGINATION */
.pagination {
    margin-top: 20px;
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px;
}

.pagination button {
    padding: 6px 12px;
    border: 1px solid #ccc;
    background: white;
    color: #333;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.3s ease;
}

.pagination button:hover:not(:disabled) {
    background-color: #1e293b;
    color: white;
}

.pagination button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
}

.modal-content h2 {
    margin-top: 0;
    margin-bottom: 20px;
    color: #1e293b;
}

.modal-content h3 {
    margin-top: 20px;
    margin-bottom: 15px;
    color: #1e293b;
    font-size: 16px;
}

.order-info {
    background-color: #f9f9f9;
    padding: 15px;
    border-radius: 6px;
    margin-bottom: 20px;
}

.info-group {
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
}

.info-group label {
    font-weight: bold;
    color: #555;
}

.info-group p {
    color: #333;
    margin: 0;
}

.info-group p.total {
    color: #dc2626;
    font-weight: bold;
    font-size: 18px;
}

.info-group p.address {
    white-space: pre-wrap;
    word-wrap: break-word;
    line-height: 1.5;
}

/* Modal Items Table */
.modal-items-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
}

.modal-items-table th {
    background-color: #f0f0f0;
    padding: 10px;
    text-align: left;
    font-weight: bold;
    border-bottom: 1px solid #ddd;
}

.modal-items-table td {
    padding: 10px;
    border-bottom: 1px solid #ddd;
}

.modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    justify-content: flex-end;
}

/* RESPONSIVE */
@media (max-width: 768px) {
    .search-input {
        width: 100%;
    }

    .orders-table {
        font-size: 12px;
    }

    .orders-table th,
    .orders-table td {
        padding: 8px;
    }

    .modal-content {
        min-width: auto;
        max-width: 90%;
        padding: 20px;
    }
}

@media (max-width: 480px) {
    .orders-table {
        font-size: 11px;
    }

    .orders-table th,
    .orders-table td {
        padding: 6px;
    }

    .btn {
        padding: 4px 8px;
        font-size: 11px;
    }

    .modal-content {
        min-width: auto;
        max-width: 95%;
        padding: 15px;
    }

    .info-group {
        flex-direction: column;
        gap: 5px;
    }
}
</style>
