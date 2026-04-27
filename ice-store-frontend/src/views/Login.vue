<script setup>
import { ref } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";
import { username as userNameState, role as roleState } from "../stores/user.js";

const router = useRouter();
const username = ref("");
const password = ref("");
const loading = ref(false);

async function login() {
    if (!username.value || !password.value) {
        alert("Vui lòng nhập username và password!");
        return;
    }

    loading.value = true;
    try {
        const res = await axios.post("http://localhost:3000/login", {
            username: username.value,
            password: password.value,
        });

        // Lưu thông tin vào localStorage
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("role", res.data.role);
        localStorage.setItem("user_id", res.data.id || res.data.user_id);
        localStorage.setItem("username", username.value);
        localStorage.setItem("is_supervisor", res.data.is_supervisor ? "1" : "0");

        alert("Đăng nhập thành công");
        userNameState.value = username.value;
        roleState.value = res.data.role;

        // Điều hướng admin hoặc user bình thường
        if (res.data.role === "admin" || res.data.role === "staff") {
            router.push("/admin/dashboard");
        } else {
            router.push("/shop");
        }

    } catch (err) {
        alert(err.response?.data?.message || "Đăng nhập thất bại");
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div class="page">
        <div class="login-box">

            <h1 class="title">LOGIN</h1>

            <table class="login-table">
                <tbody>
                    <tr>
                        <td class="label">Username</td>
                        <td>
                            <input v-model="username" placeholder="Enter username" class="admin-input" />
                        </td>
                    </tr>

                    <tr>
                        <td class="label">Password</td>
                        <td>
                            <input v-model="password" type="password" placeholder="Enter password"
                                class="admin-input" />
                        </td>
                    </tr>

                    <tr>
                        <td colspan="2" class="button-row">
                            <button @click="login" :disabled="loading" class="admin-button">
                                {{ loading ? "Processing..." : "LOGIN" }}
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div class="extra-links">
                <router-link to="/forgot-password" class="link-item">Quên mật khẩu?</router-link>
                <router-link to="/register" class="link-item highlight">Đăng ký tài khoản mới</router-link>
            </div>

        </div>
    </div>
</template>

<style scoped>
/* Nền toàn trang */
.page {
    height: 88vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #3a3a3a;
    font-family: Arial, sans-serif;
}

/* Khung login */
.login-box {
    background-color: #ffffff;
    padding: 40px;
    border-radius: 8px;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
    min-width: 400px;
    max-width: 90%;
}

/* Tiêu đề */
.title {
    text-align: center;
    margin-bottom: 30px;
    font-size: 26px;
    letter-spacing: 2px;
    color: #222;
}

/* Table */
.login-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #ccc;
}

.login-table tr {
    border-bottom: 1px solid #ddd;
}

.label {
    padding: 15px;
    background-color: #f2f2f2;
    font-weight: bold;
    width: 120px;
}

/* Input */
.admin-input {
    width: 220px;
    padding: 8px;
    border: 1px solid #999;
    border-radius: 5px;
    font-size: 14px;
}

.admin-input:focus {
    border-color: #007bff;
    outline: none;
}

/* Button row */
.button-row {
    text-align: center;
    padding: 20px;
}

/* Button */
.admin-button {
    padding: 10px 35px;
    background-color: #111;
    color: white;
    border: none;
    font-weight: bold;
    cursor: pointer;
    letter-spacing: 1px;
    border-radius: 5px;
}

.admin-button:hover {
    background-color: #333;
}

.admin-button:disabled {
    background-color: #888;
    cursor: not-allowed;
}

/* 👉 CSS CHO KHU VỰC LINK ĐĂNG KÝ / QUÊN MẬT KHẨU */
.extra-links {
    display: flex;
    justify-content: space-between;
    margin-top: 20px;
    font-size: 14px;
    padding: 0 5px;
}

.link-item {
    color: #666;
    text-decoration: none;
    transition: color 0.3s ease;
}

.link-item:hover {
    color: #111;
    text-decoration: underline;
}

.link-item.highlight {
    color: #007bff;
    font-weight: bold;
}

.link-item.highlight:hover {
    color: #0056b3;
}

/* RESPONSIVE */
/* Tablet */
@media (max-width: 768px) {
    .page {
        padding: 20px;
    }

    .login-box {
        min-width: auto;
        max-width: 100%;
        padding: 30px 20px;
    }

    .title {
        font-size: 22px;
        margin-bottom: 20px;
    }

    .label {
        padding: 10px;
        width: 100px;
        font-size: 13px;
    }

    .admin-input {
        width: 150px;
        padding: 6px;
        font-size: 13px;
    }

    .login-table tr {
        display: block;
        margin-bottom: 10px;
    }

    .login-table td {
        display: block;
        padding: 10px;
    }

    .login-table .label {
        background-color: #f2f2f2;
        font-weight: bold;
    }

    .admin-button {
        padding: 8px 25px;
        font-size: 14px;
    }
}

/* Mobile */
@media (max-width: 480px) {
    .page {
        padding: 10px;
    }

    .login-box {
        min-width: auto;
        max-width: 100%;
        padding: 20px 15px;
        border-radius: 6px;
    }

    .title {
        font-size: 18px;
        margin-bottom: 15px;
        letter-spacing: 1px;
    }

    .login-table {
        border: none;
    }

    .login-table tr,
    .login-table td {
        display: block;
        border: none;
        margin-bottom: 0;
    }

    .login-table tr:not(:last-child) {
        margin-bottom: 15px;
    }

    .login-table td {
        padding: 0;
    }

    .label {
        background-color: #f2f2f2;
        padding: 8px;
        margin-bottom: 5px;
        border-radius: 4px;
        font-size: 12px;
        width: 100%;
    }

    .admin-input {
        width: 100%;
        padding: 8px;
        font-size: 14px;
        box-sizing: border-box;
    }

    .button-row {
        padding: 15px 0 0 0;
        text-align: center;
    }

    .admin-button {
        padding: 10px 20px;
        font-size: 14px;
        width: 100%;
        box-sizing: border-box;
    }

    /* 👉 CHỈNH LẠI LINK CHO MOBILE */
    .extra-links {
        flex-direction: column;
        align-items: center;
        gap: 15px;
        margin-top: 25px;
    }
}
</style>