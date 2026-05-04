<template>
    <div class="admin-container">
        <h2 class="page-title">🎫 Quản Lý Mã Giảm Giá</h2>

        <!-- KHU VỰC THÊM VOUCHER MỚI -->
        <div class="top-panel">
            <h3>Tạo Mã Khuyến Mãi Mới</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label>Mã Code (VD: TET2026):</label>
                    <input v-model="newVoucher.code" class="form-input" style="text-transform: uppercase;" />
                </div>
                <div class="form-group">
                    <label>% Giảm giá:</label>
                    <input v-model.number="newVoucher.discount_percent" type="number" class="form-input" min="1"
                        max="100" />
                </div>
                <div class="form-group">
                    <label>Giảm tối đa (VND):</label>
                    <input v-model.number="newVoucher.max_discount" type="number" class="form-input" min="0" />
                </div>
                <div class="form-group">
                    <label>Đơn tối thiểu (VND):</label>
                    <input v-model.number="newVoucher.min_order_value" type="number" class="form-input" min="0" />
                </div>
                <div class="form-group">
                    <label>Số lượng mã:</label>
                    <input v-model.number="newVoucher.usage_limit" type="number" class="form-input" min="1" />
                </div>
                <div class="form-group">
                    <label>Hạn sử dụng:</label>
                    <input v-model="newVoucher.expiry_date" type="datetime-local" class="form-input" />
                </div>
                <div class="form-group">
                    <label>Loại phân phối:</label>
                    <select v-model="newVoucher.type" class="form-input">
                        <option value="public">Công khai (Tất cả KH)</option>
                        <option value="private">Tặng Riêng (Private)</option>
                    </select>
                </div>
                <div class="form-group" v-if="newVoucher.type === 'private'">
                    <label>ID Khách hàng nhận:</label>
                    <input v-model.number="newVoucher.target_user_id" type="number" class="form-input"
                        placeholder="Nhập ID User (Ví dụ: 1)..." />
                </div>
                <div class="form-group" v-if="newVoucher.type === 'public'">
                    <label>Dành riêng cho hạng:</label>
                    <select v-model="newVoucher.target_tier" class="form-input">
                        <option value="all">Tất cả khách hàng</option>
                        <option value="bronze">Từ hạng Đồng (Bronze) trở lên</option>
                        <option value="silver">Từ hạng Bạc (Silver) trở lên</option>
                        <option value="gold">Chỉ dành cho VIP Vàng (Gold)</option>
                    </select>
                </div>
            </div>
            <button @click="createVoucher" class="btn green mt-15">Tạo Mã Giảm Giá</button>
        </div>

        <!-- DANH SÁCH VOUCHER -->
        <div class="list-panel">
            <h3>Danh Sách Mã Đang Hoạt Động</h3>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Mã Code</th>
                            <th>Mức Giảm</th>
                            <th>Đơn Tối Thiểu</th>
                            <th>Đã Dùng / Tổng</th>
                            <th>Hạn Sử Dụng</th>
                            <th>Trạng Thái</th>
                            <th>Hành Động</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="v in vouchers" :key="v.id">
                            <td>
                                <strong style="color: #3b82f6; display: block; margin-bottom: 5px;">{{ v.code
                                    }}</strong>
                                <span v-if="v.type === 'private'" class="badge-type private">Private</span>
                                <span v-else class="badge-type public">Public</span>
                            </td>
                            <td>{{ v.discount_percent }}% (Tối đa {{ Number(v.max_discount).toLocaleString() }}đ)</td>
                            <td>{{ Number(v.min_order_value).toLocaleString() }}đ</td>
                            <td>
                                <!-- Thanh tiến độ (Progress bar) -->
                                <div class="progress-bar-bg">
                                    <div class="progress-bar-fill"
                                        :style="{ width: (v.used_count / v.usage_limit) * 100 + '%' }"></div>
                                </div>
                                <span style="font-size: 12px; color: #64748b;">{{ v.used_count }} / {{ v.usage_limit
                                    }}</span>
                            </td>
                            <td>{{ formatDate(v.expiry_date) }}</td>
                            <td>
                                <span :class="['status-badge', getStatusClass(v)]">
                                    {{ getStatusText(v) }}
                                </span>
                            </td>
                            <td>
                                <button @click="deleteVoucher(v.id)" class="btn-delete">Xóa</button>
                            </td>
                        </tr>
                        <tr v-if="vouchers.length === 0">
                            <td colspan="7" style="text-align: center; padding: 20px; color: #64748b;">Chưa có mã giảm
                                giá nào được tạo.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";
