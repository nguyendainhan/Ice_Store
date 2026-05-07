<template>
    <div class="admin-chat-container">
        <!-- Cột trái: Danh sách Khách hàng -->
        <div class="chat-sidebar">
            <h3 class="sidebar-title">Hộp thư hỗ trợ</h3>
            <div class="user-list">
                <div v-for="user in chatUsers" :key="user.id"
                    :class="['user-item', activeUserId === user.id ? 'active' : '']"
                    @click="selectUser(user.id, user.full_name || user.username)">
                    <div class="avatar">👨‍ms</div>
                    <div class="user-info">
                        <div class="name-row">
                            <span class="name">{{ user.full_name || user.username }}</span>
                            <span v-if="user.unread_count > 0" class="mini-badge">{{ user.unread_count }}</span>
                        </div>
                        <div class="time">Hoạt động: {{ formatTime(user.last_msg_time) }}</div>
                    </div>
                </div>
                <div v-if="chatUsers.length === 0" class="empty-list">
                    Chưa có tin nhắn nào.
                </div>
            </div>
        </div>

        <!-- Cột phải: Khung Chat với người được chọn -->
        <div class="chat-main">
            <template v-if="activeUserId">
                <div class="chat-header">
                    <h3>Đang hỗ trợ: {{ activeUserName }}</h3>
                </div>

                <div class="chat-body" ref="chatBody">
                    <div v-for="msg in messages" :key="msg.id"
                        :class="['message-wrapper', msg.sender_id === adminId ? 'admin-msg' : 'client-msg']">
                        <div class="message-bubble">{{ msg.message }}</div>
                        <div class="message-time">{{ formatTime(msg.created_at) }}</div>
                    </div>
                </div>

                <div class="chat-footer">
                    <input type="text" v-model="newMessage" @keyup.enter="sendMessage"
                        placeholder="Nhập câu trả lời..." />
                    <button @click="sendMessage" :disabled="!newMessage.trim()">Gửi</button>
                </div>
            </template>

            <!-- Trạng thái chưa chọn ai -->
            <div v-else class="no-selection">
                <span class="icon">💬</span>
                <p>Chọn một khách hàng bên trái để bắt đầu hỗ trợ</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import axios from 'axios';
import { io } from 'socket.io-client';

const chatUsers = ref([]);
const messages = ref([]);
const newMessage = ref('');
const activeUserId = ref(null);
const activeUserName = ref('');
const chatBody = ref(null);

const adminId = Number(localStorage.getItem('user_id'));
let socket = null;

