document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // 1. INICIALIZAÇÃO E VERIFICAÇÕES
    // =========================================================================
    if (!Utils.isLoggedIn()) { console.warn("[Aluno] Não logado. Redirecionando..."); Utils.logout(); return; }
    const userData = Utils.getUserData();
    if (!userData || userData.tipo !== 'aluno') { console.error("[Aluno] Acesso negado."); Utils.logout(); return; }
    const userId = userData.id || userData._id;
    if (!userId) { console.error("[Aluno] ERRO CRÍTICO: ID do Aluno não encontrado."); Utils.logout(); return; }

    // =========================================================================
    // 2. SELETORES DE ELEMENTOS DOM
    // =========================================================================
    let elementsFound = true;
    const userNameSpan = document.getElementById('user-name');
    const logoutButton = document.getElementById('logout-button');
    const loadingIndicator = document.getElementById('loading');
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const chatContainer = document.getElementById('chat-container');
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const chatMessageArea = document.getElementById('chat-message-area');
    const manualsList = document.getElementById('manuals-list');
    const manualsLoadingDiv = document.getElementById('manuals-loading');
    const manualsMessageArea = document.getElementById('manuals-message-area');
    // Histórico
    const openHistoryBtn = document.getElementById('open-history-modal-btn');
    const historyModal = document.getElementById('history-modal');
    const closeHistoryModalBtn = document.getElementById('close-history-modal-btn');
    const historyResultsContainer = document.getElementById('history-results-container');
    const historyMessageArea = document.getElementById('history-message-area');
    const historyPrevBtn = document.getElementById('history-prev-btn');
    const historyNextBtn = document.getElementById('history-next-btn');
    const historyPageInfo = document.getElementById('history-page-info');
    // Feedback
    const openFeedbackBtn = document.getElementById('open-feedback-modal-btn');
    const feedbackModal = document.getElementById('feedback-modal');
    const feedbackForm = document.getElementById('feedback-form');
    const feedbackTextArea = document.getElementById('feedback-text');
    const feedbackMessageArea = document.getElementById('feedback-message-area');
    const submitFeedbackBtn = document.getElementById('submit-feedback-btn');
    const closeFeedbackModalBtnFeedback = feedbackModal?.querySelector('.modal-close-btn');

    // Verificação de elementos críticos
    if (!chatContainer || !chatForm || !messageInput || !sendButton || !manualsList || !historyModal || !historyResultsContainer || !feedbackModal || !feedbackForm ) {
        console.error("[Aluno] ERRO CRÍTICO: Elementos essenciais não encontrados!"); elementsFound = false;
        alert("Erro crítico interface. Verifique console."); try { Utils.showMessage("Erro crítico.", "error", "manuals-message-area"); } catch(e){} return;
    }

    // =========================================================================
    // 3. ESTADO DA APLICAÇÃO (Histórico)
    // =========================================================================
    let currentHistoryPage = 1;
    let totalHistoryPages = 1;

    // =========================================================================
    // 4. INICIALIZAÇÃO DE BIBLIOTECAS (Markdown)
    // =========================================================================
    const md = window.markdownit ? window.markdownit({ html: false, linkify: true, typographer: true }) : null; if (!md) console.warn("[Aluno] Markdown-it não carregado.");

    // =========================================================================
    // 5. INICIALIZAÇÃO DA UI
    // =========================================================================
    if (userNameSpan) userNameSpan.textContent = userData.nome || 'Aluno(a)'; document.body.classList.add('dashboard');

    // =========================================================================
    // 6. FUNÇÕES AUXILIARES DE UI
    // =========================================================================
    const showLoading = () => Utils.showLoading('loading'); const hideLoading = () => Utils.hideLoading('loading'); const clearChatError = () => Utils.clearMessage('chat-message-area'); const showChatError = (msg) => Utils.showMessage(msg, 'error', 'chat-message-area'); const clearManualsMessage = () => Utils.clearMessage('manuals-message-area'); const showManualsMessage = (msg, type = 'info') => Utils.showMessage(msg, type, 'manuals-message-area'); const clearFeedbackModalMsg = () => Utils.clearMessage('feedback-message-area'); const showFeedbackModalMsg = (msg, type = 'error') => Utils.showMessage(msg, type, 'feedback-message-area'); const clearHistoryModalMsg = () => Utils.clearMessage('history-message-area'); const showHistoryModalMsg = (msg, type = 'error') => Utils.showMessage(msg, type, 'history-message-area');

    // =========================================================================
    // 7. LÓGICA DO MENU MOBILE (SIDEBAR TOGGLE)
    // =========================================================================
    function setupMobileMenu() { if (!menuToggle || !sidebar) { console.warn("[Aluno] Impossível config menu mobile."); return; } menuToggle.addEventListener('click', (event) => { event.stopPropagation(); const isActive = sidebar.classList.toggle('active'); document.body.classList.toggle('sidebar-active', isActive); menuToggle.setAttribute('aria-expanded', isActive); }); document.addEventListener('click', (event) => { if (sidebar.classList.contains('active') && !sidebar.contains(event.target) && event.target !== menuToggle && !menuToggle.contains(event.target)) { sidebar.classList.remove('active'); document.body.classList.remove('sidebar-active'); menuToggle.setAttribute('aria-expanded', 'false'); } }); }

    // =========================================================================
    // 8. LÓGICA DO CHAT (Principal)
    // =========================================================================
    function scrollToBottom() { if (chatContainer) setTimeout(() => { chatContainer.scrollTop = chatContainer.scrollHeight; }, 50); }
    function addMessageToChatUI(sender, text, renderMarkdown = false) { if (!chatContainer) { console.error("[Aluno][ChatUI] ERRO FATAL: chatContainer é null!"); return null; } if (typeof text !== 'string') text = String(text); const messageDiv = document.createElement('div'); messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'tutor-message'); const contentDiv = document.createElement('div'); contentDiv.classList.add('message-content'); const timeDiv = document.createElement('div'); timeDiv.classList.add('message-time'); timeDiv.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); if (sender === 'tutor' && renderMarkdown && md) { try { contentDiv.innerHTML = md.render(text || ''); } catch (e) { console.error("[Aluno][ChatUI] Erro Markdown:", e); contentDiv.textContent = text || ''; } } else { contentDiv.textContent = text || ''; } messageDiv.appendChild(contentDiv); if (sender === 'tutor') { const feedbackDiv = document.createElement('div'); feedbackDiv.classList.add('feedback-icons'); feedbackDiv.innerHTML = `<button class="feedback-btn like" title="Gostei">👍</button><button class="feedback-btn dislike" title="Não gostei">👎</button>`; messageDiv.appendChild(feedbackDiv); } messageDiv.appendChild(timeDiv); try { chatContainer.appendChild(messageDiv); scrollToBottom(); return messageDiv; } catch (domError) { console.error("[Aluno][ChatUI] Erro DOM:", domError); return null; } }
    function typeTutorResponse(fullText, maxTotalTimeMs = 10000, minSpeedMsPerChar = 10, maxSpeedMsPerChar = 50) { if (!chatContainer) { console.error("[Aluno][Typing] ERRO FATAL: chatContainer é null!"); return; } if (typeof fullText !== 'string' || fullText.length === 0) { console.warn("[Aluno][Typing] Texto inválido:", fullText); addMessageToChatUI('tutor', '[Erro resposta.]'); return; } const textLength = fullText.length; const calculatedIdealSpeed = textLength > 0 ? (maxTotalTimeMs / textLength) : maxSpeedMsPerChar; const typingSpeedMs = Math.max(minSpeedMsPerChar, Math.min(calculatedIdealSpeed, maxSpeedMsPerChar)); const messageDiv = addMessageToChatUI('tutor', '', false); if (!messageDiv) { console.error("[Aluno][Typing] Falha criar div."); return; } const contentDiv = messageDiv.querySelector('.message-content'); const timeDiv = messageDiv.querySelector('.message-time'); const feedbackDiv = messageDiv.querySelector('.feedback-icons'); if(feedbackDiv) feedbackDiv.style.display = 'none'; if (!contentDiv || !timeDiv) { console.error("[Aluno][Typing] Erro estrutura interna."); messageDiv.remove(); return; } contentDiv.innerHTML = ''; let i = 0; const intervalId = setInterval(() => { if (i < textLength) { contentDiv.textContent += fullText[i]; i++; scrollToBottom(); } else { clearInterval(intervalId); timeDiv.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); if (md) { try { contentDiv.innerHTML = md.render(fullText); } catch (e) { console.error("[Aluno][Typing] Erro Markdown pós-digitação:", e); } } if(feedbackDiv) feedbackDiv.style.display = 'flex'; scrollToBottom(); } }, typingSpeedMs); }

    // =========================================================================
    // 9. LÓGICA DE GERENCIAMENTO DE MANUAIS
    // =========================================================================
    function renderManualsList(groupedManuals) { if (!manualsList) { console.error("[Aluno][Render] ERRO FATAL: #manuals-list é null!"); return; } manualsList.innerHTML = ''; const disciplines = Object.keys(groupedManuals).sort(); if (disciplines.length > 0) { disciplines.forEach((discipline, index) => { const headerLi = document.createElement('li'); headerLi.classList.add('discipline-header'); if (index === 0) headerLi.style.marginTop = "0"; headerLi.innerHTML = `<i class="fas fa-tag"></i> ${discipline || 'Sem Disciplina'}`; manualsList.appendChild(headerLi); const manualsInDiscipline = groupedManuals[discipline]; manualsInDiscipline.forEach((manual, manualIndex) => { if (!manual?.id || !manual?.title || String(manual.title).trim() === '') { console.warn(`[Aluno][Render] Item ID ${manual?.id || '??'} (${discipline}) PULADO: Título ausente/vazio.`); return; } const li = document.createElement('li'); li.classList.add('manual-item'); li.dataset.id = manual.id; li.dataset.filename = manual.originalName || manual.title || `manual_${manual.id}`; li.dataset.mimetype = manual.mimeType || 'application/octet-stream'; const professorName = manual.uploader?.nome || 'Professor Desconhecido'; li.innerHTML = `<h4 ... title="${manual.title}"> ${manual.title} </h4><span ...><i ...></i>Por: ${professorName}</span><p ...>${manual.description || 'Sem descrição.'}</p>${manual.disciplina ? `<span class="disciplina-tag">${manual.disciplina}</span>` : ''}<div class="manual-actions"><button class="btn-view-manual" ...><i ...></i> Ler </button><button class="btn-download-manual" ...><i ...></i> Baixar </button></div>`; const viewButton = li.querySelector('.btn-view-manual'); if (viewButton) viewButton.addEventListener('click', handleViewFile); const downloadButton = li.querySelector('.btn-download-manual'); if (downloadButton) downloadButton.addEventListener('click', handleDownloadFile); manualsList.appendChild(li); }); }); } else { manualsList.innerHTML = '<li ...>Nenhum manual disponível.</li>'; } }
    async function loadManuals() { if (!manualsList || !manualsLoadingDiv) { console.error("[Aluno][LoadMan] ERRO FATAL!"); return; } clearManualsMessage(); manualsLoadingDiv.style.display = 'block'; manualsList.innerHTML = ''; try { const allManuals = await Api.getFiles(); if (!Array.isArray(allManuals)) throw new Error("Resposta API inválida."); const groupedByDiscipline = allManuals.reduce((acc, manual) => { const disciplineKey = manual?.disciplina?.trim() || 'Sem Disciplina'; if (!acc[disciplineKey]) acc[disciplineKey] = []; acc[disciplineKey].push(manual); return acc; }, {}); renderManualsList(groupedByDiscipline); } catch (error) { console.error("[Aluno][LoadMan] Erro:", error); showManualsMessage(error.message || 'Falha carregar.', 'error'); renderManualsList({}); } finally { manualsLoadingDiv.style.display = 'none'; } }
    async function handleViewFile(event) { const fileItem = event.target.closest('.manual-item'); if (!fileItem) return; const fileId = fileItem.dataset.id; const mimeType = fileItem.dataset.mimetype; if (!fileId) { showManualsMessage('Erro: ID inválido.', 'error'); return; }; showLoading(); clearManualsMessage(); try { const blob = await Api.getFileBlob(fileId); if (!blob || blob.size === 0) throw new Error("Arquivo vazio."); if (blob.type.startsWith('application/pdf') || blob.type.startsWith('image/') || blob.type.startsWith('text/')) { const fileURL = URL.createObjectURL(blob); window.open(fileURL, '_blank'); } else { console.warn(`[Aluno][View] Tipo ${blob.type} não visualizável.`); handleDownloadFile(event); } } catch (error) { console.error("[Aluno][View] Erro:", error); showManualsMessage(error.message || 'Falha visualizar.', 'error'); } finally { hideLoading(); } }
    async function handleDownloadFile(event) { const fileItem = event.target.closest('.manual-item'); if (!fileItem) return; const fileId = fileItem.dataset.id; const filename = fileItem.dataset.filename; if (!fileId) { showManualsMessage('Erro: ID inválido.', 'error'); return; }; showLoading(); clearManualsMessage(); try { const blob = await Api.getFileBlob(fileId); if (!blob || blob.size === 0) throw new Error("Arquivo vazio."); const link = document.createElement('a'); const url = URL.createObjectURL(blob); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); } catch (error) { console.error("[Aluno][Download] Erro:", error); showManualsMessage(error.message || 'Falha baixar.', 'error'); } finally { hideLoading(); } }


    // =========================================================================
    // 10. LÓGICA DO HISTÓRICO DE CHAT (Modal)
    // =========================================================================
    function openHistoryModal() { if (!historyModal) return; historyModal.style.display = 'flex'; setTimeout(() => historyModal.classList.add('active'), 10); fetchAndDisplayHistory(1); }
    function closeHistoryModal() { if (!historyModal) return; historyModal.classList.remove('active'); setTimeout(() => { historyModal.style.display = 'none'; }, 300); }
    async function fetchAndDisplayHistory(page = 1) { if (!historyResultsContainer || !historyPrevBtn || !historyNextBtn || !historyPageInfo) { console.error("[Aluno][History] Elementos modal histórico ausentes."); return; }; clearHistoryModalMsg(); historyResultsContainer.innerHTML = '<p>Carregando...</p>'; historyPrevBtn.disabled = true; historyNextBtn.disabled = true; try { const params = { page, limit: 20 }; const data = await Api.getHistory(params); currentHistoryPage = data.currentPage || 1; totalHistoryPages = data.totalPages || 1; renderHistoryMessages(data.messages || []); updatePaginationControls(); } catch (error) { console.error("[Aluno][History] Erro:", error); showHistoryModalMsg(error.message || "Falha.", "error"); historyResultsContainer.innerHTML = '<p>Erro.</p>'; historyPageInfo.textContent = 'Erro'; } }
    function renderHistoryMessages(messages) { if (!historyResultsContainer) return; historyResultsContainer.innerHTML = ''; if (!messages || messages.length === 0) { historyResultsContainer.innerHTML = '<p>Nenhuma mensagem.</p>'; return; } messages.forEach(msg => { const messageDiv = document.createElement('div'); messageDiv.classList.add('message', msg.role === 'user' ? 'user-message' : 'tutor-message'); const contentDiv = document.createElement('div'); contentDiv.classList.add('message-content'); const timeDiv = document.createElement('div'); timeDiv.classList.add('message-time'); timeDiv.textContent = new Date(msg.createdAt).toLocaleString(); if (msg.role === 'model' && md) { try { contentDiv.innerHTML = md.render(msg.content || ''); } catch (e) { contentDiv.textContent = msg.content || ''; } } else { contentDiv.textContent = msg.content || ''; } messageDiv.appendChild(contentDiv); messageDiv.appendChild(timeDiv); historyResultsContainer.appendChild(messageDiv); }); historyResultsContainer.scrollTop = 0; }
    function updatePaginationControls() { if (!historyPrevBtn || !historyNextBtn || !historyPageInfo) return; historyPrevBtn.disabled = (currentHistoryPage <= 1); historyNextBtn.disabled = (currentHistoryPage >= totalHistoryPages); historyPageInfo.textContent = `Página ${currentHistoryPage} de ${totalHistoryPages}`; }

    // =========================================================================
    // 11. LÓGICA DO FEEDBACK TEXTUAL (Modal)
    // =========================================================================
    function openFeedbackModal() { if (!feedbackModal) return; clearFeedbackModalMsg(); if (feedbackTextArea) feedbackTextArea.value = ''; if (submitFeedbackBtn) submitFeedbackBtn.disabled = false; feedbackModal.style.display = 'flex'; setTimeout(() => feedbackModal.classList.add('active'), 10); if (feedbackTextArea) feedbackTextArea.focus(); }
    function closeFeedbackModalFunction() { if (!feedbackModal) return; feedbackModal.classList.remove('active'); setTimeout(() => { feedbackModal.style.display = 'none'; if(feedbackForm) feedbackForm.reset(); clearFeedbackModalMsg(); }, 300); }

    // =========================================================================
    // 12. EVENT LISTENERS PRINCIPAIS
    // =========================================================================
    // console.log("[Aluno] Adicionando event listeners...");

    // Listener Chat Submit
    if (chatForm) { chatForm.addEventListener('submit', async (e) => { e.preventDefault(); clearChatError(); const messageText = messageInput.value.trim(); if (!messageText) return; messageInput.disabled = true; sendButton.disabled = true; sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; addMessageToChatUI('user', messageText); messageInput.value = ''; scrollToBottom(); try { const data = await Api.sendMessage(messageText); if (data?.reply?.trim()) { typeTutorResponse(data.reply); } else { console.warn(`[Aluno][ChatSubmit] Resposta inválida:`, data); addMessageToChatUI('tutor', '[Resposta inválida.]'); } } catch (error) { console.error(`[Aluno][ChatSubmit] Erro:`, error); showChatError(error.message || 'Erro.'); addMessageToChatUI('tutor', `Erro: ${error.message || 'Falha.'}`); } finally { messageInput.disabled = false; sendButton.disabled = false; sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>'; messageInput.focus(); } }); }
    else { console.error("[Aluno] ERRO FATAL: chatForm não encontrado!"); }

    // Listener Logout
    if (logoutButton) { logoutButton.addEventListener('click', () => { if(confirm('Tem certeza?')) Utils.logout(); }); }
    else { console.error("[Aluno] ERRO FATAL: logoutButton não encontrado!"); }

    // Listener Feedback Visual no Chat
    if (chatContainer) { chatContainer.addEventListener('click', (event) => { const button = event.target.closest('.feedback-btn'); if (!button) return; const messageDiv = button.closest('.message.tutor-message'); if (!messageDiv) return; const msg = messageDiv.querySelector('.message-content')?.textContent || ''; const type = button.classList.contains('like') ? 'Like' : 'Dislike'; button.closest('.feedback-icons').querySelectorAll('.feedback-btn').forEach(btn => btn.disabled = true); button.style.opacity = '1'; button.style.transform = 'scale(1.1)'; /* TODO: Enviar feedback */ }); }

    // Listeners Histórico
    if (openHistoryBtn) { openHistoryBtn.addEventListener('click', openHistoryModal); } else console.warn("[Aluno] Botão histórico não encontrado.");
    if (closeHistoryModalBtn) { closeHistoryModalBtn.addEventListener('click', closeHistoryModal); }
    if (historyModal) { historyModal.addEventListener('click', (event) => { if (event.target === historyModal) closeHistoryModal(); }); }
    if (historyPrevBtn) { historyPrevBtn.addEventListener('click', () => { if (!historyPrevBtn.disabled) fetchAndDisplayHistory(currentHistoryPage - 1); }); }
    if (historyNextBtn) { historyNextBtn.addEventListener('click', () => { if (!historyNextBtn.disabled) fetchAndDisplayHistory(currentHistoryPage + 1); }); }

    // Listeners Feedback Modal
    if (openFeedbackBtn) { openFeedbackBtn.addEventListener('click', openFeedbackModal); } else console.warn("[Aluno] Botão feedback não encontrado.");
    if (closeFeedbackModalBtnFeedback) { closeFeedbackModalBtnFeedback.addEventListener('click', closeFeedbackModalFunction); }
    if (feedbackModal) { feedbackModal.addEventListener('click', (event) => { if (event.target === feedbackModal) closeFeedbackModalFunction(); }); }
    if (feedbackForm) { feedbackForm.addEventListener('submit', async (e) => { e.preventDefault(); clearFeedbackModalMsg(); const message = feedbackTextArea.value.trim(); if (!message) { showFeedbackModalMsg("Escreva sua mensagem.", "error"); feedbackTextArea.focus(); return; } submitFeedbackBtn.disabled = true; submitFeedbackBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...'; showLoading(); try { await Api.sendFeedback(message); showFeedbackModalMsg("Feedback enviado! Obrigado.", "success"); feedbackTextArea.value = ''; setTimeout(closeFeedbackModalFunction, 1500); } catch (error) { console.error("[Aluno][Feedback Submit] Erro:", error); showFeedbackModalMsg(error.message || "Falha enviar.", "error"); submitFeedbackBtn.disabled = false; submitFeedbackBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Mensagem'; } finally { hideLoading(); } }); }
    else { console.warn("[Aluno] Formulário feedback não encontrado."); }

    // =========================================================================
    // 13. AÇÕES INICIAIS AO CARREGAR A PÁGINA
    // =========================================================================
    // console.log("[Aluno] Executando ações iniciais...");
    // Não carrega histórico aqui, apenas msg inicial
    if(chatContainer) addMessageToChatUI('tutor', 'Olá! Faça sua pergunta ou consulte os manuais. Use o botão "Histórico" na barra lateral.');
    loadManuals(); setupMobileMenu(); scrollToBottom();
    // console.log("[Aluno] Página pronta.");

}); // Fim do DOMContentLoaded