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

                <div class="price-stock">
                    <p class="product-price">{{ Number(p.price).toLocaleString('vi-VN') }} VND</p>
                    <p class="product-stock" :style="{ color: p.stock > 0 ? '#10b981' : '#dc2626' }">
                        {{ p.stock > 0 ? `Kho: ${p.stock}` : 'Hết hàng' }}
                    </p>
                </div>

                <div class="quantity-section">
                    <label>Số lượng:</label>
                    <input type="number" v-model.number="quantities[p.id]" min="1" :max="p.stock"
                        :disabled="p.stock === 0" class="quantity-input" />
                </div>

                <div class="action-buttons">
                    <button @click="addToCart(p)" class="btn-add-cart" :disabled="p.stock === 0"
                        :class="{ 'disabled-btn': p.stock === 0 }">
                        Thêm vào giỏ
                    </button>
                    <button @click="openReviewModal(p)" class="btn-review">
                        ⭐ Đánh giá
                    </button>
                </div>
            </div>
        </div>

        <div v-if="showReviewModal" class="modal-overlay" @click="closeReviewModal">
            <div class="modal-content review-modal" @click.stop>
                <div class="modal-header">
                    <h2>Đánh giá: {{ selectedProduct?.name }}</h2>
                    <button class="close-btn" @click="closeReviewModal">×</button>
                </div>

                <div class="write-review-section">
                    <h3>Viết đánh giá của bạn</h3>
                    <div class="star-rating">
                        <span v-for="star in 5" :key="star" @click="reviewForm.rating = star"
                            :class="{ 'active': star <= reviewForm.rating }">★</span>
                    </div>
                    <textarea v-model="reviewForm.comment" placeholder="Sản phẩm dùng tốt không? Hãy chia sẻ nhé..."
                        class="review-input"></textarea>
                    <button @click="submitReview" class="btn-submit-review">Gửi đánh giá</button>
                </div>

                <div class="reviews-list">
                    <h3>Bình luận từ khách hàng</h3>
                    <p v-if="productReviews.length === 0" class="no-reviews">Chưa có đánh giá nào cho sản phẩm này. Hãy
                        là người đầu tiên!</p>

                    <div v-for="r in productReviews" :key="r.id" class="review-item">
                        <img :src="r.avatar || `https://ui-avatars.com/api/?name=${r.username}&background=random`"
                            class="reviewer-avatar" />
                        <div class="review-content">
                            <div class="review-header">
                                <strong>{{ r.full_name || r.username }}</strong>
                                <span class="review-date">{{ new Date(r.created_at).toLocaleDateString('vi-VN')
                                }}</span>
                            </div>
                            <div class="review-stars">
                                <span v-for="s in 5" :key="s" :class="{ 'active-star': s <= r.rating }">★</span>
                            </div>
                            <p class="review-text">{{ r.comment }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";
import { toast } from "vue3-toastify";
import { io } from "socket.io-client";

const router = useRouter();
const products = ref([]);
const categories = ref([]);
const selectedCategory = ref(null);
const quantities = ref({});

// === STATE CHO ĐÁNH GIÁ ===
const showReviewModal = ref(false);
const selectedProduct = ref(null);
const productReviews = ref([]);
const reviewForm = ref({ rating: 5, comment: "" });
let socket = null;

// --- CÁC HÀM API SẢN PHẨM & DANH MỤC ---
async function fetchCategories() {
    try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/categories`);
        categories.value = res.data;
    } catch (err) {
        console.error("Lỗi lấy danh mục:", err);
    }
}

async function fetchProducts(categoryId = null) {
    try {
        let url = `${import.meta.env.VITE_API_URL}/products`;
        if (categoryId !== null) url += `?category_id=${categoryId}`;

        const res = await axios.get(url);
        products.value = res.data;

        quantities.value = {};
        products.value.forEach(p => quantities.value[p.id] = 1);
    } catch (err) {
        toast.error("Không thể tải danh sách sản phẩm!");
    }
}

function filterByCategory(categoryId) {
    selectedCategory.value = categoryId;
    fetchProducts(categoryId);
}

// --- THÊM GIỎ HÀNG (SỬ DỤNG TOAST) ---
async function addToCart(product) {
    const userId = localStorage.getItem("user_id");
    if (!userId) {
        toast.warning("Vui lòng đăng nhập để mua hàng!"); // UX Tốt hơn alert
        router.push("/login");
        return;
    }

    const qty = quantities.value[product.id] || 1;

    if (qty > product.stock) {
        toast.error(`Chỉ còn ${product.stock} sản phẩm trong kho!`);
        quantities.value[product.id] = product.stock;
        return;
    }

    if (qty < 1) {
        toast.warning("Số lượng phải lớn hơn 0");
        return;
    }

    try {
        await axios.post(`${import.meta.env.VITE_API_URL}/cart`, {
            user_id: userId,
            product_id: product.id,
            quantity: qty
        });

        // BÁO THÀNH CÔNG GÓC MÀN HÌNH MÀ KHÔNG CHẶN NGƯỜI DÙNG
        toast.success(`Đã thêm ${qty} ${product.name} vào giỏ hàng!`);
        quantities.value[product.id] = 1;
    } catch (err) {
        toast.error("Lỗi thêm vào giỏ hàng!");
    }
}

// === CÁC HÀM XỬ LÝ ĐÁNH GIÁ ===
async function openReviewModal(product) {
    selectedProduct.value = product;
    showReviewModal.value = true;
    reviewForm.value = { rating: 5, comment: "" }; // Reset form
    await fetchReviews(product.id);
}

function closeReviewModal() {
    showReviewModal.value = false;
    selectedProduct.value = null;
}

async function fetchReviews(productId) {
    try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/products/${productId}/reviews`);
        productReviews.value = res.data;
    } catch (err) {
        toast.error("Không thể tải bình luận!");
    }
}

