<template>
    <nav class="admin-navbar">
        <div class="navbar-container">
            <div class="logo">
                <router-link to="/admin/products" class="logo-text">IceStore Admin</router-link>
            </div>

            <div class="menu">

                <template v-if="userRole === 'admin'">
                    <router-link to="/admin/dashboard" class="nav-link"
                        :class="{ active: isActive('/admin/dashboard') }">
                        Thống kê doanh thu
                    </router-link>
                    <router-link to="/admin/products" class="nav-link" :class="{ active: isActive('/admin/products') }">
                        Quản lý sản phẩm
                    </router-link>
                    <router-link to="/admin/customers" class="nav-link"
                        :class="{ active: isActive('/admin/customers') }">
                        Quản lý khách hàng
                    </router-link>
                </template>

                <router-link to="/admin/orders" class="nav-link" :class="{ active: isActive('/admin/orders') }">
                    Quản lý đơn hàng
                </router-link>

                <router-link v-if="userRole === 'admin' && isSupervisor" to="/admin/members" class="nav-link"
                    :class="{ active: isActive('/admin/members') }">
                    Quản lý nhân viên
                </router-link>

                <router-link v-if="userRole === 'admin'" to="/admin/recycle-bin" class="nav-link"
                    :class="{ active: isActive('/admin/recycle-bin') }">
                    Thùng rác
                </router-link>
            </div>

            <div class="admin-section">
                <div v-if="overdueCount > 0" class="notification-bell" @click="goToOrders"
                    title="Có đơn hàng cần giao gấp!">
                    <span class="bell-icon">🔔</span>
                    <span class="badge">{{ overdueCount }}</span>
                </div>

                <span class="admin-name">{{ username }}</span>
                <button @click="logout" class="logout-btn">Đăng xuất</button>
            </div>
        </div>
    </nav>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import axios from "axios"; // 👉 Nhớ import axios
import { username as userNameState, role as roleState } from "../stores/user.js";

const router = useRouter();
const route = useRoute();
const username = ref("");
const isSupervisor = ref(false);
const userRole = ref(localStorage.getItem("role") || "");

// CÁC BIẾN CHO TÍNH NĂNG CẢNH BÁO
const overdueCount = ref(0);
let pollingInterval = null;

onMounted(() => {
    username.value = localStorage.getItem("username") || "Admin";
    isSupervisor.value = localStorage.getItem("is_supervisor") === "1";
    userRole.value = localStorage.getItem("role") || "";

    // Kiểm tra đơn trễ ngay khi load trang
    checkOverdueOrders();

    // Cài đặt lặp lại tự động kiểm tra mỗi 1 phút (60000ms)
    pollingInterval = setInterval(checkOverdueOrders, 60000);
});

// Dọn dẹp bộ đếm giờ khi chuyển khỏi hệ thống để không nặng máy
onUnmounted(() => {
    if (pollingInterval) clearInterval(pollingInterval);
});

async function checkOverdueOrders() {
    try {
        const res = await axios.get("https://icestore-api.onrender.com/orders/overdue");
        overdueCount.value = res.data.overdueCount;
    } catch (error) {
        console.error("Lỗi lấy thông báo:", error);
    }
}

function goToOrders() {
    // Chuyển hướng đến trang quản lý đơn hàng
    router.push('/admin/orders');
}

function isActive(path) {
    return route.path === path;
}

function logout() {
    // Xóa localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("user_id");
    localStorage.removeItem("is_supervisor");

    // Reset state reactive từ store
    userNameState.value = "";
    roleState.value = "";

    // Chuyển về trang login
    router.push("/login");
}
</script>

<style scoped>
/* Toàn bộ CSS của bạn được giữ nguyên hoàn toàn */
.admin-navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    background-color: #1e293b;
    color: white;
    z-index: 1000;
}

.navbar-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 30px;
    box-sizing: border-box;
    max-width: 1400px;
    margin: 0 auto;
}

/* Logo */
.logo {
    display: flex;
    align-items: center;
    gap: 10px;
}

.logo-text {
    font-size: 20px;
    font-weight: bold;
    text-decoration: none;
    color: #38bdf8;
    letter-spacing: 1px;
}

.logo-text:hover {
    color: #0ea5e9;
}

/* Menu */
.menu {
    display: flex;
    gap: 30px;
    flex: 1;
    justify-content: center;
}

.nav-link {
    color: white;
    text-decoration: none;
    font-size: 15px;
    padding: 8px 12px;
    border-radius: 4px;
    transition: all 0.3s ease;
    cursor: pointer;
}

.nav-link:hover {
    background-color: #334155;
    color: #38bdf8;
}

.nav-link.active {
    background-color: #38bdf8;
    color: #1e293b;
    font-weight: bold;
}

/* Admin Section */
.admin-section {
    display: flex;
    align-items: center;
    gap: 20px;
}

.admin-name {
    font-size: 14px;
    color: #cbd5e1;
}

.logout-btn {
    padding: 8px 16px;
    background-color: #dc2626;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.3s ease;
}

.logout-btn:hover {
    background-color: #b91c1c;
}

/* 👉 CSS CHO QUẢ CHUÔNG CẢNH BÁO */
.notification-bell {
    position: relative;
    cursor: pointer;
    padding: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: shake 2s infinite ease-in-out;
    /* Hiệu ứng rung chuông */
}

.bell-icon {
    font-size: 20px;
}

.badge {
    position: absolute;
    top: -5px;
    right: -8px;
    background-color: #ef4444;
    /* Đỏ báo động */
    color: white;
    border-radius: 50%;
    padding: 2px 6px;
    font-size: 11px;
    font-weight: bold;
    border: 2px solid #1e293b;
}

@keyframes shake {

    0%,
    100% {
        transform: rotate(0deg);
    }

    10% {
        transform: rotate(15deg);
    }

    20% {
        transform: rotate(-10deg);
    }

    30% {
        transform: rotate(5deg);
    }

    40% {
        transform: rotate(-5deg);
    }

    50% {
        transform: rotate(0deg);
    }
}

/* RESPONSIVE */
/* Tablet */
@media (max-width: 768px) {
    .navbar-container {
        padding: 12px 20px;
    }

    .logo-text {
        font-size: 16px;
    }

    .menu {
        gap: 15px;
    }

    .nav-link {
        font-size: 14px;
        padding: 6px 10px;
    }

    .admin-section {
        gap: 10px;
    }

    .admin-name {
        font-size: 12px;
    }

    .logout-btn {
        padding: 6px 12px;
        font-size: 12px;
    }
}

/* Mobile */
@media (max-width: 480px) {
    .navbar-container {
        padding: 10px 15px;
        flex-wrap: wrap;
    }

    .logo-text {
        font-size: 14px;
    }

    .menu {
        width: 100%;
        gap: 10px;
        margin-top: 10px;
        justify-content: flex-start;
    }

    .nav-link {
        font-size: 12px;
        padding: 6px 8px;
    }

    .admin-section {
        gap: 8px;
    }

    .admin-name {
        display: none;
    }

    .logout-btn {
        padding: 6px 10px;
        font-size: 11px;
    }
}
</style>