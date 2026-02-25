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
    { path: '/admin/members', component: AdminMember, meta: { requiresSupervisor: true }},
    { path: '/register', component: Register },
    { path: '/cart', component: Cart }
  ]
})

router.beforeEach((to, from, next) => {
  const role = localStorage.getItem("role");
  const isSupervisor = localStorage.getItem("is_supervisor") === "1";

  // Các trang quản lý (products, customers, orders)
  if (to.meta.requiresAdmin) {
    if (role === "admin" || role === "staff") {
      return next();
    } else {
      alert("Bạn không có quyền truy cập trang này!");
      return next("/");
    }
  }

  // Trang quản lý nhân viên (chỉ supervisor)
  if (to.meta.requiresSupervisor) {
    if (role === "admin" && isSupervisor) {
      return next();
    } else {
      alert("Bạn không có quyền quản lý nhân viên!");
      return next("/admin/products");
    }
  }

  next();
});

export default router