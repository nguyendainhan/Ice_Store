<template>
    <div class="container">
        <h1 class="title">📋 Quản lý Nhân viên</h1>

        <!-- Buttons -->
        <div class="toolbar">
            <button @click="openAddForm" class="btn-add">+ Thêm nhân viên</button>
            <input v-model="searchKeyword" placeholder="Tìm kiếm theo tên hoặc email..." class="search-input" />
        </div>

        <!-- Table -->
        <div class="table-container">
            <table class="members-table" v-if="filteredMembers.length > 0">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Chức vụ</th>
                        <th>Ngày tạo</th>
                        <th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="member in paginatedMembers" :key="member.id">
                        <td>#{{ member.id }}</td>
                        <td>{{ member.username }}</td>
                        <td>{{ member.email || 'N/A' }}</td>
                        <td><span :class="['badge', member.role]">{{ member.role }}</span></td>
                        <td>{{ formatDate(member.created_at) }}</td>
                        <td class="actions">
                            <button @click="editMember(member)" class="btn yellow">Sửa</button>

                            <button v-if="String(member.id) !== String(currentUserId)" @click="deleteMember(member.id)"
                                class="btn red">Xóa</button>

                            <span v-else style="color: #10b981; font-weight: bold; font-size: 13px; padding: 6px;">(Là
                                bạn)</span>
                        </td>
                    </tr>
                </tbody>
            </table>
            <div v-else class="empty">Không có nhân viên nào</div>
        </div>

        <!-- Pagination -->
        <div class="pagination" v-if="filteredMembers.length > 0">
            <button :disabled="currentPage === 1" @click="currentPage--">Prev</button>
            <span>Trang {{ currentPage }} / {{ totalPages }}</span>
            <button :disabled="currentPage === totalPages" @click="currentPage++">Next</button>
        </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showForm" class="modal-overlay" @click="closeForm">
        <div class="modal-content" @click.stop>
            <h2>{{ editingId ? 'Sửa nhân viên' : 'Thêm nhân viên mới' }}</h2>

            <div class="form-group">
                <label>Username:</label>
                <input v-model="form.username" type="text" placeholder="Nhập username" class="form-input"
                    :disabled="!!editingId" />
            </div>

            <div class="form-group">
                <label>Email:</label>
                <input v-model="form.email" type="email" placeholder="Nhập email" class="form-input" />
            </div>

            <div class="form-group" v-if="!editingId">
                <label>Mật khẩu:</label>
                <input v-model="form.password" type="password" placeholder="Nhập mật khẩu" class="form-input" />
            </div>

            <div class="form-group">
                <label>Chức vụ:</label>
                <select v-model="form.role" class="form-input">
                    <option value="admin">Admin</option>
                    <option value="staff">Nhân viên</option>
                </select>
            </div>

            <div class="modal-actions">
                <button @click="saveMember" class="btn-save">{{ editingId ? 'Cập nhật' : 'Thêm' }}</button>
                <button @click="closeForm" class="btn-cancel">Hủy</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";

const router = useRouter();
const members = ref([]);
const searchKeyword = ref("");
const showForm = ref(false);
const editingId = ref(null);
const currentPage = ref(1);
const itemsPerPage = 10;
const currentUserId = localStorage.getItem("user_id");

const form = ref({
    username: "",
    email: "",
    password: "",
    role: "staff"
});

async function fetchMembers() {
    try {
        const userId = localStorage.getItem("user_id");
        const isSupervisor = localStorage.getItem("is_supervisor");

        // Kiểm tra quyền supervisor
        if (isSupervisor !== "1") {
            alert("Bạn không có quyền quản lý nhân viên");
            router.push("/");
            return;
        }

        const res = await axios.get("https://icestore-api.onrender.com/members", {
            headers: {
                "user_id": userId
            }
        });
        members.value = res.data;
        console.log("Danh sách nhân viên:", res.data);
    } catch (err) {
        console.error("Lỗi lấy danh sách nhân viên:", err);
        if (err.response?.status === 403) {
            alert("Bạn không có quyền quản lý nhân viên");
            router.push("/");
        } else {
            alert("Không thể lấy danh sách nhân viên: " + (err.response?.data?.message || err.message));
        }
    }
}

const filteredMembers = computed(() => {
    return members.value.filter(m =>
        m.username.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
        (m.email && m.email.toLowerCase().includes(searchKeyword.value.toLowerCase()))
    );
});

const totalPages = computed(() => Math.ceil(filteredMembers.value.length / itemsPerPage));

const paginatedMembers = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    return filteredMembers.value.slice(start, start + itemsPerPage);
});

function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" });
}

function openAddForm() {
    editingId.value = null;
    form.value = { username: "", email: "", password: "", role: "staff" };
    showForm.value = true;
}

function editMember(member) {
    editingId.value = member.id;
    form.value = {
        username: member.username,
        email: member.email || "",
        password: "",
        role: member.role
    };
    showForm.value = true;
}

