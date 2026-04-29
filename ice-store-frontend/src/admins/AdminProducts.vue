<template>
    <div class="add-section">
        <h2>Thêm sản phẩm mới</h2>
        <div class="form-group">
            <input v-model="newProduct.name" placeholder="Tên sản phẩm" class="form-input" />
            <input v-model.number="newProduct.price" placeholder="Giá Bán (VND)" type="number" class="form-input" />

            <select v-model="newProduct.category_id" class="form-input category-select">
                <option value="" disabled>-- Chọn danh mục --</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                    {{ cat.name }}
                </option>
            </select>
            <input type="file" @change="handleImageUploadNew" accept="image/*" class="form-input file-input" />
        </div>
        <div class="form-group">
            <label>Số lượng kho ban đầu:</label>
            <input v-model.number="newProduct.stock" placeholder="Kho" type="number" class="form-input" min="0" />
            <label>Giá vốn (Nhập/SX):</label>
            <input v-model.number="newProduct.import_price" placeholder="Giá nhập" type="number" class="form-input"
                min="0" />
            <button @click="addProduct" class="btn green" style="margin-left: 10px;">Thêm sản phẩm</button>
        </div>
        <img v-if="newProduct.image" :src="newProduct.image" class="image-preview" />
    </div>

    <div class="toolbar">
        <input v-model="searchKeyword" placeholder="Tìm kiếm sản phẩm theo tên..." class="search-input" />
    </div>

    <div class="product-grid">
        <div v-for="p in paginatedProducts" :key="p.id" class="product-card">
            <div class="card-header">
                <h3 class="product-name">{{ p.name }}</h3>
                <span class="category-badge">{{ getCategoryName(p.category_id) }}</span>
            </div>

            <div class="price-stock-row">
                <div>
                    <p class="product-price">Bán: {{ Number(p.price).toLocaleString('vi-VN') }} ₫</p>
                    <p class="product-import-price">Vốn: {{ Number(p.import_price || 0).toLocaleString('vi-VN') }} ₫</p>
                </div>
                <span :class="['stock-badge', getStockClass(p.stock)]">
                    Kho: {{ p.stock }}
                </span>
            </div>

            <img :src="p.image || 'https://via.placeholder.com/200?text=No+Image'" class="product-image" />

            <div class="actions">
                <button @click="openRestockModal(p)" class="btn blue">Nhập</button>
                <button @click="startEdit(p)" class="btn yellow">Sửa</button>
                <button @click="deleteProduct(p.id)" class="btn red">Xóa</button>
            </div>
        </div>
    </div>

    <div class="pagination">
        <button :disabled="currentPage === 1" @click="currentPage--">Prev</button>
        <span>Trang {{ currentPage }} / {{ totalPages }}</span>
        <button :disabled="currentPage === totalPages" @click="currentPage++">Next</button>
    </div>

    <div v-if="restockProduct" class="modal-overlay" @click="restockProduct = null">
        <div class="modal-content" @click.stop>
            <h2>Nhập hàng: <span style="color: #3b82f6;">{{ restockProduct.name }}</span></h2>
            <p style="margin-top: 0; color: #64748b; font-size: 14px;">Tồn kho hiện tại: <strong>{{ restockProduct.stock
                    }}</strong></p>

            <div class="form-row">
                <div class="form-group half-width">
                    <label>Số lượng nhập thêm:</label>
                    <input v-model.number="restockForm.quantity" type="number" class="form-input" min="1" />
                </div>
                <div class="form-group half-width">
                    <label>Giá vốn / 1 sản phẩm:</label>
                    <input v-model.number="restockForm.import_price" type="number" class="form-input" min="0" />
                </div>
            </div>

            <div class="form-group">
                <label>Ghi chú (Nguồn nhập, lô hàng...):</label>
                <input v-model="restockForm.note" class="form-input" placeholder="VD: Nhập lô hàng từ NCC A..." />
            </div>

            <div style="margin-top: 15px; padding: 15px; background: #f8fafc; border-radius: 6px;">
                <strong>Tổng chi phí lô hàng: </strong>
                <span style="color: #dc2626; font-size: 18px; font-weight: bold;">
                    {{ (restockForm.quantity * restockForm.import_price).toLocaleString('vi-VN') }} VND
                </span>
            </div>

            <div class="modal-actions">
                <button @click="submitRestock" class="btn blue">Xác nhận nhập kho</button>
                <button @click="restockProduct = null" class="btn gray">Hủy</button>
            </div>
        </div>
    </div>

    <div v-if="editProduct" class="modal-overlay" @click="editProduct = null">
        <div class="modal-content" @click.stop>
            <h2>Sửa sản phẩm</h2>
            <div class="form-group">
                <label>Tên sản phẩm:</label>
                <input v-model="editProduct.name" class="form-input" />
            </div>
            <div class="form-row">
                <div class="form-group half-width">
                    <label>Giá Bán (VND):</label>
                    <input v-model.number="editProduct.price" type="number" class="form-input" />
                </div>
                <div class="form-group half-width">
                    <label>Giá Vốn (VND):</label>
                    <input v-model.number="editProduct.import_price" type="number" class="form-input" />
                </div>
            </div>
            <div class="form-row">
                <div class="form-group half-width">
                    <label>Sửa kho (Thủ công):</label>
                    <input v-model.number="editProduct.stock" type="number" class="form-input" min="0" />
                </div>
                <div class="form-group half-width">
                    <label>Danh mục:</label>
                    <select v-model="editProduct.category_id" class="form-input category-select">
                        <option value="" disabled>-- Chọn danh mục --</option>
                        <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Ảnh sản phẩm (Để trống nếu không đổi):</label>
                <input type="file" @change="handleImageUploadEdit" accept="image/*" class="form-input file-input" />
            </div>
            <div class="preview-container">
                <img :src="editProduct.image || 'https://via.placeholder.com/200?text=No+Image'"
                    class="image-preview-modal" />
            </div>
            <div class="modal-actions">
                <button @click="saveEdit" class="btn green">Lưu thay đổi</button>
                <button @click="editProduct = null" class="btn gray">Hủy</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import axios from "axios";
