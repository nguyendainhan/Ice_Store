<template>
  <AdminNavbar v-if="isAdminRoute" />
  <CustomerNavbar v-else-if="isLoggedIn" />
  <Navbar v-else />
  <main class="content">
    <router-view />
  </main>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import Navbar from "./components/Navbar.vue";
import CustomerNavbar from "./components/CustomerNavbar.vue";
import AdminNavbar from "./components/AdminNavbar.vue";
import { username as userNameState, role as roleState } from "./stores/user.js";

const route = useRoute();

const isAdminRoute = computed(() => {
  return route.path.startsWith("/admin");
});

const isLoggedIn = computed(() => {
  return userNameState.value && !route.path.startsWith("/admin");
});
</script>

<style scoped>
.content {
  margin-top: 80px;
}
</style>