<script setup>
import axios from "axios";
import { ref, onMounted } from "vue";
import { toast } from "vue3-toastify";
import imgBronze from '../assets/bronze.png';
import imgSilver from '../assets/silver.png';
import imgGold from '../assets/gold.png';

const fullName = ref("");
const email = ref("");
const phone = ref("");
const address = ref("");
const avatar = ref("");
const loading = ref(false);

const userId = localStorage.getItem("user_id");
const selectedFile = ref(null);
const userTier = ref('normal');
const totalSpent = ref(0);

// Khi người dùng chọn file từ máy tính
const onFileSelected = (event) => {
    selectedFile.value = event.target.files[0];
};

const getTierImage = (tier) => {
    const images = {
        bronze: imgBronze,
        silver: imgSilver,
        gold: imgGold
    };
    return images[tier] || 'https://cdn-icons-png.flaticon.com/512/1154/1154987.png';
};
const getTierName = (tier) => {
    const names = { normal: 'Thành viên Mới', bronze: 'Hạng Đồng', silver: 'Hạng Bạc', gold: 'VIP Vàng' };
    return names[tier] || 'Thành viên Mới';
};
// Gửi ảnh lên server
const uploadAvatar = async () => {
    const formData = new FormData();
    formData.append("avatar", selectedFile.value);

    try {
        const res = await axios.put(`${import.meta.env.VITE_API_URL}/profile/avatar`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
                "user_id": localStorage.getItem("user_id")
            }
        });

        // SỬA LẠI DÒNG NÀY
        avatar.value = res.data.avatarUrl;

        toast.success("Thành công!");
        window.dispatchEvent(new CustomEvent("avatar-updated"));
    } catch (err) {
        console.error(err);
        toast.error("Lỗi khi tải ảnh lên");
    }
};

async function fetchProfile() {
    console.log("ID đang gửi lên:", userId); // Thêm dòng này để test xem ID có bị rỗng không

    if (!userId || userId === "undefined") {
        toast.error("Chưa có user_id, vui lòng đăng xuất và đăng nhập lại!");
        return;
    }

    try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/profile`, {
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
        avatar.value = data.avatar || "";
        userTier.value = data.tier || 'normal';
        totalSpent.value = data.total_spent || 0;
    } catch (error) {
        console.error("Lỗi khi lấy thông tin hồ sơ:", error);
        toast.error("Không thể tải thông tin hồ sơ. Vui lòng thử lại sau.");
    }
}

async function updateProfile() {
    if (!fullName.value || !email.value || !phone.value || !address.value) {
        toast.error("Vui lòng điền đầy đủ thông tin!");
        return;
    }

    loading.value = true;
    try {
        await axios.put(`${import.meta.env.VITE_API_URL}/profile`, {
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

        toast.success("Cập nhật hồ sơ thành công!");
    } catch (error) {
        const errorMsg = error.response?.data?.message || "Có lỗi xảy ra khi cập nhật hồ sơ.";
        console.error("Lỗi khi cập nhật hồ sơ:", error);
        toast.error(errorMsg);
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
                <div class="profile-header">
                    <div class="avatar-section">
                        <img :src="avatar || `https://ui-avatars.com/api/?name=${fullName}&background=random`"
                            class="avatar-preview" />
                        <input type="file" @change="onFileSelected" accept="image/*" />
                        <button @click="uploadAvatar" :disabled="!selectedFile">Cập nhật ảnh</button>
                    </div>

                    <div class="info-section">
                        <h2>{{ fullName || username }}</h2>

                        <div style="display: flex; align-items: center; gap: 10px; margin-top: 5px;">
                            <img :src="getTierImage(userTier)" :class="['tier-icon', userTier]" alt="Tier Badge"
                                style="width: 40px; height: 40px;" />
                            <p class="tier-name" style="margin: 0;">Đẳng cấp: <strong>{{ getTierName(userTier)
                                    }}</strong></p>
                        </div>

                        <p class="spent-info">Tổng chi tiêu: {{ Number(totalSpent).toLocaleString('vi-VN') }} VND</p>
                    </div>
                </div>
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
.profile-header {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.tier-icon {
    width: 80px;
    height: 80px;
    object-fit: contain;
    transition: transform 0.3s ease;
}

/* Hiệu ứng bay bổng khi trỏ chuột vào huy hiệu */
.tier-icon:hover {
    transform: translateY(-5px) scale(1.1);
}

/* Đổ bóng phát sáng lấp lánh tùy theo hạng */
.tier-icon.gold {
    filter: drop-shadow(0 0 15px rgba(250, 204, 21, 0.6));
}

.tier-icon.silver {
    filter: drop-shadow(0 0 15px rgba(148, 163, 184, 0.6));
}

.tier-icon.bronze {
    filter: drop-shadow(0 0 10px rgba(180, 83, 9, 0.4));
}

.tier-name {
    color: #475569;
    font-size: 16px;
    margin: 5px 0;
}

.spent-info {
    color: #10b981;
    font-weight: 600;
    font-size: 14px;
}

/* KHU VỰC CHỨA AVATAR */
.avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 150px;
}

.avatar-preview {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid #e2e8f0;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    margin-bottom: 15px;
    background-color: #f8fafc;
}

.avatar-section input[type="file"] {
    margin-bottom: 10px;
    font-size: 13px;
    max-width: 180px;
}

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