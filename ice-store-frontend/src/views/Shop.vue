<template>
    <div class="container">
        <h1 class="title">🛒 Cửa hàng IceStore</h1>

        <div class="category-filter">
            <button class="category-btn" :class="{ active: selectedCategory === null }" @click="filterByCategory(null)">
                Tất cả sản phẩm
            </button>
            <button v-for="cat in categories" :key="cat.id" class="category-btn"
                :class="{ active: selectedCategory === cat.id }" @click="filterByCategory(cat.id)">
                {{ cat.name }}
            </button>
        </div>

        <div v-if="products.length === 0" class="empty-state">
            <p>Hiện chưa có sản phẩm nào trong danh mục này.</p>
        </div>

        <div v-else class="product-grid">
            <div v-for="p in products" :key="p.id" class="product-card">
                <img :src="p.image || 'https://via.placeholder.com/200?text=No+Image'" alt="product image"
                    class="product-image" />
                <h2 class="product-name">{{ p.name }}</h2>
                <p class="product-price">{{ Number(p.price).toLocaleString('vi-VN') }} VND</p>
                <div class="quantity-section">
                    <label for="qty">Số lượng:</label>
                    <input type="number" :id="`qty-${p.id}`" v-model.number="quantities[p.id]" min="1"
                        class="quantity-input" />
                </div>
                <button @click="addToCart(p)" class="btn-add-cart">
                    Thêm vào giỏ
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";

const router = useRouter();
const products = ref([]);
const categories = ref([]); // Biến lưu danh sách danh mục
const selectedCategory = ref(null); // Biến lưu danh mục đang chọn (null = Tất cả)
const quantities = ref({});

// 1. Lấy danh sách danh mục từ Backend
async function fetchCategories() {
    try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/categories`);
        categories.value = res.data;
    } catch (err) {
        console.error("Lỗi lấy danh mục:", err);
    }
}

// 2. Lấy sản phẩm (Có hỗ trợ lọc)
async function fetchProducts(categoryId = null) {
    try {
        // Tạo URL, nếu có categoryId thì nối thêm vào
        let url = `${import.meta.env.VITE_API_URL}/products`;
        if (categoryId !== null) {
            url += `?category_id=${categoryId}`;
        }

        const res = await axios.get(url);
        products.value = res.data;

        // Khởi tạo quantity = 1 cho mỗi sản phẩm mới tải về
        quantities.value = {}; // Reset giỏ tạm
        products.value.forEach(p => {
            quantities.value[p.id] = 1;
        });
    } catch (err) {
        console.error("Lỗi lấy sản phẩm:", err);
    }
}

// 3. Hàm xử lý khi người dùng bấm vào một nút danh mục
function filterByCategory(categoryId) {
    selectedCategory.value = categoryId; // Cập nhật trạng thái nút (Màu xanh)
    fetchProducts(categoryId); // Gọi lại API để tải sản phẩm tương ứng
}

// Thêm vào giỏ (gửi lên server)
async function addToCart(product) {
    const userId = localStorage.getItem("user_id");
    if (!userId) {
        alert("Vui lòng đăng nhập trước!");
        router.push("/login");
        return;
    }

    const qty = quantities.value[product.id] || 1;
    if (qty < 1) {
        alert("Số lượng phải lớn hơn 0");
        return;
    }

    try {
        await axios.post(`${import.meta.env.VITE_API_URL}/cart`, {
            user_id: userId,
            product_id: product.id,
            quantity: qty
        });
        alert(`${product.name} x${qty} đã được thêm vào giỏ`);
        quantities.value[product.id] = 1;
    } catch (err) {
        console.error("Lỗi thêm giỏ hàng:", err);
        alert("Lỗi thêm vào giỏ hàng");
    }
}

// Tự động chạy khi mở trang
onMounted(() => {
    fetchCategories();
    fetchProducts(); // Mặc định tải tất cả
});
</script>

<style scoped>
.container {
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
}

.title {
    font-size: 30px;
    font-weight: bold;
    margin-bottom: 20px;
    text-align: center;
    color: #1e293b;
}

/* === CSS MỚI CHO THANH DANH MỤC === */
.category-filter {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-bottom: 30px;
    flex-wrap: wrap;
    /* Tự động rớt dòng trên điện thoại */
}

.category-btn {
    padding: 10px 20px;
    background-color: #f1f5f9;
    color: #475569;
    border: 1px solid #cbd5e1;
    border-radius: 25px;
    /* Bo tròn xịn xò */
    cursor: pointer;
    font-weight: 500;
    transition: all 0.3s ease;
}

.category-btn:hover {
    background-color: #e2e8f0;
    color: #0f172a;
}

/* Hiệu ứng khi nút được chọn */
.category-btn.active {
    background-color: #38bdf8;
    color: white;
    border-color: #38bdf8;
    box-shadow: 0 4px 6px rgba(56, 189, 248, 0.3);
}

.empty-state {
    text-align: center;
    padding: 50px;
    color: #64748b;
    font-size: 18px;
    background-color: #f8fafc;
    border-radius: 8px;
}

/* ================================= */

.product-grid {
    display: grid;
    gap: 24px;
    grid-template-columns: repeat(3, 1fr);
}

.product-card {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    background: white;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    padding: 16px;
    display: flex;
    flex-direction: column;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.product-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.product-image {
    width: 100%;
    height: 200px;
    object-fit: cover;
    border-radius: 8px;
    margin-bottom: 15px;
}

.product-name {
    font-weight: 600;
    font-size: 18px;
    margin-bottom: 8px;
    color: #1e293b;
    /* Cắt bớt tên dài */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.product-price {
    color: #dc2626;
    /* Đỏ đô nổi bật */
    margin-bottom: 16px;
    font-weight: 700;
    font-size: 16px;
}

.quantity-section {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 15px;
}

.quantity-section label {
    font-weight: 500;
    font-size: 14px;
    color: #475569;
}

.quantity-input {
    width: 60px;
    padding: 8px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 14px;
    text-align: center;
}

.quantity-input:focus {
    outline: none;
    border-color: #38bdf8;
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
}

.btn-add-cart {
    margin-top: auto;
    background-color: #38bdf8;
    color: white;
    padding: 10px 16px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-weight: 600;
    font-size: 15px;
    transition: all 0.2s ease;
}

.btn-add-cart:hover {
    background-color: #0284c7;
}

/* Responsive */
@media (max-width: 640px) {
    .container {
        padding: 16px;
    }

    .product-grid {
        grid-template-columns: 1fr;
    }

    .category-btn {
        font-size: 13px;
        padding: 8px 15px;
    }
}

@media (min-width: 641px) and (max-width: 1024px) {
    .product-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (min-width: 1025px) {
    .product-grid {
        grid-template-columns: repeat(4, 1fr);
        /* Đổi thành 4 cột cho màn to */
    }
}
</style>