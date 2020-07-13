import Vue from 'vue';
import Vuex from 'vuex';
import message from './message'
import notOpen from './notOpen'

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
  },
  mutations: {
  },
  actions: {
  },
  modules: {
    message,
    notOpen,
  },
});
