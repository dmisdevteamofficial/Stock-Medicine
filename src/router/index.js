import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import PatientsDashboard from '../views/PatientsDashboard.vue'
import RestockView from '../views/RestockView.vue'
import DispensingHistory from '../views/DispensingHistory.vue'
import { useAuthStore } from '../stores/authStore'
import MainLayout from '../components/layout/MainLayout.vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView
  },
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/patients-dashboard'
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: PatientsDashboard
      },
      {
        path: 'patients-dashboard',
        name: 'patients-dashboard',
        component: PatientsDashboard
      },
      {
        path: 'restock',
        name: 'restock',
        component: RestockView
      },
      {
        path: 'dispensing-history',
        name: 'dispensing-history',
        component: DispensingHistory
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const { isAuthenticated, restoreSession } = useAuthStore()
  restoreSession()
  const needsAuth = to.matched.some(record => record.meta.requiresAuth)
  if (needsAuth && !isAuthenticated.value) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (to.name === 'login' && isAuthenticated.value) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router