async function submitReview() {
    const userId = localStorage.getItem("user_id");
    if (!userId) {
        toast.warning("Bạn cần đăng nhập để viết đánh giá!");
        return;
    }
    if (!reviewForm.value.comment.trim()) {
        toast.warning("Vui lòng viết nội dung đánh giá nhé!");
        return;
    }

    try {
        await axios.post(`${import.meta.env.VITE_API_URL}/reviews`, {
            user_id: userId,
            product_id: selectedProduct.value.id,
            rating: reviewForm.value.rating,
            comment: reviewForm.value.comment
        });

        toast.success("Cảm ơn bạn đã đánh giá!");
        reviewForm.value.comment = ""; // Xóa form
        await fetchReviews(selectedProduct.value.id); // Tải lại danh sách bình luận
    } catch (err) {
        toast.error("Có lỗi xảy ra khi gửi đánh giá.");
    }
}

onMounted(() => {
    fetchCategories();
    fetchProducts();

    // === KHỞI TẠO KẾT NỐI SOCKET.IO ===
    socket = io(import.meta.env.VITE_API_URL);

    // Lắng nghe sự kiện "product_updated" từ server để tự động cập nhật danh sách sản phẩm
    socket.on("product_updated", () => {
        console.log("🔄 Sản phẩm đã được cập nhật, đang tải lại danh sách...");
        fetchProducts(selectedCategory.value);
    });
    socket.on("review_updated", () => {
        if (selectedProduct.value) {
            console.log("🔄 Đánh giá đã được cập nhật, đang tải lại bình luận...");
            fetchReviews(selectedProduct.value.id);
        }
    });
});

onUnmounted(() => {
    if (socket) {
        socket.off("product_updated");
        socket.off("review_updated");
        socket.disconnect();
        socket = null;
    }
});

</script>

<style scoped>
/* GIỮ LẠI CSS CŨ CỦA BẠN (container, title, category-filter, product-grid, v.v...) */
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

.category-filter {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-bottom: 30px;
    flex-wrap: wrap;
}

