<template>
    <div class="admin-container">
        <div class="header-row">
            <h1 class="title">🗑️ Thùng rác sản phẩm</h1>
            <router-link to="/admin/products" class="btn-back">⬅ Quay lại danh sách</router-link>
        </div>

        <div v-if="loading" class="loading">Đang tải dữ liệu...</div>
        <div v-else-if="trashedProducts.length === 0" class="empty">Thùng rác trống.</div>

        <table v-else class="admin-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Hình ảnh</th>
                    <th>Tên sản phẩm</th>
                    <th>Giá bán</th>
                    <th>Hành động</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="p in trashedProducts" :key="p.id">
                    <td>{{ p.id }}</td>
                    <td><img :src="p.image" class="product-img" alt="img" /></td>
                    <td class="product-name">{{ p.name }}</td>
                    <td class="product-price">{{ Number(p.price).toLocaleString('vi-VN') }} ₫</td>
                    <td>
                        <button @click="restoreProduct(p.id)" class="btn-restore">🔄 Khôi phục</button>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";

const trashedProducts = ref([]);
const loading = ref(false);

async function fetchTrash() {
    loading.value = true;
    try {
        const res = await axios.get("http://localhost:3000/products/trash");
        trashedProducts.value = res.data;
    } catch (err) {
        console.error("Lỗi lấy dữ liệu thùng rác:", err);
    } finally {
        loading.value = false;
    }
}

async function restoreProduct(id) {
    if (!confirm("Bạn có chắc chắn muốn khôi phục sản phẩm này để bán lại không?")) return;

    try {
        await axios.put(`http://localhost:3000/products/${id}/restore`);
        alert("Khôi phục thành công!");
        fetchTrash(); // Load lại danh sách thùng rác
    } catch (err) {
        alert("Lỗi khôi phục sản phẩm");
    }
}

onMounted(() => {
    fetchTrash();
});
</script>

<style scoped>
.admin-container {
    padding: 20px;
    background-color: #f8fafc;
    min-height: 88vh;
}

.header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.title {
    font-size: 24px;
    color: #1e293b;
    margin: 0;
}

.btn-back {
    background-color: #64748b;
    color: white;
    padding: 10px 15px;
    border-radius: 5px;
    text-decoration: none;
    font-weight: bold;
    transition: 0.3s;
}

.btn-back:hover {
    background-color: #475569;
}

.loading,
.empty {
    text-align: center;
    padding: 40px;
    color: #64748b;
    font-size: 18px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.admin-table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    overflow: hidden;
}

.admin-table th {
    background-color: #1e293b;
    color: white;
    padding: 12px;
    text-align: left;
}

.admin-table td {
    padding: 12px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: middle;
}

.product-img {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 4px;
}

.product-name {
    font-weight: 600;
}

.product-price {
    color: #dc2626;
    font-weight: bold;
}

.btn-restore {
    background-color: #10b981;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: 0.3s;
}

.btn-restore:hover {
    background-color: #059669;
}
</style>