<template>
    <div class="container">
        <div class="toolbar">
            <input v-model="searchKeyword" placeholder="Tìm kiếm theo Tên, SĐT, Email hoặc Username..."
                class="search-input" />
        </div>

        <div class="table-container">
            <table class="customers-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Tên đăng nhập</th>
                        <th>Họ và tên</th>
                        <th>Số điện thoại</th>
                        <th>Ngày tạo</th>
                        <th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="customer in paginatedCustomers" :key="customer.id">
                        <td>#{{ customer.id }}</td>
                        <td style="font-weight: bold;">{{ customer.username }}</td>
                        <td>{{ customer.full_name || '---' }}</td>
                        <td>{{ customer.phone || '---' }}</td>
                        <td>{{ formatDate(customer.created_at) }}</td>
                        <td class="actions">
                            <button @click="viewCustomer(customer)" class="btn yellow">Xem</button>
                            <button @click="deleteCustomer(customer.id)" class="btn red">Xóa</button>
                        </td>
                    </tr>
                    <tr v-if="filteredCustomers.length === 0">
                        <td colspan="6" class="empty">Không tìm thấy khách hàng nào.</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="pagination" v-if="totalPages > 0">
            <button :disabled="currentPage === 1" @click="currentPage--">Prev</button>
            <span>Trang {{ currentPage }} / {{ totalPages }}</span>
            <button :disabled="currentPage === totalPages" @click="currentPage++">Next</button>
        </div>

        <div v-if="selectedCustomer" class="modal-overlay" @click="selectedCustomer = null">
            <div class="modal-content" @click.stop>
                <h2>Thông tin chi tiết khách hàng</h2>

                <div class="info-grid">
                    <div class="info-group">
                        <label>ID Tài khoản:</label>
                        <p>#{{ selectedCustomer.id }}</p>
                    </div>
                    <div class="info-group">
                        <label>Tên đăng nhập:</label>
                        <p>{{ selectedCustomer.username }}</p>
                    </div>
                    <div class="info-group">
                        <label>Họ và tên:</label>
                        <p>{{ selectedCustomer.full_name || 'Chưa cập nhật' }}</p>
                    </div>
                    <div class="info-group">
                        <label>Số điện thoại:</label>
                        <p>{{ selectedCustomer.phone || 'Chưa cập nhật' }}</p>
                    </div>
                    <div class="info-group" style="grid-column: 1 / -1;">
                        <label>Email:</label>
                        <p>{{ selectedCustomer.email || 'Chưa cập nhật' }}</p>
                    </div>
                    <div class="info-group" style="grid-column: 1 / -1;">
                        <label>Địa chỉ giao hàng:</label>
                        <p>{{ selectedCustomer.address || 'Chưa cập nhật' }}</p>
                    </div>
                    <div class="info-group" style="grid-column: 1 / -1;">
                        <label>Ngày đăng ký:</label>
                        <p>{{ formatDate(selectedCustomer.created_at) }}</p>
                    </div>
                </div>

                <div class="modal-actions">
                    <button @click="selectedCustomer = null" class="btn gray">Đóng cửa sổ</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import axios from "axios";

const customers = ref([]);
const searchKeyword = ref("");
const selectedCustomer = ref(null);
const currentPage = ref(1);
const itemsPerPage = 10;

async function fetchCustomers() {
    try {
        const res = await axios.get("https://icestore-api.onrender.com/customers");
        customers.value = res.data;
    } catch (err) {
        console.error("Lỗi lấy danh sách khách hàng:", err);
        alert("Không thể lấy danh sách khách hàng: " + err.message);
    }
}

// Lọc theo tìm kiếm (Đã nâng cấp: tìm được cả Tên, Email, SĐT)
const filteredCustomers = computed(() => {
    const kw = searchKeyword.value.toLowerCase();
    return customers.value.filter(c => {
        const username = c.username ? c.username.toLowerCase() : "";
        const fullName = c.full_name ? c.full_name.toLowerCase() : "";
        const email = c.email ? c.email.toLowerCase() : "";
        const phone = c.phone ? c.phone.toLowerCase() : "";

        return username.includes(kw) ||
            fullName.includes(kw) ||
            email.includes(kw) ||
            phone.includes(kw);
    });
});