import { toast } from "vue3-toastify";

const products = ref([]);
const categories = ref([]);
// Cập nhật state thêm import_price
const newProduct = ref({ name: "", price: 0, imageFile: null, category_id: "", stock: 0, import_price: 0 });
const editProduct = ref(null);

// === STATE CHO NHẬP HÀNG ===
const restockProduct = ref(null);
const restockForm = ref({ quantity: 1, import_price: 0, note: "" });

const searchKeyword = ref("");
const currentPage = ref(1);
const itemsPerPage = 6;

async function fetchProducts() {
    try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/products`);
        products.value = res.data;
    } catch (err) {
        console.error("Lỗi lấy sản phẩm:", err);
    }
}

async function fetchCategories() {
    try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/categories`);
        categories.value = res.data;
    } catch (err) {
        console.error("Lỗi lấy danh mục:", err);
    }
}

function getStockClass(stock) {
    if (stock <= 0) return 'stock-empty';
    if (stock <= 10) return 'stock-low';
    return 'stock-okay';
}

function getCategoryName(id) {
    if (!id) return "Chưa phân loại";
    const cat = categories.value.find(c => c.id === id);
    return cat ? cat.name : "Chưa phân loại";
}

function handleImageUploadNew(event) {
    const file = event.target.files[0];
    if (file) newProduct.value.imageFile = file;
}

function handleImageUploadEdit(event) {
    const file = event.target.files[0];
    if (file) editProduct.value.imageFile = file;
}

const filteredProducts = computed(() => {
    return products.value.filter(p => p.name.toLowerCase().includes(searchKeyword.value.toLowerCase()));
});

const totalPages = computed(() => {
    const total = Math.ceil(filteredProducts.value.length / itemsPerPage);
    return total > 0 ? total : 1;
});

const paginatedProducts = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    return filteredProducts.value.slice(start, start + itemsPerPage);
});