function closeForm() {
    showForm.value = false;
    editingId.value = null;
    form.value = { username: "", email: "", password: "", role: "staff" };
}

async function saveMember() {
    if (!form.value.username.trim()) {
        alert("Vui lòng nhập username!");
        return;
    }

    if (!editingId.value && !form.value.password.trim()) {
        alert("Vui lòng nhập mật khẩu!");
        return;
    }

    try {
        const userId = localStorage.getItem("user_id");
        const config = { headers: { "user_id": userId } };

        if (editingId.value) {
            // Update
            await axios.put(`https://icestore-api.onrender.com/members/${editingId.value}`, {
                email: form.value.email,
                role: form.value.role,
                password: form.value.password || undefined
            }, config);
            alert("Cập nhật nhân viên thành công!");
        } else {
            // Create
            await axios.post("https://icestore-api.onrender.com/members", {
                username: form.value.username,
                email: form.value.email,
                password: form.value.password,
                role: form.value.role
            }, config);
            alert("Thêm nhân viên thành công!");
        }
        closeForm();
        fetchMembers();
    } catch (err) {
        console.error("Lỗi lưu nhân viên:", err);
        alert("Lỗi: " + (err.response?.data?.message || err.message));
    }
}

async function deleteMember(id) {
    const userId = localStorage.getItem("user_id");

    // CHẶN NGAY NẾU TỰ XÓA CHÍNH MÌNH
    if (String(id) === String(userId)) {
        alert("Lỗi: Bạn không thể tự xóa tài khoản của chính mình!");
        return;
    }

    if (!confirm("Bạn chắc chắn muốn xóa nhân viên này?")) return;

    try {
        await axios.delete(`https://icestore-api.onrender.com/members/${id}`, {
            headers: { "user_id": userId }
        });
        alert("Xóa nhân viên thành công!");
        fetchMembers();
    } catch (err) {
        console.error("Lỗi xóa nhân viên:", err);
        alert("Lỗi: " + (err.response?.data?.message || err.message));
    }
}

onMounted(fetchMembers);
</script>

<style scoped>
.container {
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
}

.title {
    font-size: 28px;
    font-weight: bold;
    margin-bottom: 24px;
    color: #1e293b;
}

.toolbar {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.btn-add {
    padding: 10px 20px;
    background-color: #10b981;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: background-color 0.3s;
}

.btn-add:hover {
    background-color: #059669;
}

.search-input {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 14px;
}

.table-container {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow-x: auto;
}

.members-table {
    width: 100%;
    border-collapse: collapse;
}

.members-table thead {
    background-color: #1e293b;
    color: white;
}

.members-table th {
    padding: 12px;
    text-align: left;
    font-weight: bold;
}

.members-table td {
    padding: 12px;
    border-bottom: 1px solid #ddd;
}

.members-table tbody tr:hover {
    background-color: #f5f5f5;
}

.empty {
    padding: 40px;
    text-align: center;
    color: #999;
}

.badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
}

.badge.admin {
    background-color: #fee2e2;
    color: #991b1b;
}

.badge.staff {
    background-color: #dbeafe;
    color: #1e40af;
}

.badge.customer {
    background-color: #dcfce7;
    color: #166534;
}

.actions {
    display: flex;
    gap: 8px;
}

.btn {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.3s;
}

.btn.yellow {
    background-color: #f59e0b;
    color: white;
}

.btn.yellow:hover {
    background-color: #d97706;
}

.btn.red {
    background-color: #dc2626;
    color: white;
}

.btn.red:hover {
    background-color: #991b1b;
}

.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px;
    margin-top: 20px;
}

.pagination button {
    padding: 6px 12px;
    border: 1px solid #ccc;
    background: white;
    cursor: pointer;
    border-radius: 4px;
}

.pagination button:hover:not(:disabled) {
    background-color: #1e293b;
    color: white;
}

.pagination button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Modal */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    padding: 30px;
    border-radius: 8px;
    min-width: 400px;
    max-width: 500px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.modal-content h2 {
    margin-top: 0;
    margin-bottom: 20px;
    color: #1e293b;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 600;
    color: #555;
}

.form-input {
    width: 100%;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    box-sizing: border-box;
}

.form-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
}

.modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
}

.btn-save {
    flex: 1;
    padding: 10px;
    background-color: #10b981;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
}

.btn-save:hover {
    background-color: #059669;
}

.btn-cancel {
    flex: 1;
    padding: 10px;
    background-color: #6b7280;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
}

.btn-cancel:hover {
    background-color: #4b5563;
}

@media (max-width: 768px) {
    .toolbar {
        flex-direction: column;
    }

    .btn-add {
        width: 100%;
    }

    .modal-content {
        min-width: auto;
        max-width: 90%;
    }

    .members-table {
        font-size: 12px;
    }
}
</style>
