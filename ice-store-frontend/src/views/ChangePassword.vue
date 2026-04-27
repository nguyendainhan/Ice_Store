<script setup>
import { ref } from "vue";
import axios from "axios";

const oldPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const loading = ref(false);

const userId = localStorage.getItem("user_id");

async function changePassword() {
    if (!oldPassword.value || !newPassword.value || !confirmPassword.value) {
        alert("Vui lòng điền đầy đủ thông tin!");
        return;
    }

    if (newPassword.value !== confirmPassword.value) {
        alert("Mật khẩu mới không khớp!");
        return;
    }

    loading.value = true;
    try {
        await axios.put("http://localhost:3000/change-password", {
            old_password: oldPassword.value,
            new_password: newPassword.value
        }, {
            headers: { user_id: userId }
        });

        alert("Đổi mật khẩu thành công!");
        oldPassword.value = "";
        newPassword.value = "";
        confirmPassword.value = "";
    } catch (err) {
        alert(err.response?.data?.message || "Đổi mật khẩu thất bại");
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div class="page">
        <div class="login-box">
            <h1 class="title">ĐỔI MẬT KHẨU</h1>
            <p class="subtitle">Vui lòng không chia sẻ mật khẩu cho người khác</p>

            <div class="form-col">
                <div class="form-group">
                    <label>Mật khẩu hiện tại</label>
                    <input v-model="oldPassword" type="password" placeholder="Nhập mật khẩu cũ" class="admin-input" />
                </div>
                <div class="form-group">
                    <label>Mật khẩu mới</label>
                    <input v-model="newPassword" type="password" placeholder="Nhập mật khẩu mới" class="admin-input" />
                </div>
                <div class="form-group">
                    <label>Xác nhận mật khẩu mới</label>
                    <input v-model="confirmPassword" type="password" placeholder="Nhập lại mật khẩu mới"
                        class="admin-input" />
                </div>
            </div>

            <div class="button-row">
                <button @click="changePassword" :disabled="loading" class="admin-button">
                    {{ loading ? "Đang xử lý..." : "XÁC NHẬN ĐỔI" }}
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.page {
    min-height: 88vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f1f5f9;
    padding: 30px 15px;
}

.login-box {
    background-color: #ffffff;
    padding: 40px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    width: 450px;
    /* Thu hẹp lại vì form này ít trường */
    max-width: 100%;
}

.title {
    text-align: center;
    margin: 0;
    font-size: 24px;
    color: #1e293b;
}

.subtitle {
    text-align: center;
    color: #64748b;
    margin-bottom: 30px;
    font-size: 14px;
}

.form-col {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.form-group {
    display: flex;
    flex-direction: column;
}

.form-group label {
    font-weight: bold;
    margin-bottom: 8px;
    color: #475569;
    font-size: 14px;
}

.admin-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 5px;
    font-size: 14px;
    box-sizing: border-box;
    transition: border 0.3s ease;
}

.admin-input:focus {
    border-color: #3b82f6;
    outline: none;
}

.button-row {
    text-align: center;
    margin-top: 30px;
}

.admin-button {
    padding: 12px;
    background-color: #10b981;
    /* Màu xanh lá cho hành động thành công */
    color: white;
    border: none;
    font-weight: bold;
    cursor: pointer;
    border-radius: 5px;
    font-size: 15px;
    width: 100%;
    transition: background-color 0.3s ease;
}

.admin-button:hover {
    background-color: #059669;
}

.admin-button:disabled {
    background-color: #94a3b8;
    cursor: not-allowed;
}
</style>