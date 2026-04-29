<template>
    <div class="dashboard-container">
        <div class="dashboard-header">
            <h2>Báo Cáo Tài Chính & Lợi Nhuận</h2>
            <button @click="exportToExcel" class="btn-export">📊 Xuất ra Excel</button>
        </div>

        <div v-if="loading" class="loading">
            <div class="spinner"></div> Đang tổng hợp dữ liệu...
        </div>

        <div v-else class="stats-grid">
            <div class="stat-card">
                <div class="stat-title">Hôm nay ({{ stats.today.orders }} đơn)</div>
                <div class="stat-details">
                    <div class="detail-row"><span>Doanh thu:</span> <span class="val rev">{{
                        formatCurrency(stats.today.rev) }}</span></div>
                    <div class="detail-row"><span>Chi phí:</span> <span class="val cost">{{
                        formatCurrency(stats.today.cost) }}</span></div>
                    <div class="divider"></div>
                    <div class="detail-row total"><span>Lợi nhuận:</span> <span class="val prof"
                            :class="{ 'loss': stats.today.prof < 0 }">{{ formatCurrency(stats.today.prof) }}</span>
                    </div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-title">Tuần này ({{ stats.thisWeek.orders }} đơn)</div>
                <div class="stat-details">
                    <div class="detail-row"><span>Doanh thu:</span> <span class="val rev">{{
                        formatCurrency(stats.thisWeek.rev) }}</span></div>
                    <div class="detail-row"><span>Chi phí:</span> <span class="val cost">{{
                        formatCurrency(stats.thisWeek.cost) }}</span></div>
                    <div class="divider"></div>
                    <div class="detail-row total"><span>Lợi nhuận:</span> <span class="val prof"
                            :class="{ 'loss': stats.thisWeek.prof < 0 }">{{ formatCurrency(stats.thisWeek.prof)
                            }}</span>
                    </div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-title">Tháng này ({{ stats.thisMonth.orders }} đơn)</div>
                <div class="stat-details">
                    <div class="detail-row"><span>Doanh thu:</span> <span class="val rev">{{
                        formatCurrency(stats.thisMonth.rev) }}</span></div>
                    <div class="detail-row"><span>Chi phí:</span> <span class="val cost">{{
                        formatCurrency(stats.thisMonth.cost) }}</span></div>
                    <div class="divider"></div>
                    <div class="detail-row total"><span>Lợi nhuận:</span> <span class="val prof"
                            :class="{ 'loss': stats.thisMonth.prof < 0 }">{{ formatCurrency(stats.thisMonth.prof)
                            }}</span></div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-title">Năm nay ({{ stats.thisYear.orders }} đơn)</div>
                <div class="stat-details">
                    <div class="detail-row"><span>Doanh thu:</span> <span class="val rev">{{
                        formatCurrency(stats.thisYear.rev) }}</span></div>
                    <div class="detail-row"><span>Chi phí:</span> <span class="val cost">{{
                        formatCurrency(stats.thisYear.cost) }}</span></div>
                    <div class="divider"></div>
                    <div class="detail-row total"><span>Lợi nhuận:</span> <span class="val prof"
                            :class="{ 'loss': stats.thisYear.prof < 0 }">{{ formatCurrency(stats.thisYear.prof)
                            }}</span>
                    </div>
                </div>
            </div>
        </div>

        <div v-show="!loading" class="chart-container">
            <h3>Biểu đồ Tài chính 7 ngày gần nhất</h3>
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
import { toast } from "vue3-toastify";
import * as XLSX from 'xlsx';

const orders = ref([]);
const importLogs = ref([]);
const loading = ref(true);
const chartCanvas = ref(null);
let financialChart = null;

async function fetchData() {
    loading.value = true;
    try {
        // Gọi cả 2 API cùng lúc để tiết kiệm thời gian
        const [ordersRes, logsRes] = await Promise.all([
            axios.get(`${import.meta.env.VITE_API_URL}/orders`),
            axios.get(`${import.meta.env.VITE_API_URL}/import-logs`)
        ]);

        orders.value = ordersRes.data.filter((order) => order.status === "completed");
        importLogs.value = logsRes.data;
    } catch (err) {
        console.error("Lỗi lấy dữ liệu:", err);
        toast.error("Không thể tải dữ liệu thống kê!");
    } finally {
        loading.value = false;
        await nextTick();
        renderChart();
    }
}

