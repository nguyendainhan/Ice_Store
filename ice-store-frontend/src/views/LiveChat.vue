<template>
    <div class="chat-bubble-btn" @click="toggleChat" v-if="!isOpen">
        <span class="chat-icon">💬</span>
        <span class="badge" v-if="unreadCount > 0">{{ unreadCount }}</span>
    </div>

    <div class="chat-window" v-show="isOpen">
        <div class="chat-header">
            <div class="header-info">
                <span class="avatar">👨‍💻</span>
                <div>
                    <h4>Hỗ trợ khách hàng</h4>
                    <p>Trực tuyến</p>
                </div>
            </div>
            <button class="close-btn" @click="toggleChat">✖</button>
        </div>
        <div class="chat-body" ref="chatBody">
            <div v-for="msg in messages" :key="msg.id"
                :class="['message-wrapper', msg.sender_id === currentUserId.id ? 'my-msg' : 'admin-msg']">
                <div class="message-bubble">
                    {{ msg.message }}
                </div>
                <div class="message-time">
                    {{ formatTime(msg.created_at) }}
                </div>
            </div>
            <div v-if="messages.length === 0" class="empty-chat">
                Xin chào! IceStore có thể giúp gì cho bạn hôm nay?
            </div>
        </div>

        <div class="chat-footer">
            <input type="text" v-model="newMessage" @keyup.enter="sendMessage" placeholder="Nhập tin nhắn..."
                :disabled="!currentUserId" />
            <button @click="sendMessage" :disabled="!newMessage.trim() || !currentUserId">Gửi</button>
        </div>
        <div v-if="!currentUserId" class="login-warning">
            Vui lòng đăng nhập để gửi tin nhắn.
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import axios from "axios";
import { io } from "socket.io-client";

const isOpen = ref(false);
const messages = ref([]);
const newMessage = ref('');
const unreadCount = ref(0);
const chatBody = ref(null);

const currentUserId = ref(Number(localStorage.getItem("user_id")));
let socket = null;

function toggleChat() {
    currentUserId.value = Number(localStorage.getItem("user_id"));
    isOpen.value = !isOpen.value;
    if (isOpen.value) {
        unreadCount.value = 0;
        scrollToBottom();

    }
}

const fetchChatHistory = async () => {
    if (!currentUserId.value) return;
    try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/chat/${currentUserId.value}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        messages.value = res.data;
        scrollToBottom();
    } catch (err) {
        console.error("Lỗi khi tải lịch sử chat:", err);
    }
};

// Hàm gửi tin nhắn
const sendMessage = () => {
    if (!newMessage.value.trim() || !currentUserId.value || !socket) return;

    socket.emit("send_message", {
        user_id: currentUserId.value,
        sender_id: currentUserId.value,
        message: newMessage.value
    });

    newMessage.value = ''; // Xóa input
};

// Hàm cuộn xuống cuối chat
const scrollToBottom = async () => {
    await nextTick(() => {
        if (chatBody.value) {
            chatBody.value.scrollTop = chatBody.value.scrollHeight;
        }
    });
};

// Hàm định dạng thời gian
const formatTime = (dateStr) => {
    if (!dateStr) return '';

    const date = new Date(dateStr);

    return date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
};

onMounted(() => {
    if (!currentUserId.value) return;
    fetchChatHistory();

    socket = io(import.meta.env.VITE_API_URL);

    socket.emit("join_chat", currentUserId.value);

    socket.on("connect", () => {
        console.log("Đã kết nối WebSocket cho Live Chat");
    });

    socket.on("receive_message", (msg) => {
        messages.value.push(msg);
        if (!isOpen.value) {
            unreadCount.value++;
        }
        scrollToBottom();
    });
});

onUnmounted(() => {
    if (socket) {
        socket.disconnect();
        console.log("Đã ngắt kết nối WebSocket cho Live Chat");
    }
});
</script>

<style scoped>
/* --- NÚT BONG BÓNG CHAT --- */
.chat-bubble-btn {
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 60px;
    height: 60px;
    background-color: #3b82f6;
    /* Xanh lam */
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
    z-index: 1000;
    transition: transform 0.3s;
}

.chat-bubble-btn:hover {
    transform: scale(1.1);
}

.chat-bubble-btn .icon {
    font-size: 28px;
}

.badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: #ef4444;
    /* Đỏ */
    color: white;
    font-size: 12px;
    font-weight: bold;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
}

/* --- HỘP THOẠI CHAT --- */
.chat-window {
    position: fixed;
    bottom: 100px;
    right: 30px;
    width: 350px;
    height: 450px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 5px 25px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    z-index: 1000;
    overflow: hidden;
}

/* Header */
.chat-header {
    background: #1e293b;
    color: white;
    padding: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header-info {
    display: flex;
    align-items: center;
    gap: 10px;
}

.header-info .avatar {
    font-size: 24px;
}

.header-info h4 {
    margin: 0;
    font-size: 16px;
}

.header-info p {
    margin: 0;
    font-size: 12px;
    color: #94a3b8;
}

.close-btn {
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
}

/* Body - Khu vực tin nhắn */
.chat-body {
    flex: 1;
    padding: 15px;
    background: #f8fafc;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.empty-chat {
    text-align: center;
    color: #94a3b8;
    font-size: 14px;
    margin-top: auto;
    margin-bottom: auto;
}

.message-wrapper {
    display: flex;
    flex-direction: column;
    max-width: 80%;
}

.my-msg {
    align-self: flex-end;
    align-items: flex-end;
}

.admin-msg {
    align-self: flex-start;
    align-items: flex-start;
}

.message-bubble {
    padding: 10px 15px;
    border-radius: 18px;
    font-size: 14px;
    line-height: 1.4;
    word-wrap: break-word;
}

.my-msg .message-bubble {
    background: #3b82f6;
    color: white;
    border-bottom-right-radius: 4px;
}

.admin-msg .message-bubble {
    background: #e2e8f0;
    color: #0f172a;
    border-bottom-left-radius: 4px;
}

.message-time {
    font-size: 10px;
    color: #94a3b8;
    margin-top: 4px;
}

/* Footer - Input nhập tin nhắn */
.chat-footer {
    display: flex;
    padding: 15px;
    background: white;
    border-top: 1px solid #e2e8f0;
}

.chat-footer input {
    flex: 1;
    padding: 10px 15px;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    outline: none;
    font-size: 14px;
}

.chat-footer input:focus {
    border-color: #3b82f6;
}

.chat-footer button {
    background: none;
    border: none;
    color: #3b82f6;
    font-weight: bold;
    padding: 0 10px;
    cursor: pointer;
}

.chat-footer button:disabled {
    color: #94a3b8;
    cursor: not-allowed;
}

.login-warning {
    text-align: center;
    background: #fef2f2;
    color: #ef4444;
    padding: 8px;
    font-size: 12px;
    font-weight: bold;
}
</style>