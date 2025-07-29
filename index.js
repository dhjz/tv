var app = Vue.createApp({
  data() {
    return {
      allSites: appData.sites,
      theme: localStorage.getItem('user-theme') || 'light',
      currentFontSize: appData.fontSizes['常规'],
    };
  },
  mounted() {
    document.body.classList.toggle('dark-mode', this.theme === 'dark');
    setTimeout(() => {
      document.querySelector('#' + atob('ZWRnZW9uZS' + '' + '13YXRlcm1hcms='))?.remove()
    }, 1000)
  },
  methods: {
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('user-theme', this.theme);
      document.body.classList.toggle('dark-mode', this.theme === 'dark');
    }
  },
});

app.mount('#app');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(e => console.log('[SW-TV] Service Worker success:', e))
      .catch(e => console.log('[SW-TV] Service Worker failed:', e));
  });
}