// Thêm sản phẩm
async function addProduct() {
    if (!newProduct.value.name || !newProduct.value.price || !newProduct.value.imageFile || !newProduct.value.category_id) {
        toast.warning("Vui lòng điền đủ Tên, Giá, Ảnh và Danh mục!");
        return;
    }
    try {
        const formData = new FormData();
        formData.append("name", newProduct.value.name);
        formData.append("price", newProduct.value.price);
        formData.append("image", newProduct.value.imageFile);
        formData.append("category_id", newProduct.value.category_id);
        formData.append("stock", newProduct.value.stock);
        // Gửi thêm giá nhập
        formData.append("import_price", newProduct.value.import_price || 0);

        await axios.post(`${import.meta.env.VITE_API_URL}/products`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Thêm sản phẩm thành công!");
        newProduct.value = { name: "", price: 0, imageFile: null, category_id: "", stock: 0, import_price: 0 };
        fetchProducts();
    } catch (err) {
        toast.error("Lỗi thêm sản phẩm");
    }
}

function startEdit(p) {
    editProduct.value = { ...p };
}

// Lưu sửa sản phẩm
async function saveEdit() {
    if (!editProduct.value.name || !editProduct.value.price || !editProduct.value.category_id) {
        toast.warning("Vui lòng điền đủ tên, giá và danh mục");
        return;
    }
    try {
        const formData = new FormData();
        formData.append("name", editProduct.value.name);
        formData.append("price", editProduct.value.price);
        formData.append("category_id", editProduct.value.category_id);
        formData.append("stock", editProduct.value.stock);
        formData.append("import_price", editProduct.value.import_price || 0);

        if (editProduct.value.imageFile) formData.append("image", editProduct.value.imageFile);

        await axios.put(`${import.meta.env.VITE_API_URL}/products/${editProduct.value.id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Cập nhật sản phẩm thành công");
        editProduct.value = null;
        fetchProducts();
    } catch (err) {
        toast.error("Lỗi cập nhật sản phẩm");
    }
}

async function deleteProduct(id) {
    if (confirm("Bạn có chắc muốn xóa sản phẩm này?")) {
        await axios.delete(`${import.meta.env.VITE_API_URL}/products/${id}`);
        toast.success("Đã xóa sản phẩm");
        fetchProducts();
    }
}

// === CÁC HÀM XỬ LÝ NHẬP HÀNG ===
function openRestockModal(product) {
    restockProduct.value = product;
    // Điền sẵn giá nhập cũ để Admin đỡ phải gõ lại
    restockForm.value = {
        quantity: 10,
        import_price: product.import_price || 0,
        note: ""
    };
}

async function submitRestock() {
    if (restockForm.value.quantity <= 0) {
        toast.warning("Số lượng nhập phải lớn hơn 0");
        return;
    }
    try {
        await axios.post(`${import.meta.env.VITE_API_URL}/products/${restockProduct.value.id}/restock`, {
            quantity_added: restockForm.value.quantity,
            import_price: restockForm.value.import_price,
            note: restockForm.value.note
        });
        toast.success(`Đã nhập thêm ${restockForm.value.quantity} sản phẩm vào kho!`);
        restockProduct.value = null;
        fetchProducts(); // Tải lại danh sách để thấy số lượng kho tăng lên
    } catch (err) {
        toast.error("Lỗi nhập hàng!");
        console.error(err);
    }
}

onMounted(() => {
    fetchCategories();
    fetchProducts();
});
</script>

<style scoped>
/* ADD SECTION */
.add-section {
    background: #f8fafc;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    border: 1px solid #e2e8f0;
}

.add-section h2 {
    margin-bottom: 15px;
    color: #1e293b;
}

.form-group {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
    flex-wrap: wrap;
    align-items: center;
}

.form-group label {
    display: block;
    width: 100%;
    font-weight: bold;
    margin-bottom: 5px;
    color: #475569;
}

.form-input {
    padding: 10px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    flex: 1;
    min-width: 200px;
    font-size: 14px;
}

.form-input:focus {
    outline: none;
    border-color: #38bdf8;
}

.category-select {
    background-color: white;
    cursor: pointer;
}

.file-input {
    background-color: white;
    padding: 7px;
}

/* SEARCH */
.toolbar {
    margin-bottom: 20px;
}

.search-input {
    width: 100%;
    max-width: 400px;
    padding: 10px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 15px;
}

/* GRID */
.product-grid {
    display: grid;
    gap: 20px;
}

/* MOBILE 1 CỘT */
@media (max-width: 768px) {
    .product-grid {
        grid-template-columns: 1fr;
    }
}

/* TABLET 2 CỘT */
@media (min-width: 769px) and (max-width: 1200px) {
    .product-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

/* DESKTOP 3 CỘT */
@media (min-width: 1201px) {
    .product-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

/* CARD */
.product-card {
    border: 1px solid #e2e8f0;
    padding: 20px;
    border-radius: 10px;
    background: white;
    display: flex;
    flex-direction: column;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
}

.product-name {
    margin: 0;
    font-size: 18px;
    color: #1e293b;
    flex: 1;
}

.category-badge {
    background-color: #e0f2fe;
    color: #0369a1;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    margin-left: 10px;
}

.product-price {
    font-weight: bold;
    color: #dc2626;
    font-size: 16px;
}

.product-image {
    width: 100%;
    height: 200px;
    object-fit: cover;
    margin: 15px 0;
    border-radius: 6px;
    border: 1px solid #f1f5f9;
}

.actions {
    display: flex;
    gap: 10px;
    margin-top: auto;
}

.price-stock-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.stock-badge {
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 700;
}

/* Màu cho các trạng thái kho */
.stock-okay {
    background-color: #dcfce7;
    color: #166534;
    border: 1px solid #bbf7d0;
}

.stock-low {
    background-color: #ffedd5;
    color: #9a3412;
    border: 1px solid #fed7aa;
}

.stock-empty {
    background-color: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
}

/* Điều chỉnh lại card header để tên không đè lên badge */
.card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 5px;
    gap: 10px;
}

.btn {
    padding: 8px 16px;
    border: none;
    cursor: pointer;
    color: white;
    border-radius: 6px;
    font-weight: 500;
    flex: 1;
    transition: opacity 0.2s;
}

.btn:hover {
    opacity: 0.9;
}

.btn.yellow {
    background: #f59e0b;
}

.btn.red {
    background: #dc2626;
}

.btn.green {
    background: #10b981;
}

.btn.gray {
    background: #64748b;
}

/* Bổ sung nút màu xanh cho chức năng Nhập hàng */
.btn.blue {
    background: #3b82f6;
}

.btn.blue:hover {
    background: #2563eb;
}

.product-import-price {
    margin: 5px 0 0 0;
    font-size: 13px;
    color: #64748b;
    font-weight: 500;
}

/* PAGINATION */
.pagination {
    margin-top: 30px;
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px;
}

.pagination button {
    padding: 8px 16px;
    border: 1px solid #cbd5e1;
    background: white;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
}

.pagination button:disabled {
    background: #f1f5f9;
    color: #94a3b8;
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
    z-index: 1000;
}

.modal-content {
    background: white;
    padding: 30px;
    border-radius: 12px;
    min-width: 450px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-content h2 {
    margin-bottom: 20px;
    color: #1e293b;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 10px;
}

.modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 25px;
    justify-content: flex-end;
}

.form-row {
    display: flex;
    gap: 15px;
    width: 100%;
}

.half-width {
    flex: 1;
}

.preview-container {
    display: flex;
    justify-content: center;
    margin-top: 15px;
    padding: 10px;
    background-color: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 8px;
}

.image-preview-modal {
    max-width: 150px;
    max-height: 150px;
    border-radius: 6px;
    object-fit: cover;
    display: block;
    margin: 0;
    /* Xóa margin-top cũ */
}

/* IMAGE PREVIEW */
.image-preview {
    max-width: 100px;
    max-height: 100px;
    margin-top: 10px;
    border-radius: 6px;
    object-fit: cover;
    border: 1px solid #cbd5e1;
}

.image-preview-modal {
    max-width: 150px;
    max-height: 150px;
    margin-top: 10px;
    border-radius: 6px;
    object-fit: cover;
    display: block;
}
</style>