import { toast } from "vue3-toastify";

const vouchers = ref([]);
const newVoucher = ref({
    code: "",
    discount_percent: 10,
    max_discount: 50000,
    min_order_value: 100000,
    usage_limit: 100,
    expiry_date: "",
    type: "public",
    target_user_id: null
});

async function fetchVouchers() {
    try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/vouchers`);
        vouchers.value = res.data;
    } catch (err) {
        toast.error("Không thể lấy danh sách voucher");
    }
}

async function createVoucher() {
    if (!newVoucher.value.code || !newVoucher.value.expiry_date) {
        toast.warning("Vui lòng điền đủ Mã Code và Hạn sử dụng!");
        return;
    }

    try {
        // Ép mã code viết hoa
        newVoucher.value.code = newVoucher.value.code.trim().toUpperCase();

        await axios.post(`${import.meta.env.VITE_API_URL}/vouchers`, newVoucher.value);
        toast.success("Tạo mã thành công!");

        // Reset form
        newVoucher.value.code = "";
        fetchVouchers();
    } catch (err) {
        toast.error(err.response?.data?.message || "Lỗi khi tạo mã!");
    }
}

async function deleteVoucher(id) {
    if (!confirm("Xác nhận xóa mã giảm giá này?")) return;

    try {
        await axios.delete(`${import.meta.env.VITE_API_URL}/vouchers/${id}`);
        toast.success("Đã xóa mã giảm giá");
        fetchVouchers();
    } catch (err) {
        toast.error("Lỗi khi xóa mã");
    }
}

// Hàm format giao diện
function formatDate(dateString) {
    const d = new Date(dateString);
    return d.toLocaleString('vi-VN');
}

function getStatusText(v) {
    const now = new Date();
    const expiry = new Date(v.expiry_date);
    if (v.used_count >= v.usage_limit) return "Hết lượt";
    if (now > expiry) return "Hết hạn";
    return "Đang chạy";
}

function getStatusClass(v) {
    const text = getStatusText(v);
    if (text === "Đang chạy") return "status-active";
    return "status-expired";
}

onMounted(() => {
    fetchVouchers();
});
</script>

<style scoped>
.admin-container {
    padding: 20px;
    background: #f1f5f9;
    min-height: 100vh;
}

.page-title {
    color: #1e293b;
    margin-bottom: 25px;
}

.top-panel,
.list-panel {
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    margin-bottom: 25px;
}

.top-panel h3,
.list-panel h3 {
    margin-top: 0;
    margin-bottom: 20px;
    color: #334155;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 10px;
}

.form-grid {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 25px 20px !important;
    margin-bottom: 25px !important;
}

.form-group {
    display: flex !important;
    flex-direction: column !important;
    margin: 0 !important;
}

.form-group label {
    margin-bottom: 8px !important;
    font-size: 14px;
    font-weight: 600;
    color: #475569;
}

.form-input {
    width: 100% !important;
    padding: 12px 15px !important;
    border: 1px solid #cbd5e1 !important;
    border-radius: 8px !important;
    background-color: #ffffff !important;
    box-sizing: border-box !important;
    font-size: 15px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.form-input:focus {
    outline: none !important;
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15) !important;
}

.mt-15 {
    margin-top: 20px !important;
}

.badge-type {
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
}

.badge-type.public {
    background: #e0f2fe;
    color: #0284c7;
    border: 1px solid #bae6fd;
}

.badge-type.private {
    background: #fce7f3;
    color: #db2777;
    border: 1px solid #fbcfe8;
}

.btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    color: white;
}

.btn.green {
    background: #10b981;
}

.btn.green:hover {
    background: #059669;
}

.btn-delete {
    padding: 6px 12px;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

/* BẢNG DATA */
.table-container {
    overflow-x: auto;
}

.data-table {
    width: 100%;
    border-collapse: collapse;
}

.data-table th,
.data-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
}

.data-table th {
    background: #f8fafc;
    color: #475569;
}

/* TRẠNG THÁI & PROGRESS BAR */
.progress-bar-bg {
    width: 100%;
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    margin-bottom: 4px;
    overflow: hidden;
}

.progress-bar-fill {
    height: 100%;
    background: #3b82f6;
    transition: width 0.3s;
}

.status-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
}

.status-active {
    background: #dcfce7;
    color: #166534;
}

.status-expired {
    background: #fee2e2;
    color: #991b1b;
}
</style>