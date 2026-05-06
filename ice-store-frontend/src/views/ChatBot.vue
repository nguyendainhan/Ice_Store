<template>
    <div class="chatbot-container">
        <button @click="toggleChat" class="chatbot-toggle">
            <i v-if="!isOpen" class="fas fa-comment-dots"></i>
            <i v-else class="fas fa-times"></i>
        </button>

        <div v-if="isOpen" class="chatbot-window">
            <div class="chatbot-header">
                <h3>ChatBot IceStore</h3>
            </div>

            <div class="chatbot-messages" ref="messagesContainer">
                <div v-for="(message, index) in messages" :key="index"
                    :class="['chatbot-message', message.sender === 'user' ? 'user-message' : 'bot-message']">
                    {{ message.text }}
                </div>
                <div v-if="isLoading" class="message-bubble bot-message typing-indicator">
                    AI đang suy nghĩ...
                </div>
            </div>
            <div class="chatbot-input">
                <input v-model="userInput" @keyup.enter="sendMessage" placeholder="Nhập tin nhắn..."
                    :disabled="isLoading" />
                <button @click="sendMessage" :disabled="isLoading || !userInput.trim()">
                    Gửi
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import axios from 'axios';

const isOpen = ref(false);
const userInput = ref('');
const isLoading = ref(false);
const messagesContainer = ref(null);

const messages = ref([
    { sender: 'bot', text: 'Xin chào! Tôi là ChatBot của IceStore. Bạn cần giúp gì?' }
]);

const scrollToBottom = async () => {
    await nextTick();
    if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
};

const toggleChat = () => {
    isOpen.value = !isOpen.value;
    if (isOpen.value) {
        scrollToBottom();
    }
};

const sendMessage = async () => {
    const text = userInput.value.trim();
    if (!text) return;

    messages.value.push({ sender: 'user', text });
    userInput.value = '';
    isLoading.value = true;
    scrollToBottom();

    try {
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/chat`, { message: text });
        const botReply = response.data.reply;
        messages.value.push({ sender: 'bot', text: botReply });
    } catch (error) {
        console.error('Lỗi khi gửi tin nhắn:', error);
        messages.value.push({ sender: 'bot', text: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.' });
    } finally {
        isLoading.value = false;
        scrollToBottom();
    }
}
</script>

<style scoped>
.chatbot-container {
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 9999;
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
}

.chatbot-toggle {
    background-color: #8b5cf6;
    color: white;
    border: none;
    border-radius: 50%;
    width: 60px;
    height: 60px;
    font-size: 24px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.3s;
}

.chatbot-toggle:hover {
    transform: scale(1.1);
}

.chatbot-window {
    position: absolute;
    bottom: 80px;
    left: 20px;
    width: 350px;
    height: 450px;
    background-color: white;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #e2e8f0;
}

/* Header */
.chatbot-header {
    background-color: #8b5cf6;
    color: white;
    padding: 15px;
    text-align: center;
    margin: 0;
}

/* Messages */
.chatbot-messages {
    flex: 1;
    padding: 15px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background-color: #f8fafc;
}

.chatbot-message {
    max-width: 80%;
    margin-bottom: 10px;
    padding: 10px 15px;
    border-radius: 20px;
    line-height: 1.4;
    font-size: 14px;
    word-wrap: break-word;
}

.user-message {
    background-color: #8b5cf6;
    color: white;
    align-self: flex-end;
    border-bottom-right-radius: 4px;
}

.bot-message {
    background-color: #e2e8f0;
    color: #333;
    align-self: flex-start;
    border-bottom-left-radius: 4px;
}

.typing-indicator {
    font-style: italic;
    color: #666;
}

/* Input */
.chatbot-input {
    display: flex;
    padding: 10px;
    border-top: 1px solid #e2e8f0;
    background-color: #f8fafc;
}

.chatbot-input input {
    flex: 1;
    padding: 10px;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    margin-right: 10px;
    font-size: 14px;
    outline: none;
}

.chatbot-input input:focus {
    border-color: #8b5cf6;
}

.chatbot-input button {
    background-color: #8b5cf6;
    color: white;
    border: none;
    border-radius: 20px;
    padding: 10px 20px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.3s;
}

.chatbot-input button:disabled {
    background-color: #a0aec0;
    cursor: not-allowed;
}
</style>