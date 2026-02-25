<script setup>
import { ref } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";

const router = useRouter();
const username = ref("");
const password = ref("");
const confirmPassword = ref("");
const loading = ref(false);

async function register() {
    if (!username.value || !password.value || !confirmPassword.value) {
        alert("Vui lòng điền đầy đủ thông tin!");
        return;
    }

    if (password.value !== confirmPassword.value) {
        alert("Mật khẩu xác nhận không khớp!");
        return;
    }

    loading.value = true;
    try {
        await axios.post("http://localhost:3000/register", {
            username: username.value,
            password: password.value,
        });
        alert("Đăng ký thành công");
        router.push("/login");
    } catch (err) {
        alert(err.response?.data?.message || "Đăng ký thất bại");
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div class="page">
        <div class="login-box">

            <h1 class="title">REGISTER</h1>

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
                        <td class="label">Confirm</td>
                        <td>
                            <input v-model="confirmPassword" type="password" placeholder="Confirm password"
                                class="admin-input" />
                        </td>
                    </tr>

                    <tr>
                        <td colspan="2" class="button-row">
                            <button @click="register" :disabled="loading" class="admin-button">
                                {{ loading ? "Processing..." : "REGISTER" }}
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>

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
}
</style>