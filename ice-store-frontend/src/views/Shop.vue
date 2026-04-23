<template>
    <div class="container">
        <h1 class="title">🛒 Cửa hàng</h1>

        <!-- Grid sản phẩm -->
        <div class="product-grid">
            <div v-for="p in products" :key="p.id" class="product-card">
                <img :src="p.image" alt="product image" class="product-image" />
                <h2 class="product-name">{{ p.name }}</h2>
                <p class="product-price">{{ p.price.toLocaleString('vi-VN') }} VND</p>
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
const quantities = ref({});

async function fetchProducts() {
    try {
        const res = await axios.get("http://localhost:3000/products");
        products.value = res.data;
        // Khởi tạo quantity = 1 cho mỗi sản phẩm
        products.value.forEach(p => {
            quantities.value[p.id] = 1;
        });
    } catch (err) {
        console.error("Lỗi lấy sản phẩm:", err);
    }
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
        await axios.post("http://localhost:3000/cart", {
            user_id: userId,
            product_id: product.id,
            quantity: qty
        });
        alert(`${product.name} x${qty} đã được thêm vào giỏ`);
        // Reset quantity về 1 sau khi thêm
        quantities.value[product.id] = 1;
    } catch (err) {
        console.error("Lỗi thêm giỏ hàng:", err);
        alert("Lỗi thêm vào giỏ hàng");
    }
}

onMounted(fetchProducts);
</script>

<style scoped>
.container {
    padding: 24px;
}

.title {
    font-size: 30px;
    font-weight: bold;
    margin-bottom: 24px;
    text-align: center;
}

.product-grid {
    display: grid;
    gap: 24px;
    grid-template-columns: repeat(3, 1fr);
}

.product-card {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    padding: 16px;
    display: flex;
    flex-direction: column;
    height: 90%;
}

.product-image {
    width: 100%;
    height: 200px;
    object-fit: cover;
    border-radius: 6px;
    margin-bottom: 12px;
}

.product-name {
    font-weight: 600;
    font-size: 18px;
    margin-bottom: 8px;
    max-height: 40px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.product-price {
    color: #b45309;
    margin-bottom: 16px;
    font-weight: bold;
}

.quantity-section {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
}

.quantity-section label {
    font-weight: 500;
    font-size: 14px;
}

.quantity-input {
    width: 60px;
    padding: 6px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 14px;
    text-align: center;
}

.quantity-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.btn-add-cart {
    margin-top: auto;
    background-color: #3b82f6;
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s;
}

.btn-add-cart:hover {
    background-color: #2563eb;
}

/* Responsive */
/* Mobile: 1 cột */
@media (max-width: 640px) {
    .container {
        padding: 16px;
    }

    .product-grid {
        grid-template-columns: 1fr;
    }
}

/* Tablet: 2 cột */
@media (min-width: 641px) and (max-width: 1024px) {
    .product-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

/* Laptop: 3 cột */
@media (min-width: 1025px) {
    .product-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}
</style>