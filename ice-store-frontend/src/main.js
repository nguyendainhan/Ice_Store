import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import Vue3Toastify from 'vue3-toastify';
import 'vue3-toastify/dist/index.css';
import axios from 'axios';

// TRẠM KIỂM SOÁT AXIOS (TỰ ĐỘNG GẮN TOKEN)
axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

axios.interceptors.response.use((response) => {
    return response;
}, (error) => {
    if (error.response && error.response.status === 401) {
        localStorage.clear();
        window.location.href = '/login';
    }
    return Promise.reject(error);
});

const app = createApp(App);

app.use(Vue3Toastify, {
    autoClose: 3000, 
    position: 'top-right', 
});

app.use(router)
  .mount('#app')