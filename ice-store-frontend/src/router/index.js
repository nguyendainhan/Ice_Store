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

router.beforeEach((to, from, next) => {
    // Lấy thông tin quyền từ localStorage (lúc đăng nhập đã lưu)
    const role = localStorage.getItem('role');
    const isSuper = localStorage.getItem('is_supervisor') === '1';

    // Nếu cố tình vào khu vực Admin
    if (to.path.startsWith('/admin')) {
        
        // 1. Khách vãng lai hoặc Customer -> Đá ra trang login
        if (!role || role === 'customer') {
            return next('/login');
        }

        // 2. Phân quyền Staff (Chỉ được vào trang Quản lý đơn hàng)
        if (role === 'staff') {
            if (to.path !== '/admin/orders') {
                alert("🔒 Lỗi quyền: Nhân viên (Staff) chỉ được phép truy cập Quản lý đơn hàng!");
                return next('/admin/orders'); // Ép quay lại trang đơn hàng
            }
        }

        // 3. Phân quyền Admin thường (Không được vào trang Members)
        if (role === 'admin' && !isSuper) {
            if (to.path === '/admin/members') {
                alert("🔒 Lỗi quyền: Chỉ Super Admin mới được quản lý nhân sự!");
                return next('/admin/products'); // Ép quay lại trang sản phẩm
            }
        }
    }
    
    // Nếu pass hết các vòng kiểm tra trên thì cho phép đi tiếp
    next();
});

export default router