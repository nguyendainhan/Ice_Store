<template>
    <nav class="nav-container">

        <div class="logo">
            <router-link to="/shop" class="logo-text">IceStore</router-link>
        </div>

        <button class="hamburger" @click="isMenuOpen = !isMenuOpen" v-if="isMobile">
            <span></span>
            <span></span>
            <span></span>
        </button>

        <div class="sidebar" :class="{ active: isMenuOpen }">
            <div class="menu">
                <router-link to="/shop" @click="isMenuOpen = false">Shop</router-link>
                <router-link to="/cart" @click="isMenuOpen = false">Cart</router-link>
                <router-link to="/orders" @click="isMenuOpen = false">Orders</router-link>
            </div>

            <div class="auth-section" ref="userDropdownRef">
                <div class="user-dropdown-toggle" @click="isUserMenuOpen = !isUserMenuOpen">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span class="welcome-text">{{ username }}</span>
                </div>

                <div class="dropdown-menu" :class="{ 'show': isUserMenuOpen }">
                    <router-link to="/profile" class="dropdown-item" @click="closeMenus">
                        Thông tin người dùng
                    </router-link>
                    <router-link to="/change-password" class="dropdown-item" @click="closeMenus">
                        Đổi mật khẩu
                    </router-link>
                    <button @click="logout" class="dropdown-item btn-logout">
                        Đăng xuất
                    </button>
                </div>
            </div>
        </div>

    </nav>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { username as userNameState, role as roleState } from "../stores/user.js";

const router = useRouter();
const username = userNameState;
const isMenuOpen = ref(false);
const isMobile = ref(false);

// Biến quản lý trạng thái bật/tắt của Dropdown user
const isUserMenuOpen = ref(false);
const userDropdownRef = ref(null);

function checkMobileSize() {
    isMobile.value = typeof window !== "undefined" && window.innerWidth <= 768;
}

// Hàm đóng tất cả menu
function closeMenus() {
    isUserMenuOpen.value = false;
    isMenuOpen.value = false;
}

// Hàm xử lý click ra ngoài để tự động đóng dropdown
function handleClickOutside(event) {
    if (userDropdownRef.value && !userDropdownRef.value.contains(event.target)) {
        isUserMenuOpen.value = false;
    }
}

function logout() {
    // Xóa localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("user_id");

    // Reset state reactive để UI cập nhật ngay
    userNameState.value = "";
    roleState.value = "";

    closeMenus();

    // Chuyển về trang chính
    router.push("/login");
}

onMounted(() => {
    checkMobileSize();
    // Lắng nghe sự kiện click ra ngoài màn hình
    document.addEventListener("click", handleClickOutside);

    // Đóng menu khi resize window
    window.addEventListener("resize", () => {
        checkMobileSize();
        if (window.innerWidth > 768) {
            isMenuOpen.value = false;
            isUserMenuOpen.value = false; // Tự động đóng dropdown khi xoay ngang điện thoại
        }
    });
});

onUnmounted(() => {
    // Nhớ gỡ bỏ sự kiện khi component bị hủy để tránh rò rỉ bộ nhớ
    document.removeEventListener("click", handleClickOutside);
});
</script>

<style scoped>
/* NAV CONTAINER */
.nav-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #1e293b;
    padding: 15px 30px;
    color: white;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    z-index: 1000;
    flex-wrap: nowrap;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    box-sizing: border-box;
}

/* LOGO */
.logo {
    display: flex;
    align-items: center;
    gap: 10px;
}

.logo-text {
    font-size: 32px;
    font-weight: bold;
    text-decoration: none;
    color: #38bdf8;
    letter-spacing: 1px;
}

/* HAMBURGER MENU */
.hamburger {
    display: flex;
    flex-direction: column;
    background: none;
    border: none;
    cursor: pointer;
    gap: 5px;
}

.hamburger span {
    width: 30px;
    height: 4px;
    background-color: white;
    border-radius: 2px;
    transition: 0.3s;
}