// Lấy danh sách khách hàng
const fetchChatUsers = async () => {
    try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/chats`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        chatUsers.value = res.data;
    } catch (err) {
        console.error("Lỗi tải danh sách chat:", err);
    }
};

// Khi Admin bấm chọn 1 khách hàng
const selectUser = async (userId, userName) => {
    activeUserId.value = userId;
    activeUserName.value = userName;

    try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/chat/${userId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        messages.value = res.data;
        scrollToBottom();

        if (socket) {
            socket.emit("join_chat", userId);
        }

        await axios.put(`${import.meta.env.VITE_API_URL}/chats/mark-read/${userId}`, {}, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        const userIndex = chatUsers.value.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            chatUsers.value[userIndex].unread_count = 0;
        }

        //Phát tín hiệu cho AdminNavbar biết để TÍNH LẠI tổng số chấm đỏ
        window.dispatchEvent(new Event('update-unread-navbar'));

    } catch (err) {
        console.error("Lỗi khi tải hoặc xử lý tin nhắn:", err);
    }
};

// Gửi tin nhắn (Với tư cách Admin)
const sendMessage = () => {
    if (!newMessage.value.trim() || !activeUserId.value || !socket) return;

    socket.emit("send_message", {
        user_id: activeUserId.value,
        sender_id: adminId,
        message: newMessage.value
    });

    newMessage.value = '';
};

const scrollToBottom = async () => {
    await nextTick();
    if (chatBody.value) chatBody.value.scrollTop = chatBody.value.scrollHeight;
};

const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

onMounted(() => {
    fetchChatUsers();

    socket = io(import.meta.env.VITE_API_URL);

    socket.on("receive_message", async (newMsg) => {
        if (newMsg.user_id === activeUserId.value) {
            messages.value.push(newMsg);
            scrollToBottom();

            await axios.put(`${import.meta.env.VITE_API_URL}/chats/mark-read/${activeUserId.value}`, {}, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            window.dispatchEvent(new Event('update-unread-navbar'));
        }
        else {
            fetchChatUsers();
        }
    });
});

onUnmounted(() => {
    if (socket) socket.disconnect();
});
</script>

<style scoped>
.admin-chat-container {
    display: flex;
    height: 70vh;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    border: 1px solid #e2e8f0;
}

/* Cột trái */
.chat-sidebar {
    width: 300px;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    background: #f8fafc;
}

.sidebar-title {
    padding: 15px;
    margin: 0;
    border-bottom: 1px solid #e2e8f0;
    font-size: 16px;
    color: #1e293b;
}

.user-list {
    flex: 1;
    overflow-y: auto;
}

.user-item {
    display: flex;
    padding: 15px;
    cursor: pointer;
    border-bottom: 1px solid #f1f5f9;
    transition: 0.2s;
}

.user-item:hover {
    background: #f1f5f9;
}

.user-item.active {
    background: #e0f2fe;
    border-left: 4px solid #0ea5e9;
}

.user-item .avatar {
    font-size: 24px;
    margin-right: 12px;
}

.user-info .name {
    font-weight: bold;
    font-size: 14px;
    color: #0f172a;
}

.user-info .time {
    font-size: 12px;
    color: #64748b;
    margin-top: 4px;
}

.empty-list {
    padding: 20px;
    text-align: center;
    color: #94a3b8;
    font-style: italic;
}

/* Cột phải */
.chat-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #ffffff;
}

.chat-header {
    padding: 15px 20px;
    border-bottom: 1px solid #e2e8f0;
    background: #ffffff;
}

.chat-header h3 {
    margin: 0;
    font-size: 16px;
    color: #1e293b;
}

.chat-body {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 15px;
    background: #f8fafc;
}

.message-wrapper {
    display: flex;
    flex-direction: column;
    max-width: 70%;
}

.admin-msg {
    align-self: flex-end;
    align-items: flex-end;
}

.client-msg {
    align-self: flex-start;
    align-items: flex-start;
}

.message-bubble {
    padding: 10px 15px;
    border-radius: 12px;
    font-size: 14px;
    line-height: 1.5;
}

.admin-msg .message-bubble {
    background: #0ea5e9;
    color: white;
    border-bottom-right-radius: 4px;
}

.client-msg .message-bubble {
    background: #e2e8f0;
    color: #1e293b;
    border-bottom-left-radius: 4px;
}

.message-time {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 4px;
}

.name-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.mini-badge {
    background-color: #ef4444;
    color: white;
    font-size: 10px;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 10px;
}

.chat-footer {
    padding: 15px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    gap: 10px;
    background: white;
}

.chat-footer input {
    flex: 1;
    padding: 10px 15px;
    border: 1px solid #cbd5e1;
    border-radius: 20px;
    outline: none;
}

.chat-footer input:focus {
    border-color: #0ea5e9;
}

.chat-footer button {
    background: #0ea5e9;
    color: white;
    border: none;
    padding: 0 20px;
    border-radius: 20px;
    cursor: pointer;
    font-weight: bold;
}

.chat-footer button:disabled {
    background: #94a3b8;
    cursor: not-allowed;
}

.no-selection {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: #94a3b8;
}

.no-selection .icon {
    font-size: 48px;
    margin-bottom: 15px;
    opacity: 0.5;
}
</style>