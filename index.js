const App = {
    data() {
        return {
            isDarkMode: localStorage.getItem('isDarkMode') == '1',
            config: config,
        };
    },
    mounted() {
        if (this.isDarkMode) document.body.classList.add('dark-mode');
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
