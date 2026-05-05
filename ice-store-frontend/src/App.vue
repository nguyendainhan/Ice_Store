<template>
  <AdminNavbar v-if="isAdminRoute" />
  <CustomerNavbar v-else-if="isLoggedIn" />
  <Navbar v-else />
  <main class="content">
    <router-view />
  </main>
  <LiveChat />
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import Navbar from "./components/Navbar.vue";
import CustomerNavbar from "./components/CustomerNavbar.vue";
import AdminNavbar from "./components/AdminNavbar.vue";
import { username as userNameState } from "./stores/user.js";
import { toast } from "vue3-toastify";
import { io } from "socket.io-client";
import LiveChat from "./views/LiveChat.vue";

const route = useRoute();

const isAdminRoute = computed(() => {
  return route.path.startsWith("/admin");
});

const isLoggedIn = computed(() => {
  return userNameState.value && !route.path.startsWith("/admin");
});

onMounted(() => {
  const userRole = localStorage.getItem("role");

  if (userRole === 'admin' || userRole === 'staff') {
    const socket = io(import.meta.env.VITE_API_URL);

    socket.on("new_order_alert", (data) => {
      try {
        const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
        audio.play();
      } catch (error) {
        console.log("Trình duyệt chặn âm thanh");
      }

      toast.info(`🚨 CÓ ĐƠN HÀNG MỚI!\nĐơn #${data.orderId} - Trị giá: ${Number(data.total).toLocaleString('vi-VN')} VND`, {
        autoClose: 10000,
        position: "top-right",
        icon: "🛒"
      });
    });
  }
});
</script>

<style scoped>
.content {
  margin-top: 80px;
}
</style>