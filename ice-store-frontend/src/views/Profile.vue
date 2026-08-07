<script setup>
import axios from "axios";
import { ref, onMounted, computed } from "vue";
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

// Thêm các biến lưu trữ chi tiêu theo kỳ
const spent3m = ref(0);
const spent6m = ref(0);
const spent9m = ref(0);

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

// === LOGIC TÍNH TOÁN THANH TIẾN TRÌNH ===
const tierProgress = computed(() => {
    let target = 0;
    let current = 0;
    let nextTierName = '';

    switch (userTier.value) {
        case 'normal':
            target = 5000000;
            current = spent3m.value;
            nextTierName = 'Hạng Đồng';
            break;
        case 'bronze':
            target = 20000000;
            current = spent6m.value;
            nextTierName = 'Hạng Bạc';
            break;
        case 'silver':
            target = 50000000;
            current = spent9m.value;
            nextTierName = 'VIP Vàng';
            break;
        case 'gold':
            target = 50000000;
            current = spent9m.value;
            nextTierName = 'Duy trì VIP Vàng';
            break;
    }

    const missing = Math.max(0, target - current);
    const percentage = Math.min(100, (current / target) * 100);

    let message = '';
    if (userTier.value === 'gold') {
        message = missing === 0
            ? `🎉 Bạn đã đủ điều kiện duy trì VIP Vàng kỳ tiếp theo!`
            : `Chi tiêu thêm ${missing.toLocaleString('vi-VN')} đ để tiếp tục giữ hạng Vàng.`;
    } else {
        message = `Chỉ còn ${missing.toLocaleString('vi-VN')} đ nữa để thăng ${nextTierName}!`;
    }

    return { target, current, percentage, message };
});

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
        avatar.value = res.data.avatarUrl;
        toast.success("Thành công!");
        window.dispatchEvent(new CustomEvent("avatar-updated"));
    } catch (err) {
        console.error(err);
        toast.error("Lỗi khi tải ảnh lên");
    }
};

async function fetchProfile() {
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

        // Cập nhật dữ liệu chi tiêu từng kỳ từ API
        spent3m.value = Number(data.spent_3m) || 0;
        spent6m.value = Number(data.spent_6m) || 0;
        spent9m.value = Number(data.spent_9m) || 0;
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
                        <button @click="uploadAvatar" :disabled="!selectedFile" class="avatar-btn">Cập nhật ảnh</button>
                    </div>

                    <div class="info-section" style="flex: 1;">
                        <h2>{{ fullName || 'Người dùng' }}</h2>

                        <div style="display: flex; align-items: center; gap: 10px; margin-top: 5px;">
                            <img :src="getTierImage(userTier)" :class="['tier-icon', userTier]" alt="Tier Badge" />
                            <p class="tier-name">Đẳng cấp: <strong>{{ getTierName(userTier) }}</strong></p>
                        </div>
                        <p class="spent-info">Tổng chi tiêu: {{ Number(totalSpent).toLocaleString('vi-VN') }} VND</p>

                        <!-- THANH TIẾN TRÌNH LEO HẠNG -->
                        <div class="progress-container">
                            <p class="progress-text">{{ tierProgress.message }}</p>
                            <div class="progress-bar-bg">
                                <div class="progress-bar-fill" :style="{ width: tierProgress.percentage + '%' }"></div>
                            </div>
                            <p class="progress-detail">
                                Đã tích lũy xét duyệt: {{ tierProgress.current.toLocaleString('vi-VN') }} / {{
                                    tierProgress.target.toLocaleString('vi-VN') }} đ
                            </p>
                        </div>

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
                    <button @click="updateProfile" :disabled="loading" class="update-btn">
                        {{ loading ? 'Đang lưu...' : 'Lưu thay đổi' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.profile-header {
    display: flex;
    align-items: flex-start;
    gap: 20px;
    padding: 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

/* TIẾN TRÌNH HẠNG - CSS MỚI */
.progress-container {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px dashed #cbd5e1;
}

.progress-text {
    font-size: 13px;
    color: #eab308;
    font-weight: 600;
    margin-bottom: 6px;
    margin-top: 0;
}

.progress-bar-bg {
    width: 100%;
    height: 10px;
    background-color: #f1f5f9;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #38bdf8 0%, #3b82f6 100%);
    border-radius: 10px;
    transition: width 0.8s ease-out;
}

.progress-detail {
    font-size: 11px;
    color: #64748b;
    margin-top: 6px;
    text-align: right;
    margin-bottom: 0;
}

/* Các css cũ giữ nguyên */
.tier-icon {
    width: 40px;
    height: 40px;
    object-fit: contain;
    transition: transform 0.3s ease;
}

.tier-icon:hover {
    transform: translateY(-3px) scale(1.1);
}

.tier-icon.gold {
    filter: drop-shadow(0 0 10px rgba(250, 204, 21, 0.6));
}

.tier-icon.silver {
    filter: drop-shadow(0 0 10px rgba(148, 163, 184, 0.6));
}

.tier-icon.bronze {
    filter: drop-shadow(0 0 8px rgba(180, 83, 9, 0.4));
}

.tier-name {
    color: #475569;
    font-size: 15px;
    margin: 0;
}

.spent-info {
    color: #10b981;
    font-weight: 600;
    font-size: 14px;
    margin: 8px 0 0 0;
}

.avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 130px;
}

.avatar-preview {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid #e2e8f0;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    margin-bottom: 15px;
    background-color: #f8fafc;
}

.avatar-btn {
    padding: 6px 12px;
    font-size: 12px;
    background-color: #f1f5f9;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    cursor: pointer;
    color: #475569;
}

.avatar-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.avatar-section input[type="file"] {
    margin-bottom: 10px;
    font-size: 12px;
    max-width: 150px;
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
    box-shadow: 0 2px 15px rgba(0, 0, 0, 0.08);
    width: 100%;
    max-width: 550px;
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
    font-weight: 600;
    color: #334155;
    font-size: 14px;
}

.form-group input {
    padding: 12px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 15px;
    transition: border-color 0.2s;
}

.form-group input:focus {
    outline: none;
    border-color: #38bdf8;
}

.button-row {
    display: flex;
    justify-content: flex-end;
    margin-top: 10px;
}

.update-btn {
    background-color: #38bdf8;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    font-size: 15px;
    transition: background-color 0.2s;
}

.update-btn:hover:not(:disabled) {
    background-color: #0284c7;
}

.update-btn:disabled {
    background-color: #94a3b8;
    cursor: not-allowed;
}

@media (max-width: 600px) {
    .profile-header {
        flex-direction: column;
        align-items: center;
        text-align: center;
    }

    .info-section {
        width: 100%;
    }
}
</style>