/* MENU + SIDEBAR */
.sidebar {
    display: flex;
    gap: 30px;
    align-items: center;
}

.menu {
    display: flex;
    gap: 30px;
}

.menu a {
    color: white;
    text-decoration: none;
    font-weight: 500;
    font-size: 16px;
    transition: 0.3s;
}

.menu a:hover {
    color: #38bdf8;
}

/* ===== AUTH SECTION CỦA BẠN ĐÂY ===== */
.auth-section {
    position: relative;
    /* Để dropdown menu canh theo vị trí này */
}

/* Nút bấm bật tắt Dropdown */
.user-dropdown-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background-color: #334155;
    border-radius: 20px;
    cursor: pointer;
    transition: background-color 0.3s ease;
}

.user-dropdown-toggle:hover {
    background-color: #475569;
}

.welcome-text {
    font-size: 15px;
    font-weight: 500;
}

/* Box Dropdown Menu */
.dropdown-menu {
    position: absolute;
    top: calc(100% + 15px);
    /* Cách mép dưới của nút 1 chút */
    right: 0;
    background-color: #ffffff;
    border-radius: 8px;
    min-width: 200px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    overflow: hidden;

    /* Hiệu ứng mượt mà khi ẩn/hiện */
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: all 0.3s ease;
}

.dropdown-menu.show {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}

/* Các thẻ a và button trong Dropdown */
.dropdown-item {
    padding: 12px 20px;
    text-decoration: none;
    color: #333;
    font-size: 14px;
    font-weight: 500;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    transition: background-color 0.2s, color 0.2s;
}

.dropdown-item:hover {
    background-color: #f1f5f9;
    color: #38bdf8;
}

.btn-logout {
    border-top: 1px solid #e2e8f0;
    color: #dc2626;
}

.btn-logout:hover {
    background-color: #fef2f2;
    color: #b91c1c;
}

/* ===== RESPONSIVE - TABLET & MOBILE ===== */
@media (max-width: 768px) {
    .nav-container {
        padding: 12px 20px;
    }

    .logo {
        font-size: 24px;
    }

    .hamburger {
        display: flex;
    }

    .sidebar {
        position: fixed;
        top: 100%;
        left: 0;
        right: 0;
        background-color: #0f172a;
        flex-direction: column;
        gap: 0;
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
        width: 100%;
        align-items: stretch;
        /* Stretch full width */
    }

    .sidebar.active {
        max-height: 600px;
    }

    .menu {
        flex-direction: column;
        gap: 0;
        padding: 10px 20px;
        border-bottom: 1px solid #334155;
    }

    .menu a {
        padding: 15px 0;
        border-bottom: 1px solid #334155;
        display: block;
    }

    .menu a:last-child {
        border-bottom: none;
    }

    /* Auth section on mobile */
    .auth-section {
        padding: 20px;
    }

    .user-dropdown-toggle {
        justify-content: center;
        background-color: transparent;
        padding: 0 0 15px 0;
        border-radius: 0;
    }

    .user-dropdown-toggle:hover {
        background-color: transparent;
    }

    /* Đổi giao diện dropdown trên mobile thành danh sách thả thẳng xuống */
    .dropdown-menu {
        position: static;
        box-shadow: none;
        background-color: transparent;
        min-width: 100%;

        /* Ghi đè hiệu ứng ở desktop */
        display: none;
        opacity: 1;
        visibility: visible;
        transform: none;
        border-top: 1px solid #334155;
        padding-top: 10px;
    }

    .dropdown-menu.show {
        display: flex;
    }

    .dropdown-item {
        color: #cbd5e1;
        padding: 12px 0;
    }

    .dropdown-item:hover {
        background-color: transparent;
        color: white;
    }

    .btn-logout {
        border-top: none;
        color: #ef4444;
    }

    .btn-logout:hover {
        background-color: transparent;
        color: #dc2626;
    }
}
</style>