// === HÀM XUẤT FILE EXCEL ===
function exportToExcel() {
    if (orders.value.length === 0 && importLogs.value.length === 0) {
        toast.warning("Không có dữ liệu để xuất!");
        return;
    }

    // Chuẩn bị dữ liệu Sheet 1: DOANH THU (Từ Đơn hàng)
    const orderData = orders.value.map(o => ({
        "Mã ĐH": o.id,
        "Ngày đặt": new Date(o.created_at).toLocaleString('vi-VN'),
        "Khách hàng": o.username || o.user_id,
        "Tổng tiền (VND)": Number(o.total),
        "Trạng thái": o.status === 'completed' ? 'Đã hoàn thành' : o.status
    }));
    const wsOrders = XLSX.utils.json_to_sheet(orderData);

    // Chuẩn bị dữ liệu Sheet 2: CHI PHÍ (Từ Nhật ký nhập hàng)
    const importData = importLogs.value.map(i => ({
        "Mã Phiếu": i.id,
        "Ngày nhập": new Date(i.created_at).toLocaleString('vi-VN'),
        "Mã SP": i.product_id,
        "Số lượng": i.quantity_added,
        "Giá vốn (VND)": Number(i.import_price),
        "Tổng chi phí (VND)": Number(i.total_cost),
        "Ghi chú": i.note || ""
    }));
    const wsImports = XLSX.utils.json_to_sheet(importData);

    // Tự động căn chỉnh độ rộng cột cho đẹp
    const wscols = [{ wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 30 }];
    wsOrders['!cols'] = wscols;
    wsImports['!cols'] = wscols;

    // Gom các Sheet lại thành 1 file Excel (Workbook)
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsOrders, "Doanh Thu Bán Hàng");
    XLSX.utils.book_append_sheet(wb, wsImports, "Chi Phí Nhập Kho");

    // Tạo tên file chứa ngày tháng hiện tại và cho tải xuống
    const todayStr = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
    const fileName = `Bao_Cao_Tai_Chinh_IceStore_${todayStr}.xlsx`;

    XLSX.writeFile(wb, fileName);
    toast.success("Đã xuất báo cáo Excel thành công!");
}

const now = new Date();
const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
const dayOfWeek = now.getDay();
const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1).getTime();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

// Tính toán gộp Doanh thu, Chi phí, Lợi nhuận
const stats = computed(() => {
    let res = {
        today: { rev: 0, cost: 0, prof: 0, orders: 0 },
        thisWeek: { rev: 0, cost: 0, prof: 0, orders: 0 },
        thisMonth: { rev: 0, cost: 0, prof: 0, orders: 0 },
        thisYear: { rev: 0, cost: 0, prof: 0, orders: 0 }
    };

    // 1. Cộng Doanh thu
    orders.value.forEach(order => {
        const orderTime = new Date(order.created_at).getTime();
        const amount = Number(order.total) || 0;

        if (orderTime >= startOfToday) { res.today.rev += amount; res.today.orders++; }
        if (orderTime >= startOfWeek) { res.thisWeek.rev += amount; res.thisWeek.orders++; }
        if (orderTime >= startOfMonth) { res.thisMonth.rev += amount; res.thisMonth.orders++; }
        if (orderTime >= startOfYear) { res.thisYear.rev += amount; res.thisYear.orders++; }
    });

    // 2. Cộng Chi phí nhập hàng
    importLogs.value.forEach(log => {
        const logTime = new Date(log.created_at).getTime();
        const cost = Number(log.total_cost) || 0;

        if (logTime >= startOfToday) res.today.cost += cost;
        if (logTime >= startOfWeek) res.thisWeek.cost += cost;
        if (logTime >= startOfMonth) res.thisMonth.cost += cost;
        if (logTime >= startOfYear) res.thisYear.cost += cost;
    });

    // 3. Tính Lợi nhuận (Lợi nhuận = Doanh thu - Chi phí)
    for (let key in res) {
        res[key].prof = res[key].rev - res[key].cost;
    }

    return res;
});

