// frontend/script/utils.js

const Utils = {
    API_BASE_URL: 'https://tutor-virtual.onrender.com/api', // AJUSTE CONFORME NECESSÁRIO (URL do seu backend)
    TOKEN_KEY: 'authToken',
    USER_DATA_KEY: 'userData',

    // --- Token ---
    saveToken: (token) => {
        localStorage.setItem(Utils.TOKEN_KEY, token);
    },
    getToken: () => {
        return localStorage.getItem(Utils.TOKEN_KEY);
    },
    removeToken: () => {
        localStorage.removeItem(Utils.TOKEN_KEY);
    },

    // --- User Data ---
    saveUserData: (userData) => {
        // Não salva a senha ou o token nos dados do usuário
        const { senha, token, ...dataToSave } = userData;
        localStorage.setItem(Utils.USER_DATA_KEY, JSON.stringify(dataToSave));
    },
    getUserData: () => {
        const data = localStorage.getItem(Utils.USER_DATA_KEY);
        return data ? JSON.parse(data) : null;
    },
    removeUserData: () => {
        localStorage.removeItem(Utils.USER_DATA_KEY);
    },

    // --- Auth State ---
    isLoggedIn: () => {
        return !!Utils.getToken(); // Retorna true se o token existe
    },
    logout: () => {
        Utils.removeToken();
        Utils.removeUserData();
        // Redireciona para a página de login após limpar os dados
        window.location.href = '../page/login.html'; // Ajuste o caminho se necessário
    },

    // --- UI Helpers ---
    showLoading: (loadingElementId = 'loading') => {
        const loading = document.getElementById(loadingElementId);
        if (loading) loading.classList.add('active');
    },
    hideLoading: (loadingElementId = 'loading') => {
        const loading = document.getElementById(loadingElementId);
        if (loading) loading.classList.remove('active');
    },

    /**
     * Exibe uma mensagem em uma área designada.
     * @param {string} message - A mensagem a ser exibida.
     * @param {'error'|'success'|'info'} type - O tipo de mensagem.
     * @param {string} elementId - O ID do elemento onde exibir a mensagem.
     */
    showMessage: (message, type = 'error', elementId = 'message-area') => {
        const messageArea = document.getElementById(elementId);
        if (messageArea) {
            messageArea.textContent = message;
            messageArea.className = 'message-area'; // Reseta classes
            if (type === 'error' || type === 'success') {
                messageArea.classList.add(type);
            }
             messageArea.style.display = 'block'; // Garante visibilidade
        } else {
            console.warn(`Elemento com ID "${elementId}" não encontrado para exibir mensagem.`);
            // Fallback para alert se a área não existir
            if (type === 'error') alert(`Erro: ${message}`);
            else alert(message);
        }
    },

     /**
     * Limpa a área de mensagem.
     * @param {string} elementId - O ID do elemento de mensagem a ser limpo.
     */
     clearMessage: (elementId = 'message-area') => {
        const messageArea = document.getElementById(elementId);
        if (messageArea) {
            messageArea.textContent = '';
            messageArea.className = 'message-area'; // Reseta classes
            messageArea.style.display = 'none'; // Esconde
        }
    },

    /**
     * Formata bytes em KB, MB, GB.
     * @param {number} bytes - O número de bytes.
     * @param {number} decimals - O número de casas decimais.
     * @returns {string} - O tamanho formatado.
     */
    formatBytes: (bytes, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    /**
    * Formata data para dd/mm/aaaa.
    * @param {string | Date} dateInput - A data (string ISO ou objeto Date).
    * @returns {string} - A data formatada.
    */
    formatDate: (dateInput) => {
        if (!dateInput) return '';
        try {
            const date = new Date(dateInput);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0'); // Meses são 0-indexados
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        } catch (e) {
            console.error("Erro ao formatar data:", e);
            return 'Data inválida';
        }
    }
};
