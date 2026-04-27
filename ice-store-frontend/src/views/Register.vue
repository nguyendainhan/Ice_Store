<script setup>
import { ref } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";

const router = useRouter();

const username = ref("");
const password = ref("");
const confirmPassword = ref("");
const fullName = ref("");
const email = ref("");
const phone = ref("");
const address = ref("");
const verificationCode = ref("");
const loading = ref(false);

// --- CẬP NHẬT: Hàm gửi mã giả lập ---
function sendVerificationCode() {
    if (!email.value && !phone.value) {
        alert("Vui lòng nhập Email hoặc Số điện thoại để nhận mã!");
        return;
    }

    alert("Hệ thống đang test. Mã xác nhận của bạn là: 123456");

    // Tự động điền luôn mã vào ô input để test cho lẹ
    verificationCode.value = "123456";
}

async function register() {
    // 1. Kiểm tra điền đủ thông tin
    if (!username.value || !password.value || !confirmPassword.value ||
        !fullName.value || !email.value || !phone.value || !address.value || !verificationCode.value) {
        alert("Vui lòng điền đầy đủ thông tin!");
        return;
    }

    // 2. Kiểm tra mật khẩu khớp
    if (password.value !== confirmPassword.value) {
        alert("Mật khẩu xác nhận không khớp!");
        return;
    }

    // --- CẬP NHẬT: Kiểm tra mã xác nhận cứng ---
    if (verificationCode.value !== "123456") {
        alert("Mã xác nhận không chính xác! Vui lòng nhập 123456");
        return;
    }

    loading.value = true;
    try {
        await axios.post("https://icestore-api.onrender.com/register", {
            username: username.value,
            password: password.value,
            full_name: fullName.value,
            email: email.value,
            phone: phone.value,
            address: address.value,
            verification_code: verificationCode.value // Bạn vẫn có thể gửi lên API nếu Backend cần log lại
        });
        alert("Đăng ký thành công!");
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

            <div class="form-grid">

                <div class="form-group">
                    <label>Username</label>
                    <input v-model="username" placeholder="Nhập tên đăng nhập" class="admin-input" />
                </div>
                <div class="form-group">
                    <label>Full Name</label>
                    <input v-model="fullName" placeholder="Nhập họ và tên" class="admin-input" />
                </div>

                <div class="form-group">
                    <label>Email</label>
                    <input v-model="email" type="email" placeholder="Nhập địa chỉ email" class="admin-input" />
                </div>
                <div class="form-group">
                    <label>Address</label>
                    <input v-model="address" placeholder="Nhập địa chỉ giao hàng" class="admin-input" />
                </div>

                <div class="form-group">
                    <label>Phone</label>
                    <input v-model="phone" type="tel" placeholder="Nhập số điện thoại" class="admin-input" />
                </div>
                <div class="form-group">
                    <label>Verify Code</label>
                    <div class="verify-row">
                        <input v-model="verificationCode" placeholder="Mã xác nhận" class="admin-input verify-input" />
                        <button @click="sendVerificationCode" class="btn-send-code" type="button">Gửi mã</button>
                    </div>
                </div>

                <div class="form-group">
                    <label>Password</label>
                    <input v-model="password" type="password" placeholder="Nhập mật khẩu" class="admin-input" />
                </div>
                <div class="form-group">
                    <label>Confirm Password</label>
                    <input v-model="confirmPassword" type="password" placeholder="Xác nhận mật khẩu"
                        class="admin-input" />
                </div>

            </div>

            <div class="button-row">
                <button @click="register" :disabled="loading" class="admin-button">
                    {{ loading ? "Processing..." : "REGISTER" }}
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Nền toàn trang */
.page {
    min-height: 88vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #3a3a3a;
    font-family: Arial, sans-serif;
    padding: 30px 15px;
}

/* Khung login */
.login-box {
    background-color: #ffffff;
    padding: 40px;
    border-radius: 8px;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
    width: 700px;
    /* Nới rộng để chứa 2 cột đẹp hơn */
    max-width: 100%;
}

/* Tiêu đề */
.title {
    text-align: center;
    margin-top: 0;
    margin-bottom: 30px;
    font-size: 26px;
    letter-spacing: 2px;
    color: #222;
}

/* ===== CSS GRID CHIA 2 CỘT ===== */
.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    /* Chia 2 cột bằng nhau */
    gap: 20px 25px;
    /* Khoảng cách giữa các hàng và cột */
}

.form-group {
    display: flex;
    flex-direction: column;
}

.form-group label {
    font-weight: bold;
    margin-bottom: 8px;
    color: #555;
    font-size: 14px;
}

/* Input chung */
.admin-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ccc;
    border-radius: 5px;
    font-size: 14px;
    box-sizing: border-box;
    /* Rất quan trọng để input không tràn viền */
    transition: border 0.3s ease;
}

.admin-input:focus {
    border-color: #007bff;
    outline: none;
    box-shadow: 0 0 5px rgba(0, 123, 255, 0.2);
}

/* Dòng mã xác nhận */
.verify-row {
    display: flex;
    gap: 10px;
}

.verify-input {
    flex: 1;
    /* Tự động co giãn chiếm phần trống */
}

.btn-send-code {
    padding: 0 15px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: bold;
    white-space: nowrap;
    transition: background-color 0.3s ease;
}

.btn-send-code:hover {
    background-color: #0056b3;
}

/* Nút đăng ký */
.button-row {
    text-align: center;
    margin-top: 35px;
}

.admin-button {
    padding: 12px 40px;
    background-color: #111;
    color: white;
    border: none;
    font-weight: bold;
    cursor: pointer;
    letter-spacing: 1px;
    border-radius: 5px;
    font-size: 16px;
    width: 100%;
    /* Cho nút full chiều ngang sẽ rất đẹp */
    transition: background-color 0.3s ease;
}

.admin-button:hover {
    background-color: #333;
}

.admin-button:disabled {
    background-color: #888;
    cursor: not-allowed;
}

/* ===== RESPONSIVE MOBILE ===== */
@media (max-width: 600px) {
    .form-grid {
        grid-template-columns: 1fr;
        /* Ép về 1 cột khi màn hình nhỏ */
        gap: 15px;
    }

    .login-box {
        padding: 25px 20px;
    }

    .title {
        font-size: 22px;
        margin-bottom: 20px;
    }
}
</style>