function formatCurrency(amount) {
    return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

function renderChart() {
    if (!chartCanvas.value) return;
    if (financialChart) financialChart.destroy();

    const labels = [];
    const revData = [];
    const costData = [];
    const profData = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const day = new Date(today);
        day.setDate(today.getDate() - i);

        const startOfDay = new Date(day);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(day);
        endOfDay.setHours(23, 59, 59, 999);

        labels.push(`${day.getDate()}/${day.getMonth() + 1}`);

        // Tính doanh thu trong ngày
        const dayRev = orders.value.reduce((sum, order) => {
            const t = new Date(order.created_at).getTime();
            return (t >= startOfDay.getTime() && t <= endOfDay.getTime()) ? sum + (Number(order.total) || 0) : sum;
        }, 0);

        // Tính chi phí trong ngày
        const dayCost = importLogs.value.reduce((sum, log) => {
            const t = new Date(log.created_at).getTime();
            return (t >= startOfDay.getTime() && t <= endOfDay.getTime()) ? sum + (Number(log.total_cost) || 0) : sum;
        }, 0);

        revData.push(dayRev);
        costData.push(dayCost);
        profData.push(dayRev - dayCost); // Lợi nhuận = Doanh thu - Chi phí
    }

    const ctx = chartCanvas.value.getContext("2d");
    financialChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Doanh thu",
                    data: revData,
                    backgroundColor: "#3b82f6", // Xanh dương
                    borderRadius: 4,
                },
                {
                    label: "Chi phí",
                    data: costData,
                    backgroundColor: "#ef4444", // Đỏ
                    borderRadius: 4,
                },
                {
                    label: "Lợi nhuận",
                    data: profData,
                    backgroundColor: "#10b981", // Xanh lá
                    borderRadius: 4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return context.dataset.label + ': ' + context.raw.toLocaleString('vi-VN') + ' ₫';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return value.toLocaleString('vi-VN') + ' ₫';
                        }
                    }
                }
            }
        }
    });
}

onMounted(() => {
    fetchData();
});
</script>

<style scoped>
.dashboard-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px;
}

.dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 15px;
}

.dashboard-header h2 {
    margin-bottom: 0;
    /* Xóa margin cũ để cân bằng với nút */
}

.btn-export {
    background-color: #10b981;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 15px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;
}

.btn-export:hover {
    background-color: #059669;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-export:active {
    transform: translateY(0);
}

h2 {
    color: #1e293b;
    margin-bottom: 24px;
    font-size: 28px;
}

.stats-grid {
    display: grid;
    gap: 20px;
    grid-template-columns: repeat(4, 1fr);
}

.stat-card {
    background-color: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    border: 1px solid #e2e8f0;
}

.stat-title {
    font-size: 16px;
    font-weight: 600;
    color: #475569;
    margin-bottom: 15px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.stat-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.detail-row {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    color: #64748b;
}

.val {
    font-weight: 600;
}

.val.rev {
    color: #3b82f6;
}

.val.cost {
    color: #ef4444;
}

.divider {
    height: 1px;
    background-color: #e2e8f0;
    margin: 4px 0;
}

.detail-row.total {
    font-size: 16px;
    font-weight: bold;
    color: #0f172a;
}

.val.prof {
    color: #10b981;
}

.val.prof.loss {
    color: #dc2626;
}

/* Hiện màu đỏ nếu lỗ */

.loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: 200px;
    font-size: 18px;
    color: #64748b;
}

.chart-container {
    margin-top: 30px;
    background-color: white;
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    border: 1px solid #e2e8f0;
}

.chart-container h3 {
    margin-top: 0;
    margin-bottom: 20px;
    color: #1e293b;
    font-size: 18px;
}

.canvas-wrapper {
    position: relative;
    height: 400px;
    width: 100%;
}

/* RESPONSIVE */
@media (max-width: 1024px) {
    .stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 600px) {
    .stats-grid {
        grid-template-columns: 1fr;
    }

    .canvas-wrapper {
        height: 300px;
    }
}
</style>