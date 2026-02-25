<template>
    <!-- ADD PRODUCT FORM -->
    <div class="add-section">
        <h2>Thêm sản phẩm mới</h2>
        <div class="form-group">
            <input v-model="newProduct.name" placeholder="Tên sản phẩm" class="form-input" />
            <input v-model.number="newProduct.price" placeholder="Giá" type="number" class="form-input" />
            <input type="file" @change="handleImageUploadNew" accept="image/*" class="form-input" />
            <button @click="addProduct" class="btn green">Thêm sản phẩm</button>
        </div>
        <img v-if="newProduct.image" :src="newProduct.image" class="image-preview" />
    </div>

    <!-- SEARCH -->
    <div class="toolbar">
        <input v-model="searchKeyword" placeholder="Tìm kiếm sản phẩm..." class="search-input" />
    </div>

    <!-- PRODUCT GRID -->
    <div class="product-grid">
        <div v-for="p in paginatedProducts" :key="p.id" class="product-card">
            <h3 class="product-name">{{ p.name }}</h3>
            <p class="product-price">{{ p.price }} VND</p>

            <img :src="p.image" class="product-image" />

            <div class="actions">
                <button @click="startEdit(p)" class="btn yellow">Sửa</button>
                <button @click="deleteProduct(p.id)" class="btn red">Xóa</button>
            </div>
        </div>
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

    <!-- EDIT MODAL -->
    <div v-if="editProduct" class="modal-overlay" @click="editProduct = null">
        <div class="modal-content" @click.stop>
            <h2>Sửa sản phẩm</h2>
            <div class="form-group">
                <label>Tên:</label>
                <input v-model="editProduct.name" class="form-input" />
            </div>
            <div class="form-group">
                <label>Giá:</label>
                <input v-model.number="editProduct.price" type="number" class="form-input" />
            </div>
            <div class="form-group">
                <label>Ảnh sản phẩm:</label>
                <input type="file" @change="handleImageUploadEdit" accept="image/*" class="form-input" />
            </div>
            <img v-if="editProduct.image" :src="editProduct.image" class="image-preview-modal" />
            <div class="modal-actions">
                <button @click="saveEdit" class="btn green">Lưu</button>
                <button @click="editProduct = null" class="btn gray">Hủy</button>
            </div>
        </div>
    </div>
</template>
<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";

const products = ref([]);
const newProduct = ref({ name: "", price: 0, image: "" });
const editProduct = ref(null);

async function fetchProducts() {
    const res = await axios.get("http://localhost:3000/products");
    products.value = res.data;
}
import { computed } from "vue";

const searchKeyword = ref("");
const currentPage = ref(1);
const itemsPerPage = 6;

// Xử lý upload ảnh cho sản phẩm mới
function handleImageUploadNew(event) {
    const file = event.target.files[0];
    if (file) {
        newProduct.value.imageFile = file;
        newProduct.value.imageName = file.name;
    }
}

// Xử lý upload ảnh cho sản phẩm sửa
function handleImageUploadEdit(event) {
    const file = event.target.files[0];
    if (file) {
        editProduct.value.imageFile = file;
        editProduct.value.imageName = file.name;
    }
}

// Lọc theo tìm kiếm
const filteredProducts = computed(() => {
    return products.value.filter(p =>
        p.name.toLowerCase().includes(searchKeyword.value.toLowerCase())
    );
});

// Tổng số trang
const totalPages = computed(() =>
    Math.ceil(filteredProducts.value.length / itemsPerPage)
);

// Sản phẩm theo trang
const paginatedProducts = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    return filteredProducts.value.slice(start, start + itemsPerPage);
});
async function addProduct() {
    if (!newProduct.value.name || !newProduct.value.price || !newProduct.value.imageFile) {
        alert("Vui lòng điền đầy đủ thông tin");
        return;
    }
    try {
        const formData = new FormData();
        formData.append("name", newProduct.value.name);
        formData.append("price", newProduct.value.price);
        formData.append("image", newProduct.value.imageFile);

        await axios.post("http://localhost:3000/products", formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        alert("Thêm sản phẩm thành công");
        newProduct.value = { name: "", price: 0, imageFile: null, imageName: "" };
        fetchProducts();
    } catch (err) {
        console.error("Lỗi thêm sản phẩm:", err);
        alert(err.response?.data?.message || "Lỗi thêm sản phẩm");
    }
}

function startEdit(p) {
    editProduct.value = { ...p };
}

async function saveEdit() {
    if (!editProduct.value.name || !editProduct.value.price) {
        alert("Vui lòng điền đầy đủ thông tin");
        return;
    }
    try {
        const formData = new FormData();
        formData.append("name", editProduct.value.name);
        formData.append("price", editProduct.value.price);
        if (editProduct.value.imageFile) {
            formData.append("image", editProduct.value.imageFile);
        }

        await axios.put(`http://localhost:3000/products/${editProduct.value.id}`, formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        alert("Cập nhật sản phẩm thành công");
        editProduct.value = null;
        fetchProducts();
    } catch (err) {
        console.error("Lỗi cập nhật sản phẩm:", err);
        alert(err.response?.data?.message || "Lỗi cập nhật sản phẩm");
    }
}

async function deleteProduct(id) {
    if (confirm("Bạn có chắc muốn xóa sản phẩm này?")) {
        await axios.delete(`http://localhost:3000/products/${id}`);
        fetchProducts();
    }
}

onMounted(fetchProducts);
</script>

<style scoped>
/* ADD SECTION */
.add-section {
    background: #f0f0f0;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
}

.add-section h2 {
    margin-bottom: 15px;
}

.form-group {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
    flex-wrap: wrap;
}

.form-group label {
    display: block;
    width: 100%;
    font-weight: bold;
    margin-bottom: 5px;
}

.form-input {
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    flex: 1;
    min-width: 200px;
}

/* SEARCH */
.toolbar {
    margin-bottom: 20px;
}

.search-input {
    width: 300px;
    padding: 8px;
    border: 1px solid #ccc;
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
    border: 1px solid #ddd;
    padding: 20px;
    border-radius: 8px;
    background: white;
    display: flex;
    flex-direction: column;
}

.product-name {
    max-height: 40px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.product-price {
    font-weight: bold;
    color: #d97706;
}

.product-image {
    width: 100%;
    height: 200px;
    object-fit: cover;
    margin: 10px 0;
    border-radius: 6px;
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
    background: #6b7280;
}

/* PAGINATION */
.pagination {
    margin-top: 20px;
    text-align: center;
}

.pagination button {
    padding: 6px 12px;
    margin: 0 10px;
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
    z-index: 1000;
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
}

.modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    justify-content: flex-end;
}

/* IMAGE PREVIEW */
.image-preview {
    max-width: 150px;
    max-height: 150px;
    margin-top: 10px;
    border-radius: 6px;
    object-fit: cover;
}

.image-preview-modal {
    max-width: 200px;
    max-height: 200px;
    margin-top: 10px;
    border-radius: 6px;
    object-fit: cover;
}
</style>