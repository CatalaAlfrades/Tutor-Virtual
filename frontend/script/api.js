// Este objeto Utils deve existir em outro arquivo, como utils.js
// Certifique-se de que ele exporta API_BASE_URL, getToken, logout, isAdmin, etc.
// Ex: const Utils = { API_BASE_URL: 'http://localhost:5000/api', ... };

const Api = {

    // Função _request (robusta, com tratamento de erros e auth)
    // frontend/script/api.js

_request: async (endpoint, method = 'GET', body = null, requiresAuth = false, isFormData = false) => {
    const url = `${Utils.API_BASE_URL}${endpoint}`;
    const options = { method: method, headers: {} };
    
    // --- ALTERAÇÃO AQUI ---
    // Adiciona uma exceção para a rota de login de admin.
    const isTryingAdminLogin = endpoint === '/admin/login';

    // Verificação de acesso para rotas /admin/
    // Só executa a verificação se o endpoint for de admin E NÃO FOR a tentativa de login.
    if (endpoint.includes('/admin/') && !isTryingAdminLogin && !Utils.isAdmin()) {
        throw new Error('Acesso não autorizado para esta operação.');
    }
    // --- FIM DA ALTERAÇÃO ---

    if (body) { 
        if (isFormData) { 
            options.body = body; 
        } else { 
            options.headers['Content-Type'] = 'application/json'; 
            options.body = JSON.stringify(body); 
        } 
    }

    if (requiresAuth) { 
        const token = Utils.getToken(); 
        if (!token) { 
            console.error('Token não encontrado:', endpoint); 
            Utils.logout(); 
            throw new Error('Autenticação necessária. Faça login novamente.'); 
        } 
        options.headers['Authorization'] = `Bearer ${token}`; 
    }

    try {
        const response = await fetch(url, options);
        // O tratamento de erro para 401/403 aqui é para rotas PROTEGIDAS.
        // Não deveria afetar a rota de login pública, mas vamos melhorá-lo.
        if ((response.status === 401 || response.status === 403) && requiresAuth) { 
            console.warn(`[API] Erro Autorização (${response.status}) em ${method} ${url}.`); 
            Utils.logout(); 
            throw new Error('Sessão expirada ou inválida. Faça login novamente.'); 
        }

        if (response.status === 204) { 
            return { success: true }; 
        }

        let responseData; 
        const contentType = response.headers.get("content-type"); 
        const responseText = await response.text();
        
        if (contentType?.includes("application/json") && responseText) { 
            try { 
                responseData = JSON.parse(responseText); 
            } catch (e) { 
                console.error("[API] Erro parse JSON:", e, "Texto:", responseText); 
                throw new Error(`Erro ${response.status}: Resposta inválida (JSON).`); 
            } 
        } else { 
            responseData = { responseText: responseText }; 
        }
        
        if (!response.ok) { 
            // Para a rota de login, a mensagem de erro do backend (ex: "Credenciais inválidas")
            // será capturada aqui e lançada, o que é o comportamento correto.
            const errorMessage = responseData?.message || responseData?.error || responseData?.responseText || `Erro ${response.status}`; 
            console.error(`[API] Erro ${response.status} em ${method} ${url}:`, errorMessage, responseData); 
            throw new Error(errorMessage); 
        }
        return responseData;
    } catch (error) { 
        console.error(`[API] Falha req ${method} ${url}:`, error); 
        if (error instanceof Error && (error.message.includes('Autenticação') || error.message.includes('Sessão expirada'))) { 
            throw error; 
        } 
        if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) { 
            throw new Error('Erro de conexão: Não foi possível conectar ao servidor.'); 
        } 
        throw error instanceof Error ? error : new Error('Erro desconhecido API.'); 
    }
},

    // ===================================
    // Endpoints de Autenticação
    // ===================================
    login: async (email, senha) => Api._request('/auth/login', 'POST', { email, senha }),
    
    // REMOVA A FUNÇÃO loginAdmin daqui
    // loginAdmin: async (email, senha) => Api._request('/admin/login', 'POST', { email, senha }),
    
    register: async (userData) => Api._request('/auth/register', 'POST', userData),
    getMe: async () => Api._request('/auth/me', 'GET', null, true),
    
    // ===================================
    // Endpoints Administrativos
    // ===================================
    createProfessor: async (data) => Api._request('/admin/professores', 'POST', data, true),
    getProfessorById: async (id) => {
        if (!id) throw new Error("ID do professor não fornecido.");
        return Api._request(`/admin/professores/${id}`, 'GET', null, true);
    },
    getProfessores: async () => Api._request('/admin/professores', 'GET', null, true),
    updateProfessor: async (id, data) => Api._request(`/admin/professores/${id}`, 'PUT', data, true),
    deleteProfessor: async (id) => Api._request(`/admin/professores/${id}`, 'DELETE', null, true),

    // ===================================
    // Endpoints do Chat
    // ===================================
    sendMessage: async (message) => Api._request('/chat', 'POST', { message }, true),
    getHistory: async (params = { page: 1, limit: 20 }) => {
        const queryParams = new URLSearchParams();
        Object.keys(params).forEach(key => { if (params[key]) queryParams.append(key, params[key]); });
        const queryString = queryParams.toString();
        console.log(`[API] getHistory chamando GET /chat/history${queryString ? `?${queryString}` : ''}`);
        return Api._request(`/chat/history${queryString ? `?${queryString}` : ''}`, 'GET', null, true);
    },

    // ===================================
    // Endpoints de Arquivos (Files)
    // ===================================
    uploadFile: async (formData) => Api._request('/files/upload', 'POST', formData, true, true), 
    getFiles: async () => Api._request('/files', 'GET', null, true),
    deleteFile: async (metaId) => Api._request(`/files/${metaId}`, 'DELETE', null, true), 
    updateFileMetadata: async (metaId, metadata) => {
        console.log(`[API] updateFileMetadata chamando PATCH /files/meta/${metaId}`, metadata); 
        return Api._request(`/files/meta/${metaId}`, 'PATCH', metadata, true);
    },
    getFileMetaById: async (metaId) => Api._request(`/files/meta/${metaId}`, 'GET', null, true),
    getFileBlob: async (metaId) => {
        const endpoint = `/files/download/${metaId}`; 
        const url = `${Utils.API_BASE_URL}${endpoint}`; 
        const options = { method: 'GET', headers: {} }; 
        const token = Utils.getToken(); 
        
        if (!token) { Utils.logout(); throw new Error('Autenticação necessária.'); } 
        
        options.headers['Authorization'] = `Bearer ${token}`;
        
        try { 
            const response = await fetch(url, options); 
            
            if (response.status === 401 || response.status === 403) { 
                Utils.logout(); 
                throw new Error('Sessão expirada ou permissão negada.'); 
            } 
            if (response.status === 404) { throw new Error('Arquivo não encontrado.'); } 
            
            if (!response.ok) { 
                let errorData; 
                let errorMessage; 
                try { 
                    errorData = await response.json(); 
                    errorMessage = errorData?.message || errorData?.error || `Erro ${response.status}`; 
                } catch (e) { 
                    errorMessage = await response.text() || `Erro ${response.status}`; 
                } 
                console.error(`[API] Erro ${response.status} Blob:`, errorMessage, errorData); 
                throw new Error(errorMessage); 
            } 
            
            const blob = await response.blob(); 
            if (blob.size === 0) console.warn("[API] Blob vazio recebido."); 
            
            return blob; 
        } catch (error) { 
            console.error(`[API] Falha req Blob ${url}:`, error); 
            if (error instanceof Error && (error.message.includes('Autenticação') || error.message.includes('Sessão expirada'))) { 
                throw error; 
            } 
            if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) { 
                throw new Error('Erro de conexão ao buscar arquivo.'); 
            } 
            throw error instanceof Error ? error : new Error('Erro desconhecido ao buscar arquivo.'); 
        }
    },
    
    // ===================================
    // Endpoints de Feedback
    // ===================================
    sendFeedback: async (message) => {
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return Promise.reject(new Error("A mensagem de feedback não pode estar vazia."));
        }
        console.log("[API] Enviando Feedback:", message.substring(0, 100) + "...");
        return Api._request('/feedback', 'POST', { message }, true);
    },
};