// stores/user.js (hoặc tạo file reactive đơn giản)
import { ref } from "vue";

export const username = ref(localStorage.getItem("username") || "");
export const role = ref(localStorage.getItem("role") || "");