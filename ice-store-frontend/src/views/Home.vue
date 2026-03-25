<template>
    <div class="home-page">
        <header class="hero">
            <div class="hero-content">
                <h1>Chuyên cung cấp đá viên tinh khiết, đá cây chất lượng cao - Giao hàng 24/7.</h1>
                <button class="cta-button">📞 Gọi Giao Đá Ngay: 0909.123.456</button>
                <router-link to="/shop" class="shop-button">Shop Now</router-link>
            </div>
        </header>

        <section class="features">
            <div class="feature-item">
                <div class="feature-icon">💧</div>
                <h2>Đá viên tinh khiết sạch và an toàn</h2>
                <p>Đá viên tinh khiết, hệ thống lọc RO, đảm bảo an toàn cho sức khỏe.</p>
            </div>
            <div class="feature-item">
                <div class="feature-icon">🚀</div>
                <h2>Giao hàng siêu tốc 24/7</h2>
                <p>Đội ngũ giao hàng nhanh chóng, chuyên nghiệp, đảm bảo giao hàng đúng giờ và phục vụ khách hàng 24/7.
                </p>
            </div>
            <div class="feature-item">
                <div class="feature-icon">💰</div>
                <h2>Giá cả cạnh tranh</h2>
                <p>Giá cả cạnh tranh, ưu đãi hấp dẫn cho khách hàng thân thiết. Giá cả tốt nhất cho đại lý, nhà hàng và
                    quán cà phê.
                </p>
            </div>
        </section>

        <section class="products">
            <h2>Sản phẩm nổi bật</h2>
            <div class="product-list">
                <div v-for="p in products" :key="p.id" class="product-card">
                    <div class="product-image">
                        <img :src="p.image" alt="Product Image"
                            style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" />
                    </div>
                    <h3 class="product-name">{{ p.name }}</h3>
                    <p class="product-desc">{{ p.description }}</p>
                    <p class="product-price">{{ p.price.toLocaleString('vi-VN') }} VND</p>

                    <button class="btn-add-cart" @click="addToCart(p)">Thêm vào giỏ</button>
                </div>

            </div>
            <div class="view-more">
                <router-link to="/shop" class="view-more-button">Xem thêm sản phẩm</router-link>
            </div>
        </section>
    </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";

// Khởi tạo router chuẩn
const router = useRouter();
// Biến chứa danh sách sản phẩm
const products = ref([]);

// Lấy sản phẩm từ server
async function fetchProducts() {
    try {
        const res = await axios.get("http://localhost:3000/products");
        // SỬA: Gán vào products.value thay vì fetchProducts.value
        products.value = res.data.slice(0, 3);
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

    try {
        await axios.post("http://localhost:3000/cart", {
            user_id: userId,
            product_id: product.id,
            quantity: 1
        });
        alert("Đã thêm vào giỏ hàng");
    } catch (err) {
        alert(err.response?.data?.message || "Thêm vào giỏ hàng thất bại");
    }
}

onMounted(() => {
    fetchProducts();
});
</script>

<style scoped>
/* --- Cài đặt chung --- */
.home-container {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color: #333;
    line-height: 1.6;
}

h1,
h2,
h3 {
    margin: 0;
    color: #003366;
}

/* --- Hero Banner --- */
.hero {
    background: linear-gradient(135deg, #0056b3, #0099ff);
    color: white;
    text-align: center;
    padding: 80px 20px;
}

.hero h1 {
    color: white;
    font-size: 2.5rem;
    margin-bottom: 15px;
}

.hero p {
    font-size: 1.2rem;
    margin-bottom: 30px;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
}

.cta-button {
    background-color: white;
    color: #0056b3;
    border: none;
    padding: 15px 30px;
    font-size: 1.1rem;
    font-weight: bold;
    border-radius: 50px;
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
}

.cta-button:hover {
    background-color: #f0f8ff;
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

/* --- Features (Điểm nổi bật) --- */
.features {
    display: flex;
    justify-content: space-around;
    flex-wrap: wrap;
    padding: 50px 20px;
    background-color: #f4f9f9;
}

.feature-item {
    flex: 1;
    min-width: 250px;
    text-align: center;
    padding: 20px;
}

.feature-icon {
    font-size: 3rem;
    margin-bottom: 10px;
}

.feature-item h3 {
    font-size: 1.3rem;
    margin-bottom: 10px;
}

.feature-item p {
    color: #666;
    font-size: 0.95rem;
}

/* --- Products (Sản phẩm) --- */
.products {
    padding: 60px 20px;
    text-align: center;
}

.products h2 {
    font-size: 2rem;
    margin-bottom: 40px;
}

.product-list {
    display: grid;
    /* Tự động chia cột, mỗi cột tối thiểu 280px */
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 30px;
    max-width: 100%;
    margin: 0 auto;
}

.product-card {
    border: 1px solid #e0e0e0;
    border-radius: 10px;
    padding: 20px;
    background-color: white;
    transition: transform 0.3s, box-shadow 0.3s;
}

.product-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
}

/* Khối giả lập hình ảnh (Sau này bạn thay bằng thẻ <img>) */
.product-image {
    width: 100%;
    height: 200px;
    object-fit: cover;
    border-radius: 6px;
    margin-bottom: 12px;
}

.product-card h3 {
    font-size: 1.2rem;
    margin-bottom: 10px;
}

.product-desc {
    color: #555;
    font-size: 0.9rem;
    margin-bottom: 10px;
}

.product-price {
    font-weight: bold;
    color: #0056b3;
}

.btn-view-all {
    display: inline-block;
    padding: 12px 24px;
    background-color: #f3f4f6;
    color: #1f2937;
    text-decoration: none;
    border-radius: 8px;
    font-weight: bold;
    transition: background-color 0.2s;
}

/* Nút thêm vào giỏ hàng */
.btn-add-cart {
    margin-top: 15px;
    width: 100%;
    background-color: #0099ff;
    color: white;
    padding: 10px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.2s;
}

.btn-add-cart:hover {
    background-color: #0056b3;
}

.btn-view-all:hover {
    background-color: #e5e7eb;
}
</style>