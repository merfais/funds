import Vue from 'vue';
import VueRouter from 'vue-router';

Vue.use(VueRouter);

const routes = [
  // {
  //   path: '/',
  //   name: 'Home',
  //   component: () => import(/* webpackChunkName "Home" */ 'views/Home')
  // },
  {
    path: '/home',
    name: 'Home',
    component: () => import(/* webpackChunkName "Home" */ 'views/Home')
  },
  {
    path: '/notOpen',
    name: 'NotOpen',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "notOpen" */ 'views/notOpen'),
  },
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
});

export default router;
