const Api = {

    // Função _request (robusta, com tratamento de erros e auth)
    _request: async (endpoint, method = 'GET', body = null, requiresAuth = false, isFormData = false) => {
        const url = `${Utils.API_BASE_URL}${endpoint}`;
        const options = { method: method, headers: {} };
        if (endpoint.includes('/admin/') && !Utils.isAdmin()) {
            throw new Error('Acesso não autorizado');
        }
        if (body) { if (isFormData) { options.body = body; } else { options.headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(body); } }
        if (requiresAuth) { const token = Utils.getToken(); if (!token) { console.error('Token não encontrado:', endpoint); Utils.logout(); throw new Error('Autenticação necessária. Faça login novamente.'); } options.headers['Authorization'] = `Bearer ${token}`; }
        try {
            const response = await fetch(url, options);
            if (response.status === 401 || response.status === 403) { console.warn(`[API] Erro Autorização (${response.status}) em ${method} ${url}.`); Utils.logout(); throw new Error('Sessão expirada ou inválida. Faça login novamente.'); }
            if (response.status === 204) { return { success: true }; }
            let responseData; const contentType = response.headers.get("content-type"); const responseText = await response.text();
            if (contentType?.includes("application/json") && responseText) { try { responseData = JSON.parse(responseText); } catch (e) { console.error("[API] Erro parse JSON:", e, "Texto:", responseText); throw new Error(`Erro ${response.status}: Resposta inválida (JSON).`); } }
            else { responseData = { responseText: responseText }; }
            if (!response.ok) { const errorMessage = responseData?.message || responseData?.error || responseData?.responseText || `Erro ${response.status}`; console.error(`[API] Erro ${response.status} em ${method} ${url}:`, errorMessage, responseData); throw new Error(errorMessage); }
            return responseData;
        } catch (error) { console.error(`[API] Falha req ${method} ${url}:`, error); if (error instanceof Error && (error.message.includes('Autenticação') || error.message.includes('Sessão expirada') || error.message.includes('Resposta inválida'))) { throw error; } if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) { throw new Error('Erro de conexão: Não foi possível conectar ao servidor.'); } throw error instanceof Error ? error : new Error('Erro desconhecido API.'); }
    },

    // Auth
    login: async (email, senha) => Api._request('/auth/login', 'POST', { email, senha }),
    register: async (userData) => Api._request('/auth/register', 'POST', userData),
    getMe: async () => Api._request('/auth/me', 'GET', null, true),

    // Chat
    sendMessage: async (message) => Api._request('/chat', 'POST', { message }, true),

    // --- Files ---
    uploadFile: async (formData) => Api._request('/files/upload', 'POST', formData, true, true), 
    getFiles: async () => Api._request('/files', 'GET', null, true),
    deleteFile: async (metaId) => Api._request(`/files/${metaId}`, 'DELETE', null, true), 

    // *** CORREÇÃO DA ROTA AQUI ***
    updateFileMetadata: async (metaId, metadata) => {
        console.log(`[API] updateFileMetadata chamando PATCH /files/meta/${metaId}`, metadata); 
        // Chama a rota correta definida no backend (fileRoutes.js)
        return Api._request(`/files/meta/${metaId}`, 'PATCH', metadata, true);
    },
    // *****************************

    getFileMetaById: async (metaId) => Api._request(`/files/meta/${metaId}`, 'GET', null, true), // Obter meta de um arquivo

     // *** FUNÇÃO PARA BUSCAR HISTÓRICO ***
    getHistory: async (params = { page: 1, limit: 20 }) => { // Padrão busca 20 últimas
        const queryParams = new URLSearchParams();
        Object.keys(params).forEach(key => { if (params[key]) queryParams.append(key, params[key]); });
        const queryString = queryParams.toString();
        console.log(`[API] getHistory chamando GET /chat/history${queryString ? `?${queryString}` : ''}`);
        return Api._request(`/chat/history${queryString ? `?${queryString}` : ''}`, 'GET', null, true);
    },
    // Obter conteúdo do arquivo como Blob (para view/download)
    getFileBlob: async (metaId) => {
        const endpoint = `/files/download/${metaId}`; const url = `${Utils.API_BASE_URL}${endpoint}`; const options = { method: 'GET', headers: {} }; const token = Utils.getToken(); if (!token) { Utils.logout(); throw new Error('Autenticação necessária.'); } options.headers['Authorization'] = `Bearer ${token}`;
        /* console.log(`[API] Request Blob: GET ${url}`); */ try { const response = await fetch(url, options); /* console.log(`[API] Response Blob Status: ${response.status}`); */ if (response.status === 401 || response.status === 403) { Utils.logout(); throw new Error('Sessão expirada ou permissão negada.'); } if (response.status === 404) { throw new Error('Arquivo não encontrado.'); } if (!response.ok) { let errorData; let errorMessage; try { errorData = await response.json(); errorMessage = errorData?.message || errorData?.error || `Erro ${response.status}`; } catch (e) { errorMessage = await response.text() || `Erro ${response.status}`; } console.error(`[API] Erro ${response.status} Blob:`, errorMessage, errorData); throw new Error(errorMessage); } const blob = await response.blob(); /* console.log(`[API] Response Blob: ${blob.size}b, ${blob.type}`); */ if (blob.size === 0) console.warn("[API] Blob vazio recebido."); return blob; } catch (error) { console.error(`[API] Falha req Blob ${url}:`, error); if (error instanceof Error && (error.message.includes('Autenticação') || error.message.includes('Sessão expirada'))) { throw error; } if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) { throw new Error('Erro de conexão ao buscar arquivo.'); } throw error instanceof Error ? error : new Error('Erro desconhecido ao buscar arquivo.'); }
    },
    // *** NOVA FUNÇÃO PARA ENVIAR FEEDBACK ***
    sendFeedback: async (message) => {
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return Promise.reject(new Error("A mensagem de feedback não pode estar vazia."));
        }
        console.log("[API] Enviando Feedback:", message.substring(0, 100) + "...");
        // Assumindo endpoint POST /api/feedback, protegido por autenticação
        return Api._request('/feedback', 'POST', { message }, true);
    },
};