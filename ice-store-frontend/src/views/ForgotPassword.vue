<script setup>
import { ref } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";

const router = useRouter();
const username = ref("");
const email = ref("");
const newPassword = ref("");
const loading = ref(false);

async function resetPassword() {
    if (!username.value || !email.value || !newPassword.value) {
        alert("Vui lòng nhập đầy đủ Username, Email và Mật khẩu mới!");
        return;
    }

    loading.value = true;
    try {
        const res = await axios.post("https://icestore-api.onrender.com/forgot-password", {
            username: username.value,
            email: email.value,
            new_password: newPassword.value,
        });

        alert("Thành công: " + res.data.message);
        router.push("/login"); // Đổi thành công thì tự động quay về trang Đăng nhập
    } catch (err) {
        alert("Lỗi: " + (err.response?.data?.message || "Không thể khôi phục mật khẩu"));
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div class="page">
        <div class="login-box">
            <h1 class="">QUÊN MẬT KHẨU</h1>
            <p class="subtitle">Nhập thông tin tài khoản của bạn để đặt lại mật khẩu.</p>

            <table class="login-table">
                <tbody>
                    <tr>
                        <td class="label">Username</td>
                        <td>
                            <input v-model="username" placeholder="Nhập tên đăng nhập" class="admin-input" />
                        </td>
                    </tr>

                    <tr>
                        <td class="label">Email</td>
                        <td>
                            <input v-model="email" type="email" placeholder="Nhập email đã đăng ký"
                                class="admin-input" />
                        </td>
                    </tr>

                    <tr>
                        <td class="label">Mật khẩu mới</td>
                        <td>
                            <input v-model="newPassword" type="password" placeholder="Nhập mật khẩu mới"
                                class="admin-input" />
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2" class="button-row">
                            <button @click="resetPassword" :disabled="loading" class="admin-button">
                                {{ loading ? "Processing..." : "Đặt lại mật khẩu" }}
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<style scoped>
/* Dùng chung style với trang Login để đồng bộ giao diện */
.page {
    height: 88vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #3a3a3a;
    font-family: Arial, sans-serif;
}

.login-box {
    background-color: #ffffff;
    padding: 40px;
    border-radius: 8px;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
    min-width: 400px;
    max-width: 90%;
}

.title {
    text-align: center;
    margin-bottom: 10px;
    font-size: 24px;
    letter-spacing: 1px;
    color: #222;
}

.subtitle {
    text-align: center;
    color: #666;
    font-size: 14px;
    margin-bottom: 25px;
    line-height: 1.5;
}

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

.admin-input {
    width: 90%;
    padding: 8px;
    border: 1px solid #999;
    border-radius: 5px;
    font-size: 14px;
}

.admin-input:focus {
    border-color: #007bff;
    outline: none;
}

.button-row {
    text-align: center;
    padding: 20px;
}

.admin-button {
    padding: 10px 35px;
    background-color: #10b981;
    /* Màu xanh lá cho nút đổi mật khẩu */
    color: white;
    border: none;
    font-weight: bold;
    cursor: pointer;
    letter-spacing: 1px;
    border-radius: 5px;
    transition: background 0.3s;
}

.admin-button:hover {
    background-color: #059669;
}

.admin-button:disabled {
    background-color: #888;
    cursor: not-allowed;
}

.extra-links {
    text-align: center;
    margin-top: 20px;
}

.link-item {
    color: #007bff;
    text-decoration: none;
    font-weight: bold;
    font-size: 14px;
}

.link-item:hover {
    text-decoration: underline;
}

/* RESPONSIVE GIỐNG LOGIN */
@media (max-width: 768px) {
    .page {
        padding: 20px;
    }

    .login-box {
        padding: 30px 20px;
    }

    .label {
        width: 100px;
        font-size: 13px;
    }

    .login-table tr,
    .login-table td {
        display: block;
        border: none;
    }

    .login-table td {
        padding: 10px;
    }

    .login-table .label {
        background-color: transparent;
        padding-bottom: 0;
    }

    .admin-input {
        width: 100%;
        box-sizing: border-box;
    }
}
</style>