.category-btn {
    padding: 10px 20px;
    background-color: #f1f5f9;
    color: #475569;
    border: 1px solid #cbd5e1;
    border-radius: 25px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.3s;
}

.category-btn:hover {
    background-color: #e2e8f0;
    color: #0f172a;
}

.category-btn.active {
    background-color: #38bdf8;
    color: white;
    border-color: #38bdf8;
}

.empty-state {
    text-align: center;
    padding: 50px;
    color: #64748b;
    font-size: 18px;
    background-color: #f8fafc;
    border-radius: 8px;
}

.product-grid {
    display: grid;
    gap: 24px;
    grid-template-columns: repeat(4, 1fr);
}

.product-card {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    background: white;
    padding: 16px;
    display: flex;
    flex-direction: column;
    transition: transform 0.2s, box-shadow 0.2s;
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
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.price-stock {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.product-price {
    color: #dc2626;
    font-weight: 700;
    font-size: 16px;
    margin: 0;
}

.product-stock {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
}

.quantity-section {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 15px;
}

.quantity-input {
    width: 60px;
    padding: 6px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    text-align: center;
}

/* CHỈNH LẠI HÀNG NÚT BẤM */
.action-buttons {
    display: flex;
    gap: 10px;
    margin-top: auto;
}

.btn-add-cart,
.btn-review {
    flex: 1;
    padding: 10px 5px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s;
    color: white;
}

.btn-add-cart {
    background-color: #38bdf8;
}

.btn-add-cart:hover:not(:disabled) {
    background-color: #0284c7;
}

.disabled-btn {
    background-color: #94a3b8 !important;
    cursor: not-allowed;
}

.btn-review {
    background-color: #f59e0b;
}

.btn-review:hover {
    background-color: #d97706;
}

/* === CSS MỚI CHO MODAL ĐÁNH GIÁ === */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
}

.review-modal {
    background: white;
    padding: 25px;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    max-height: 85vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 10px;
}

.modal-header h2 {
    margin: 0;
    font-size: 20px;
    color: #1e293b;
}

.close-btn {
    background: none;
    border: none;
    font-size: 28px;
    cursor: pointer;
    color: #64748b;
}

.write-review-section {
    background: #f8fafc;
    padding: 15px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
}

.write-review-section h3 {
    margin: 0 0 10px 0;
    font-size: 16px;
    color: #334155;
}

.star-rating {
    margin-bottom: 10px;
}

.star-rating span {
    font-size: 28px;
    color: #cbd5e1;
    cursor: pointer;
    transition: color 0.2s;
}

.star-rating span.active {
    color: #f59e0b;
}

.review-input {
    width: 100%;
    height: 80px;
    padding: 10px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    resize: none;
    font-family: inherit;
    margin-bottom: 10px;
    box-sizing: border-box;
}

.btn-submit-review {
    background: #10b981;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    width: 100%;
}

.reviews-list h3 {
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 10px;
    margin-bottom: 15px;
    font-size: 18px;
}

.no-reviews {
    color: #64748b;
    font-style: italic;
    text-align: center;
}

.review-item {
    display: flex;
    gap: 15px;
    margin-bottom: 20px;
}

.reviewer-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
}

.review-content {
    flex: 1;
    background: #f1f5f9;
    padding: 12px;
    border-radius: 8px;
}

.review-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    font-size: 14px;
}

.review-date {
    color: #64748b;
    font-size: 12px;
}

.review-stars span {
    color: #cbd5e1;
    font-size: 14px;
}

.review-stars span.active-star {
    color: #f59e0b;
}

.review-text {
    margin: 8px 0 0 0;
    font-size: 14px;
    color: #334155;
    line-height: 1.5;
}

/* Responsive */
@media (max-width: 1024px) {
    .product-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (max-width: 768px) {
    .product-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 480px) {
    .product-grid {
        grid-template-columns: 1fr;
    }

    .action-buttons {
        flex-direction: column;
    }
}
</style>