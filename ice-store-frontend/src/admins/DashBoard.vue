<template>
    <div class="dashboard-container">
        <h2>Thống kê doanh thu</h2>

        <div v-if="loading" class="loading">Đang tải dữ liệu...</div>

        <div v-else class="stats-grid">
            <div class="stat-card">
                <div class="stat-title">Doanh thu hôm nay</div>
                <div class="stat-value">{{ formatCurrency(revenue.today) }}</div>
                <div class="stat-subtitle">{{ ordersCount.today }} đơn hàng</div>
            </div>

            <div class="stat-card">
                <div class="stat-title">Doanh thu tuần này</div>
                <div class="stat-value">{{ formatCurrency(revenue.thisWeek) }}</div>
                <div class="stat-subtitle">{{ ordersCount.thisWeek }} đơn hàng</div>
            </div>

            <div class="stat-card">
                <div class="stat-title">Doanh thu tháng này</div>
                <div class="stat-value">{{ formatCurrency(revenue.thisMonth) }}</div>
                <div class="stat-subtitle">{{ ordersCount.thisMonth }} đơn hàng</div>
            </div>

            <div class="stat-card">
                <div class="stat-title">Doanh thu năm nay</div>
                <div class="stat-value">{{ formatCurrency(revenue.thisYear) }}</div>
                <div class="stat-subtitle">{{ ordersCount.thisYear }} đơn hàng</div>
            </div>
        </div>
        <div v-show="!loading" class="chart-container">
            <h3>Doanh thu 7 ngày gần nhất</h3>
            <div class="canvas-wrapper">
                <canvas ref="chartCanvas"></canvas>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from "vue";
import axios from "axios";
import Chart from "chart.js/auto";

const orders = ref([]);
const loading = ref(true);
const chartCanvas = ref(null);
let revenueChart = null;

async function fetchOrders() {
    loading.value = true;
    try {
        const res = await axios.get("https://icestore-api.onrender.com/orders");
        orders.value = res.data.filter((order) => order.status === "completed");
    } catch (err) {
        console.error("Lỗi lấy đơn hàng:", err);
    } finally {
        loading.value = false;
        await nextTick();
        renderChart();
    }
}

const now = new Date();
const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

const dayOfWeek = now.getDay(); // 0 (CN) - 6 (T7)
const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1).getTime();

const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

const revenue = computed(() => {
    let today = 0, thisWeek = 0, thisMonth = 0, thisYear = 0;

    orders.value.forEach(order => {
        const orderTime = new Date(order.created_at).getTime();

        const amount = Number(order.total) || 0;
        if (orderTime >= startOfToday) today += amount;
        if (orderTime >= startOfWeek) thisWeek += amount;
        if (orderTime >= startOfMonth) thisMonth += amount;
        if (orderTime >= startOfYear) thisYear += amount;
    });

    return { today, thisWeek, thisMonth, thisYear };
});

const ordersCount = computed(() => {
    let today = 0, thisWeek = 0, thisMonth = 0, thisYear = 0;

    orders.value.forEach(order => {
        const orderTime = new Date(order.created_at).getTime();

        if (orderTime >= startOfToday) today++;
        if (orderTime >= startOfWeek) thisWeek++;
        if (orderTime >= startOfMonth) thisMonth++;
        if (orderTime >= startOfYear) thisYear++;
    });

    return { today, thisWeek, thisMonth, thisYear };
});

function formatCurrency(amount) {
    return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

function renderChart() {
    if (!chartCanvas.value) return;

    if (revenueChart) {
        revenueChart.destroy();
    }

    const labels = [];
    const data = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const day = new Date(today);
        day.setDate(today.getDate() - i);
        // Đặt về đầu ngày và cuối ngày
        const startOfDay = new Date(day);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(day);
        endOfDay.setHours(23, 59, 59, 999);

        labels.push(`${day.getDate()}/${day.getMonth() + 1}`);

        const dayTotal = orders.value.reduce((sum, order) => {
            const orderTime = new Date(order.created_at).getTime();
            if (orderTime >= startOfDay.getTime() && orderTime <= endOfDay.getTime()) {
                return sum + (Number(order.total) || 0);
            }
            return sum;
        }, 0);
        data.push(dayTotal);
    }

    const ctx = chartCanvas.value.getContext("2d");
    revenueChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Doanh thu (VND)",
                data: data,
                borderColor: "#0099ff",
                backgroundColor: "rgba(0, 153, 255, 0.2)",
                borderRadius: 5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return context.raw.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
                        }
                    }
                }
            }
        }
    });
}

onMounted(() => {
    fetchOrders();
});
</script>

<style scoped>
.dashboard-container {
    margin: 0 auto;
    padding: 20px;
}

.stats-grid {
    display: grid;
    gap: 20px;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    margin-top: 20px;
}

.stat-card {
    background-color: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    text-align: center;
}

.stat-title {
    font-size: 18px;
    color: #555;
    margin-bottom: 10px;
}

.stat-value {
    font-size: 24px;
    font-weight: bold;
    color: #0099ff;
    margin-bottom: 5px;
}

.stat-subtitle {
    color: #777;
}

.loading {
    text-align: center;
    font-size: 18px;
    color: #555;
}

.chart-container {
    margin-top: 40px;
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    margin-top: 20px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.chart-container h3 {
    margin-top: 0;
    margin-bottom: 20px;
    color: #555;
}

.canvas-wrapper {
    position: relative;
    height: 350px;
    width: 100%;
}

/* MOBILE */
@media (max-width: 600px) {
    .stats-grid {
        grid-template-columns: 1fr;
    }
}
</style>