// Tổng số trang
const totalPages = computed(() =>
    Math.ceil(filteredCustomers.value.length / itemsPerPage)
);

// Khách hàng theo trang
const paginatedCustomers = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    return filteredCustomers.value.slice(start, start + itemsPerPage);
});

function viewCustomer(customer) {
    selectedCustomer.value = customer;
}

function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei", hour: "2-digit", minute: "2-digit" });
}

async function deleteCustomer(id) {
    if (confirm("Bạn có chắc muốn xóa vĩnh viễn khách hàng này cùng toàn bộ đơn hàng của họ?")) {
        try {
            await axios.delete(`https://icestore-api.onrender.com/customers/${id}`);
            alert("Xóa khách hàng thành công");

            // Trở về trang 1 nếu xóa hết item ở trang cuối
            if (paginatedCustomers.value.length === 1 && currentPage.value > 1) {
                currentPage.value--;
            }
            fetchCustomers();
        } catch (err) {
            console.error("Lỗi xóa khách hàng:", err);
            const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message;
            alert("Lỗi xóa khách hàng: " + errorMsg);
        }
    }
}

onMounted(fetchCustomers);
</script>

<style scoped>
.container {
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
}

/* SEARCH */
.toolbar {
    margin-bottom: 20px;
    display: flex;
    gap: 10px;
}

.search-input {
    padding: 10px 15px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 14px;
    width: 400px;
    transition: all 0.3s;
}

.search-input:focus {
    outline: none;
    border-color: #38bdf8;
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
}

/* TABLE */
.table-container {
    overflow-x: auto;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.customers-table {
    width: 100%;
    border-collapse: collapse;
}

.customers-table th {
    background-color: #1e293b;
    color: white;
    padding: 14px 16px;
    text-align: left;
    font-weight: 600;
}

.customers-table td {
    padding: 14px 16px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
}

.customers-table tbody tr:hover {
    background-color: #f8fafc;
}

.empty {
    text-align: center;
    padding: 30px !important;
    color: #64748b !important;
}

.actions {
    display: flex;
    gap: 8px;
}

.btn {
    padding: 6px 12px;
    border: none;
    cursor: pointer;
    color: white;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.2s ease;
}

.btn.yellow {
    background: #f59e0b;
}

.btn.yellow:hover {
    background: #d97706;
}

.btn.red {
    background: #ef4444;
}

.btn.red:hover {
    background: #dc2626;
}

.btn.gray {
    background: #64748b;
    padding: 10px 20px;
}

.btn.gray:hover {
    background: #475569;
}

/* PAGINATION */
.pagination {
    margin-top: 24px;
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
    background-color: #f1f5f9;
    border-color: #94a3b8;
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
    background: rgba(15, 23, 42, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1001;
}

.modal-content {
    background: white;
    padding: 32px;
    border-radius: 12px;
    width: 500px;
    max-width: 90%;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    animation: modalFadeIn 0.3s ease;
}

@keyframes modalFadeIn {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.modal-content h2 {
    margin-top: 0;
    margin-bottom: 24px;
    color: #0f172a;
    font-size: 20px;
    border-bottom: 2px solid #f1f5f9;
    padding-bottom: 12px;
}

/* Dàn layout 2 cột cho Modal nhìn chuyên nghiệp hơn */
.info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.info-group label {
    display: block;
    font-weight: 600;
    color: #64748b;
    margin-bottom: 6px;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.info-group p {
    color: #1e293b;
    padding: 10px 12px;
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    margin: 0;
    font-size: 15px;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 28px;
    padding-top: 20px;
    border-top: 1px solid #e2e8f0;
}

/* RESPONSIVE */
@media (max-width: 768px) {
    .search-input {
        width: 100%;
    }

    .info-grid {
        grid-template-columns: 1fr;
    }
}
</style>