<template>
    <nav class="nav-container">

        <!-- Logo -->
        <div class="logo">
            <router-link to="/shop" class="logo-text">IceStore</router-link>
        </div>

        <!-- Hamburger Menu (Mobile) -->
        <button class="hamburger" @click="isMenuOpen = !isMenuOpen" v-if="isMobile">
            <span></span>
            <span></span>
            <span></span>
        </button>

        <!-- Sidebar (Menu + Auth) -->
        <div class="sidebar" :class="{ active: isMenuOpen }">
            <!-- Menu -->
            <div class="menu">
                <router-link to="/shop" @click="isMenuOpen = false">Shop</router-link>
                <router-link to="/cart" @click="isMenuOpen = false">Cart</router-link>
                <router-link to="/orders" @click="isMenuOpen = false">Orders</router-link>
            </div>

            <!-- User Section -->
            <div class="auth-section">
                <span class="welcome">
                    Xin chào, {{ username }}
                </span>
                <button @click="logout" class="btn-logout">
                    Logout
                </button>
            </div>
        </div>

    </nav>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { username as userNameState, role as roleState } from "../stores/user.js";

const router = useRouter();
const username = userNameState;
const isMenuOpen = ref(false);
const isMobile = ref(false);

function checkMobileSize() {
    isMobile.value = typeof window !== "undefined" && window.innerWidth <= 768;
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

    isMenuOpen.value = false;

    // Chuyển về trang chính
    router.push("/login");
}

onMounted(() => {
    checkMobileSize();
    // Đóng menu khi resize window
    window.addEventListener("resize", () => {
        checkMobileSize();
        if (window.innerWidth > 768) {
            isMenuOpen.value = false;
        }
    });
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

/* AUTH SECTION */
.auth-section {
    display: flex;
    gap: 20px;
    align-items: center;
}

/* Welcome text */
.welcome {
    font-size: 16px;
    font-weight: 500;
}

/* Logout Button */
.btn-logout {
    padding: 10px 20px;
    background-color: #dc2626;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    font-size: 16px;
    transition: background-color 0.3s ease;
}

.btn-logout:hover {
    background-color: #b91c1c;
}

/* RESPONSIVE - TABLET & MOBILE */
@media (max-width: 768px) {
    .nav-container {
        padding: 12px 20px;
    }

    .logo {
        font-size: 24px;
    }

    /* Reduce gaps on tablet */
    .sidebar {
        gap: 15px;
    }

    .menu {
        gap: 15px;
    }

    .auth-section {
        gap: 10px;
    }

    .btn-logout {
        padding: 8px 12px;
        font-size: 14px;
    }

    /* Show hamburger menu */
    .hamburger {
        display: flex;
    }

    /* Sidebar wrapper (dropdown) */
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
    }

    .sidebar.active {
        max-height: 600px;
    }

    /* Menu on mobile */
    .menu {
        flex-direction: column;
        gap: 0;
        padding: 20px;
        border-bottom: 1px solid #334155;
    }

    .menu a {
        padding: 10px 0;
        border-bottom: 1px solid #334155;
        display: block;
    }

    .menu a:last-child {
        border-bottom: none;
    }

    /* Auth section on mobile */
    .auth-section {
        flex-direction: column;
        gap: 10px;
        padding: 20px;
    }

    .welcome {
        font-size: 12px;
    }

    .btn-logout {
        width: 100%;
        text-align: center;
    }
}

@media (max-width: 480px) {
    .nav-container {
        padding: 15px 20px;
    }

    .logo {
        font-size: 24px;
    }

    .menu a {
        font-size: 14px;
    }

    .welcome {
        font-size: 13px;
    }

    .btn-logout {
        padding: 8px 16px;
        font-size: 14px;
    }
}
</style>
