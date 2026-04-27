import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import About from '../views/About.vue'
import Members from '../views/Members.vue'
import Rules from '../views/Rules.vue'
import Shop from '../views/Shop.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Cart from '../views/Cart.vue'
import Orders from '../views/Orders.vue'
import AdminProducts from "../admins/AdminProducts.vue"
import AdminCustoms from "../admins/AdminCustoms.vue"
import AdminOrder from "../admins/AdminOrder.vue";
import AdminMember from "../admins/AdminMember.vue";
import DashBoard from '../admins/DashBoard.vue';
import Profile from '../views/Profile.vue';
import ChangePassword from '../views/ChangePassword.vue';
import AdminRecycleBin from '../admins/AdminRecycleBin.vue';
import ForgotPassword from '../views/ForgotPassword.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
    { path: '/members', component: Members },
    { path: '/rules', component: Rules },
    { path: '/shop', component: Shop },
    { path: '/login', component: Login },
    { path: '/orders', component: Orders },
    { path: '/admin/products', component: AdminProducts, meta: { requiresAdmin: true } },
    { path: '/admin/customers', component: AdminCustoms, meta: { requiresAdmin: true } },
    { path: '/admin/orders', component: AdminOrder, meta: { requiresAdmin: true } },
    { path: '/admin/recycle-bin', component: AdminRecycleBin, meta: { requiresAdmin: true } },
    { path: '/admin/members', component: AdminMember, meta: { requiresSupervisor: true }},
    { path: '/admin/dashboard', component: DashBoard, meta: { requiresAdmin: true }},
    { path: '/register', component: Register },
    { path: '/cart', component: Cart },
    { path: '/profile', component: Profile },
    { path: '/change-password', component: ChangePassword },
    { path: '/forgot-password', component: ForgotPassword }
  ]
})

router.beforeEach((to, from) => {
  const role = localStorage.getItem("role");
  const isSupervisor = localStorage.getItem("is_supervisor") === "1";

  // Các trang quản lý (products, customers, orders, dashboard)
  if (to.meta.requiresAdmin) {
    if (role === "admin" || role === "staff") {
      return true; // Thay cho next() - Cho phép truy cập
    } else {
      alert("Bạn không có quyền truy cập trang này!");
      return "/"; // Thay cho next("/") - Đẩy về trang chủ
    }
  }

  // Trang quản lý nhân viên (chỉ supervisor)
  if (to.meta.requiresSupervisor) {
    if (role === "admin" && isSupervisor) {
      return true; // Thay cho next()
    } else {
      alert("Bạn không có quyền quản lý nhân viên!");
      return "/admin/products"; // Thay cho next("/admin/products")
    }
  }

  // Mặc định cho phép các route không yêu cầu quyền đi tiếp
  return true; // Thay cho next() ở cuối file
});

// === (NAVIGATION GUARD) ===
router.beforeEach((to, from, next) => {
    // 1. Lấy vai trò (role) từ localStorage
    const role = localStorage.getItem("role");
    const isAuthenticated = !!localStorage.getItem("token");

    // 2. Nếu là ADMIN
    if (role === 'admin') {
        // Nếu admin cố tình (hoặc vô tình do mở lại tab) vào trang chủ '/', '/orders', '/cart' của khách
        // -> Bắt cổ lôi thẳng về trang '/admin/dashboard'
        if (to.path === '/' || to.path === '/orders' || to.path === '/cart') {
            return next('/admin/dashboard');
        }
        
        // Nếu admin muốn vào các trang nội bộ admin khác -> Cho qua bình thường
        return next();
    }

    // 3. Nếu KHÁCH HÀNG (Customer)
    if (role === 'customer') {
        // Chặn khách hàng táy máy gõ URL truy cập vào các trang có chữ /admin/...
        if (to.path.startsWith('/admin')) {
            alert("Bạn không có quyền truy cập trang này!");
            return next('/'); // Đẩy về trang chủ
        }
    }

    // 4. Nếu CHƯA ĐĂNG NHẬP (Chưa có token)
    if (!isAuthenticated) {
        // Nếu cố tình vào các trang yêu cầu đăng nhập (giỏ hàng, thanh toán, admin...)
        if (to.path === '/cart' || to.path === '/orders' || to.path.startsWith('/admin')) {
            return next('/login'); // Ép đi đăng nhập
        }
    }

    // 5. Nếu không vi phạm luật nào ở trên -> Cho đi tiếp bình thường
    next();
});
export default router