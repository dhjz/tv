const App = {
    data() {
        return {
            isDarkMode: localStorage.getItem('isDarkMode') == '1',
            config: config,
        };
    },
    mounted() {
        if (this.isDarkMode) document.body.classList.add('dark-mode');
        setTimeout(() => {
            document.querySelector('#' + atob('ZWRnZW9uZS' + '' + '13YXRlcm1hcms=')).remove()
        }, 1000)
    },
    methods: {
        toggleDarkMode() {
            this.isDarkMode = !this.isDarkMode;
            document.body.classList.toggle('dark-mode', this.isDarkMode)
            localStorage.setItem('isDarkMode', this.isDarkMode ? 1 : 0);
        },
    },
};

Vue.createApp(App).mount('#app');
