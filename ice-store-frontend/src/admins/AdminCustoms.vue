<template>
    <!-- SEARCH -->
    <div class="toolbar">
        <input v-model="searchKeyword" placeholder="Tìm kiếm khách hàng..." class="search-input" />
    </div>

    <!-- CUSTOMER TABLE -->
    <div class="table-container">
        <table class="customers-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Tên đăng nhập</th>
                    <th>Ngày tạo</th>
                    <th>Hành động</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="customer in paginatedCustomers" :key="customer.id">
                    <td>{{ customer.id }}</td>
                    <td>{{ customer.username }}</td>
                    <td>{{ formatDate(customer.created_at) }}</td>
                    <td class="actions">
                        <button @click="viewCustomer(customer)" class="btn yellow">Xem</button>
                        <button @click="deleteCustomer(customer.id)" class="btn red">Xóa</button>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- PAGINATION -->
    <div class="pagination">
        <button :disabled="currentPage === 1" @click="currentPage--">
            Prev
        </button>

        <span>Trang {{ currentPage }} / {{ totalPages }}</span>

        <button :disabled="currentPage === totalPages" @click="currentPage++">
            Next
        </button>
    </div>

    <!-- CUSTOMER DETAIL MODAL -->
    <div v-if="selectedCustomer" class="modal-overlay" @click="selectedCustomer = null">
        <div class="modal-content" @click.stop>
            <h2>Thông tin khách hàng</h2>
            <div class="info-group">
                <label>ID:</label>
                <p>{{ selectedCustomer.id }}</p>
            </div>
            <div class="info-group">
                <label>Tên đăng nhập:</label>
                <p>{{ selectedCustomer.username }}</p>
            </div>
            <div class="info-group">
                <label>Ngày tạo:</label>
                <p>{{ formatDate(selectedCustomer.created_at) }}</p>
            </div>
            <div class="modal-actions">
                <button @click="selectedCustomer = null" class="btn gray">Đóng</button>
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
        console.log("Đang lấy danh sách khách hàng...");
        const res = await axios.get("http://localhost:3000/customers");
        console.log("Danh sách khách hàng:", res.data);
        customers.value = res.data;
    } catch (err) {
        console.error("Lỗi lấy danh sách khách hàng:", err);
        alert("Không thể lấy danh sách khách hàng: " + err.message);
    }
}

// Lọc theo tìm kiếm
const filteredCustomers = computed(() => {
    return customers.value.filter(c =>
        c.username.toLowerCase().includes(searchKeyword.value.toLowerCase())
    );
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
    return date.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" });
}

async function deleteCustomer(id) {
    if (confirm("Bạn có chắc muốn xóa khách hàng này?")) {
        try {
            const res = await axios.delete(`http://localhost:3000/customers/${id}`);
            alert("Xóa khách hàng thành công");
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

.customers-table {
    width: 100%;
    border-collapse: collapse;
}

.customers-table th {
    background-color: #1e293b;
    color: white;
    padding: 12px;
    text-align: left;
    font-weight: bold;
}

.customers-table td {
    padding: 12px;
    border-bottom: 1px solid #ddd;
}

.customers-table tbody tr:hover {
    background-color: #f5f5f5;
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

.btn.red {
    background: #dc2626;
}

.btn.red:hover {
    background: #991b1b;
}

.btn.gray {
    background: #6b7280;
}

.btn.gray:hover {
    background: #4b5563;
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
}

.modal-content {
    background: white;
    padding: 30px;
    border-radius: 8px;
    min-width: 400px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.modal-content h2 {
    margin-bottom: 20px;
    color: #1e293b;
}

.info-group {
    margin-bottom: 15px;
}

.info-group label {
    display: block;
    font-weight: bold;
    color: #555;
    margin-bottom: 5px;
}

.info-group p {
    color: #333;
    padding: 8px;
    background-color: #f9fafb;
    border-radius: 4px;
    margin: 0;
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

    .customers-table {
        font-size: 12px;
    }

    .customers-table th,
    .customers-table td {
        padding: 8px;
    }

    .modal-content {
        min-width: auto;
        max-width: 90%;
        padding: 20px;
    }

    .actions {
        flex-direction: column;
    }
}

@media (max-width: 480px) {
    .customers-table {
        font-size: 11px;
    }

    .customers-table th,
    .customers-table td {
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
}
</style>
