<template>
    <div class="page-container bg-blue-50">
        <header class="header">
            <h1 class="header-title">Đội ngũ chúng tôi</h1>
            <p class="header-subtitle">Những con người đằng sau thành công của Ice Store</p>
        </header>

        <div class="team-grid">
            <div class="team-card">
                <div class="avatar">👨‍💼</div>
                <h3 class="team-name">Nguyễn Văn A</h3>
                <p class="team-role">Giám đốc điều hành</p>
                <p class="team-bio">
                    Với hơn 10 năm kinh nghiệm trong ngành đá lạnh, anh A đã dẫn dắt Ice Store từ một startup nhỏ
                    thành một thương hiệu uy tín trên thị trường.
                </p>
            </div>
            <div class="team-card">
                <div class="avatar">👩‍💼</div>
                <h3 class="team-name">Trần Thị B</h3>
                <p class="team-role">Quản lý sản xuất</p>
                <p class="team-bio">
                    Chị B chịu trách nhiệm giám sát quy trình sản xuất, đảm bảo chất lượng đá viên tinh khiết đạt
                    chuẩn an toàn thực phẩm.
                </p>
            </div>
            <div class="team-card">
                <div class="avatar">🚚</div>
                <h3 class="team-name">Đội ngũ giao hàng</h3>
                <p class="team-role">Giao hàng 24/7</p>
                <p class="team-bio">
                    Đội ngũ giao hàng chuyên nghiệp, nhanh chóng và luôn sẵn sàng phục vụ khách hàng mọi lúc.
                </p>
            </div>
        </div>
    </div>
</template>

<script setup>
import{ref, onMounted} from "vue";
import axios from "axios";
</script>
<style scoped>
.header {
    background: linear-gradient(135deg, #0056b3, #0099ff);
    color: white;
    text-align: center;
    padding: 60px 20px;
}

.header-title {
    font-size: 36px;
    font-weight: bold;
}

.header-subtitle {
    font-size: 18px;
}

.team-grid {
    display: grid;
    gap: 30px;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    max-width: 1000px;
    margin: 0 auto;
}

.team-card {
    background-color: white;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    text-align: center;
}

.avatar {
    font-size: 50px;
    margin-bottom: 15px;
}

.team-name {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 5px;
}

.team-role {
    color: #2563eb;
    margin-bottom: 15px;
    font-weight: bold;
}

.team-bio {
    color: #555;
    font-size: 0.95rem;
    line-height: 1.4;
}

.team-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
}
</style>