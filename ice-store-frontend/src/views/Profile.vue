<script setup>
import axios from "axios";
import { ref, onMounted } from "vue";

const fullName = ref("");
const email = ref("");
const phone = ref("");
const address = ref("");
const loading = ref(false);

const userId = localStorage.getItem("user_id");

async function fetchProfile() {
    console.log("ID đang gửi lên:", userId); // Thêm dòng này để test xem ID có bị rỗng không

    if (!userId || userId === "undefined") {
        alert("Chưa có user_id, vui lòng đăng xuất và đăng nhập lại!");
        return;
    }

    try {
        const response = await axios.get(`https://icestore-api.onrender.com/profile`, {
            headers: {
                "Content-Type": "application/json",
                "user_id": userId
            }
        });
        const data = response.data;
        fullName.value = data.full_name || "";
        email.value = data.email || "";
        phone.value = data.phone || "";
        address.value = data.address || "";
    } catch (error) {
        console.error("Lỗi khi lấy thông tin hồ sơ:", error);
        alert("Không thể tải thông tin hồ sơ. Vui lòng thử lại sau.");
    }
}

async function updateProfile() {
    if (!fullName.value || !email.value || !phone.value || !address.value) {
        alert("Vui lòng điền đầy đủ thông tin!");
        return;
    }

    loading.value = true;
    try {
        await axios.put(`https://icestore-api.onrender.com/profile`, {
            full_name: fullName.value,
            email: email.value,
            phone: phone.value,
            address: address.value
        }, {
            headers: {
                "Content-Type": "application/json",
                "user_id": userId
            }
        });

        alert("Cập nhật hồ sơ thành công!");
    } catch (error) {
        console.error("Lỗi khi cập nhật hồ sơ:", error);
        alert("Không thể cập nhật hồ sơ. Vui lòng thử lại sau.");
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    fetchProfile();
});
</script>

<template>
    <div class="page">
        <div class="login-box">
            <h1 class="title">Hồ sơ của tôi</h1>
            <p class="subtitle">Quản lý thông tin cá nhân để bảo mật tài khoản</p>

            <div class="form-grid">
                <div class="form-group">
                    <label>Họ và tên</label>
                    <input type="text" v-model="fullName" placeholder="Nhập họ và tên" />
                </div>

                <div class="form-group">
                    <label>Email</label>
                    <input type="email" v-model="email" placeholder="Nhập địa chỉ email" />
                </div>

                <div class="form-group">
                    <label>Số điện thoại</label>
                    <input type="tel" v-model="phone" placeholder="Nhập số điện thoại" />
                </div>

                <div class="form-group">
                    <label>Địa chỉ</label>
                    <input type="text" v-model="address" placeholder="Nhập địa chỉ giao hàng" />
                </div>

                <div class="button-row">
                    <button @click="updateProfile" :disabled="loading" class="update-btn">{{ loading ? 'Đang lưu...' :
                        'Lưu thay đổi' }}</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.page {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    padding: 20px;
}

.login-box {
    background-color: #fff;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 500px;
}

.form-grid {
    display: grid;
    gap: 20px;
}

.form-group {
    display: flex;
    flex-direction: column;
}

.form-group label {
    margin-bottom: 8px;
    font-weight: bold;
}

.form-group input {
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 16px;
}

.button-row {
    display: flex;
    justify-content: flex-end;
}

.update-btn {
    background-color: #38bdf8;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
}

.update-btn:disabled {
    background-color: #a0a0a0;
    cursor: not-allowed;
}

/* Responsive */
@media (max-width: 600px) {
    .login-box {
        padding: 20px;
    }
}
</style>