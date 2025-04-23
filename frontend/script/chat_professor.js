document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // 1. INICIALIZAÇÃO E VERIFICAÇÕES
    // =========================================================================
    if (!Utils.isLoggedIn()) { console.warn("[Prof] Não logado. Redirecionando..."); Utils.logout(); return; }
    const userData = Utils.getUserData();
    if (!userData || userData.tipo !== 'professor') { console.error("[Prof] Acesso negado."); Utils.logout(); return; }
    const userId = userData.id || userData._id; // Garante que temos o ID
    if (!userId) { console.error("[Prof] ERRO CRÍTICO: ID do Professor não encontrado."); Utils.logout(); return; }

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
    const selectFileForm = document.getElementById('select-file-form');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name-display');
    const filesList = document.getElementById('files-list');
    const uploadMessageArea = document.getElementById('upload-message-area');
    const filesMessageArea = document.getElementById('files-message-area');
    const filesLoadingDiv = document.getElementById('files-loading');
    const metadataModal = document.getElementById('metadata-modal');
    const metadataForm = document.getElementById('metadata-form');
    const modalFilenamePreview = document.getElementById('modal-filename-preview');
    const modalTitleInput = document.getElementById('modal-title');
    const modalDescriptionInput = document.getElementById('modal-description');
    const modalDisciplineInput = document.getElementById('modal-disciplina');
    const modalMessageArea = document.getElementById('modal-message-area');
    const confirmUploadButton = document.getElementById('confirm-upload-button');
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
    if (!chatContainer || !chatForm || !messageInput || !sendButton || !filesList || !metadataModal || !modalTitleInput || !modalDescriptionInput || !confirmUploadButton || !fileInput || !logoutButton || !historyModal || !feedbackModal || !openHistoryBtn || !openFeedbackBtn) {
        console.error("[Prof] ERRO CRÍTICO: Elementos essenciais não encontrados!"); elementsFound = false;
        alert("Erro crítico interface. Verifique console."); try { Utils.showMessage("Erro crítico.", "error", "files-message-area"); } catch(e){} return;
    }
    if (!modalDisciplineInput) console.warn("[Prof] Input #modal-disciplina não encontrado.");

    // =========================================================================
    // 3. ESTADO DA APLICAÇÃO
    // =========================================================================
    let selectedFileObject = null; let currentEditingMetaId = null;
    let currentHistoryPage = 1; let totalHistoryPages = 1; // Estado do histórico

    // =========================================================================
    // 4. INICIALIZAÇÃO DE BIBLIOTECAS (Markdown)
    // =========================================================================
    const md = window.markdownit ? window.markdownit({ html: false, linkify: true, typographer: true }) : null; if (!md) console.warn("[Prof] Markdown-it não carregado.");

    // =========================================================================
    // 5. INICIALIZAÇÃO DA UI
    // =========================================================================
    if (userNameSpan) userNameSpan.textContent = userData.nome || 'Professor(a)'; document.body.classList.add('dashboard');

    // =========================================================================
    // 6. FUNÇÕES AUXILIARES DE UI
    // =========================================================================
    const showLoading = () => Utils.showLoading('loading'); const hideLoading = () => Utils.hideLoading('loading'); const clearUploadMessage = () => Utils.clearMessage('upload-message-area'); const showUploadMessage = (msg, type = 'success') => Utils.showMessage(msg, type, 'upload-message-area'); const clearFilesMessage = () => Utils.clearMessage('files-message-area'); const showFilesMessage = (msg, type = 'info') => Utils.showMessage(msg, type, 'files-message-area'); const clearChatError = () => Utils.clearMessage('chat-message-area'); const showChatError = (msg) => Utils.showMessage(msg, 'error', 'chat-message-area'); const clearModalMessage = () => Utils.clearMessage('modal-message-area'); const showModalMessage = (msg, type = 'error') => Utils.showMessage(msg, type, 'modal-message-area'); const clearFeedbackModalMsg = () => Utils.clearMessage('feedback-message-area'); const showFeedbackModalMsg = (msg, type = 'error') => Utils.showMessage(msg, type, 'feedback-message-area'); const clearHistoryModalMsg = () => Utils.clearMessage('history-message-area'); const showHistoryModalMsg = (msg, type = 'error') => Utils.showMessage(msg, type, 'history-message-area');

    // =========================================================================
    // 7. LÓGICA DO MENU MOBILE (SIDEBAR TOGGLE)
    // =========================================================================
    function setupMobileMenu() { if (!menuToggle || !sidebar) { console.warn("[Prof] Impossível configurar menu mobile."); return; } menuToggle.addEventListener('click', (event) => { event.stopPropagation(); const isActive = sidebar.classList.toggle('active'); document.body.classList.toggle('sidebar-active', isActive); menuToggle.setAttribute('aria-expanded', isActive); }); document.addEventListener('click', (event) => { if (sidebar.classList.contains('active') && !sidebar.contains(event.target) && event.target !== menuToggle && !menuToggle.contains(event.target)) { sidebar.classList.remove('active'); document.body.classList.remove('sidebar-active'); menuToggle.setAttribute('aria-expanded', 'false'); } }); }

    // =========================================================================
    // 8. LÓGICA DO CHAT
    // =========================================================================
    function scrollToBottom() { if (chatContainer) setTimeout(() => { chatContainer.scrollTop = chatContainer.scrollHeight; }, 50); }
    function addMessageToChatUI(sender, text, renderMarkdown = false) { if (!chatContainer) { console.error("[Prof][ChatUI] ERRO FATAL: chatContainer é null!"); return null; } if (typeof text !== 'string') text = String(text); const messageDiv = document.createElement('div'); messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'tutor-message'); const contentDiv = document.createElement('div'); contentDiv.classList.add('message-content'); const timeDiv = document.createElement('div'); timeDiv.classList.add('message-time'); timeDiv.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); if (sender === 'tutor' && renderMarkdown && md) { try { contentDiv.innerHTML = md.render(text || ''); } catch (e) { console.error("[Prof][ChatUI] Erro Markdown:", e); contentDiv.textContent = text || ''; } } else { contentDiv.textContent = text || ''; } messageDiv.appendChild(contentDiv); if (sender === 'tutor') { const feedbackDiv = document.createElement('div'); feedbackDiv.classList.add('feedback-icons'); feedbackDiv.innerHTML = `<button class="feedback-btn like" title="Gostei">👍</button><button class="feedback-btn dislike" title="Não gostei">👎</button>`; messageDiv.appendChild(feedbackDiv); } messageDiv.appendChild(timeDiv); try { chatContainer.appendChild(messageDiv); scrollToBottom(); return messageDiv; } catch (domError) { console.error("[Prof][ChatUI] Erro DOM:", domError); return null; } }
    function typeTutorResponse(fullText, maxTotalTimeMs = 10000, minSpeedMsPerChar = 10, maxSpeedMsPerChar = 50) { if (!chatContainer) { console.error("[Prof][Typing] ERRO FATAL: chatContainer é null!"); return; } if (typeof fullText !== 'string' || fullText.length === 0) { console.warn("[Prof][Typing] Texto inválido:", fullText); addMessageToChatUI('tutor', '[Erro resposta.]'); return; } const textLength = fullText.length; const calculatedIdealSpeed = textLength > 0 ? (maxTotalTimeMs / textLength) : maxSpeedMsPerChar; const typingSpeedMs = Math.max(minSpeedMsPerChar, Math.min(calculatedIdealSpeed, maxSpeedMsPerChar)); console.log(`[Prof][Typing] Iniciando (${textLength} chars, ${typingSpeedMs.toFixed(1)}ms/char)...`); const messageDiv = addMessageToChatUI('tutor', '', false); if (!messageDiv) { console.error("[Prof][Typing] Falha criar div."); return; } const contentDiv = messageDiv.querySelector('.message-content'); const timeDiv = messageDiv.querySelector('.message-time'); const feedbackDiv = messageDiv.querySelector('.feedback-icons'); if(feedbackDiv) feedbackDiv.style.display = 'none'; if (!contentDiv || !timeDiv) { console.error("[Prof][Typing] Erro estrutura interna."); messageDiv.remove(); return; } contentDiv.innerHTML = ''; let i = 0; const intervalId = setInterval(() => { if (i < textLength) { contentDiv.textContent += fullText[i]; i++; scrollToBottom(); } else { clearInterval(intervalId); timeDiv.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); if (md) { try { contentDiv.innerHTML = md.render(fullText); } catch (e) { console.error("[Prof][Typing] Erro Markdown pós-digitação:", e); } } if(feedbackDiv) feedbackDiv.style.display = 'flex'; scrollToBottom(); } }, typingSpeedMs); }
    async function loadChatHistory() { if (!chatContainer) return; chatContainer.innerHTML = ''; showLoading(); let historyLoaded = false; try { const historyData = await Api.getHistory({ limit: 20 }); if (historyData?.messages?.length > 0) { console.log(`[Prof][History] ${historyData.messages.length} msgs.`); historyData.messages.reverse().forEach(msg => { addMessageToChatUI(msg.role, msg.content, msg.role === 'model'); }); historyLoaded = true; } else { console.log("[Prof][History] Nenhum histórico."); } } catch (error) { console.error("[Prof][History] Erro carregar:", error); showChatError("Erro carregar histórico."); } finally { if (!historyLoaded) { addMessageToChatUI('tutor', 'Olá, Professor(a)! Use o chat ou gerencie os manuais ao lado.'); } hideLoading(); scrollToBottom(); } }

    // =========================================================================
    // 9. LÓGICA DE GERENCIAMENTO DE ARQUIVOS
    // =========================================================================
    function openMetadataModal(options = {}) { const { fileObject = null, metaId = null, filename = '', currentTitle = '', currentDescription = '', currentDiscipline = '' } = options; if (!metadataModal || !modalTitleInput || !modalDescriptionInput || !confirmUploadButton || !modalFilenamePreview) { console.error("[Prof][Modal] Elementos críticos ausentes!"); showUploadMessage("Erro interno.", "error"); return; } if (!modalDisciplineInput) console.warn("[Prof][Modal] Input #modal-disciplina ausente."); console.log("[Prof][Modal] Abrindo:", options); clearModalMessage(); selectedFileObject = fileObject; currentEditingMetaId = metaId; modalFilenamePreview.textContent = `Arquivo: ${filename || fileObject?.name || 'N/A'}`; const defaultTitle = fileObject ? (fileObject.name.substring(0, fileObject.name.lastIndexOf('.')) || fileObject.name).replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : ''; modalTitleInput.value = currentTitle || defaultTitle; modalDescriptionInput.value = currentDescription || ''; if (modalDisciplineInput) modalDisciplineInput.value = currentDiscipline || ''; confirmUploadButton.disabled = false; confirmUploadButton.innerHTML = metaId ? '<i class="fas fa-save"></i> Salvar Alterações' : '<i class="fas fa-check"></i> Confirmar e Enviar'; metadataModal.style.display = 'flex'; setTimeout(() => metadataModal.classList.add('active'), 10); modalTitleInput.focus(); }
    function closeMetadataModal() { if (!metadataModal || !metadataForm || !fileInput || !fileNameDisplay) { console.warn("[Prof][Modal] Elementos ausentes ao fechar."); return; } metadataModal.classList.remove('active'); setTimeout(() => { metadataModal.style.display = 'none'; metadataForm.reset(); selectedFileObject = null; currentEditingMetaId = null; if (selectFileForm) selectFileForm.reset(); fileInput.value = null; fileNameDisplay.textContent = 'Nenhum arquivo selecionado'; }, 300); }
    window.closeMetadataModal = closeMetadataModal;
    async function loadFiles() { if (!filesList || !filesLoadingDiv) { console.error("[Prof][Files] ERRO FATAL: Elementos lista/loading ausentes!"); return; }; clearFilesMessage(); filesLoadingDiv.style.display = 'block'; filesList.innerHTML = ''; try { const allFiles = await Api.getFiles(); if (!Array.isArray(allFiles)) throw new Error("Resposta API inválida."); const myFiles = allFiles.filter(file => file.uploader?.id === userId); myFiles.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)); if (myFiles.length > 0) { myFiles.forEach((file, index) => { if (!file?.id) { console.warn(`[Prof][Render] Item ${index + 1} PULADO: ID ausente.`); return; } const li = document.createElement('li'); const isComplete = file.metadataComplete ?? (!!file.title); li.classList.add('file-item'); if (!isComplete) li.classList.add('incomplete-meta'); li.dataset.id = file.id; li.dataset.filename = file.originalName || file.title || `arquivo_${file.id}`; li.dataset.mimetype = file.mimeType || 'application/octet-stream'; li.dataset.currentTitle = file.title || ''; li.dataset.currentDescription = file.description || ''; li.dataset.currentDiscipline = file.disciplina || ''; li.innerHTML = `<h4 style="color: ${file.title ? 'var(--primary-color)' : 'var(--text-muted)'}; margin-bottom: 0.3rem; font-size: 1.05rem; word-break: break-word;" title="${file.title || file.originalName}"><i class="fas fa-file-alt" style="margin-right: 0.4rem; opacity: 0.8;"></i> ${file.title || file.originalName || 'Nome Pendente'} ${!isComplete ? '<span style="font-size: 0.7em; color: var(--error-color); font-style: italic;"> (Detalhes Pendentes)</span>' : ''}</h4><span style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 0.4rem;"><i class="fas fa-info-circle" style="margin-right: 4px;"></i> ${Utils.formatBytes(file.size || 0)} - ${Utils.formatDate(file.uploadDate)}</span><p style="font-size: 0.85rem; color: var(--text-light); margin-bottom: 0.7rem; line-height: 1.4; word-wrap: break-word;">${file.description || (isComplete ? 'Sem descrição.' : '<em>Descrição pendente...</em>')}</p>${file.disciplina ? `<span class="disciplina-tag">${file.disciplina}</span>` : (isComplete ? '<span style="font-size:0.75rem; color: var(--text-muted); margin-bottom: 0.8rem; display:inline-block;"><em>Sem disciplina</em></span>' : '')}<div class="file-actions"><button class="btn-edit" title="Editar Detalhes"><i class="fas fa-pencil-alt"></i> Editar</button><button class="btn-view" title="Visualizar" ${!isComplete ? 'disabled' : ''}><i class="fas fa-eye"></i> Ver</button><button class="btn-download" title="Baixar" ${!isComplete ? 'disabled' : ''}><i class="fas fa-download"></i> Baixar</button><button class="btn-delete" title="Excluir"><i class="fas fa-trash-alt"></i> Excluir</button></div>`; filesList.appendChild(li); }); } else { filesList.innerHTML = '<li style="text-align:center; color:var(--text-muted); padding:1rem 0;">Você ainda não enviou nenhum manual.</li>'; } } catch (error) { console.error("[Prof][Files] Erro carregar lista:", error); showFilesMessage(error.message || 'Falha carregar.', 'error'); } finally { filesLoadingDiv.style.display = 'none'; } }
    function handleEditClick(listItem) { openMetadataModal({ metaId: listItem.dataset.id, filename: listItem.dataset.filename, currentTitle: listItem.dataset.currentTitle, currentDescription: listItem.dataset.currentDescription, currentDiscipline: listItem.dataset.currentDiscipline }); }
    async function handleViewFile(fileId, mimeType) { showLoading(); clearFilesMessage(); try { const blob = await Api.getFileBlob(fileId); if (!blob || blob.size === 0) throw new Error("Arquivo vazio."); if (mimeType.startsWith('application/pdf') || mimeType.startsWith('image/') || mimeType.startsWith('text/')) { const fileURL = URL.createObjectURL(blob); window.open(fileURL, '_blank'); } else { console.warn(`[Prof][View] Tipo ${mimeType} não visualizável.`); handleDownloadFile(fileId, document.querySelector(`.file-item[data-id="${fileId}"]`)?.dataset.filename); } } catch (error) { console.error("[Prof][View] Erro:", error); showFilesMessage(error.message || 'Falha visualizar.', 'error'); } finally { hideLoading(); } }
    async function handleDownloadFile(fileId, filename) { showLoading(); clearFilesMessage(); try { const blob = await Api.getFileBlob(fileId); if (!blob || blob.size === 0) throw new Error("Arquivo vazio."); const link = document.createElement('a'); const url = URL.createObjectURL(blob); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); } catch (error) { console.error("[Prof][Download] Erro:", error); showFilesMessage(error.message || 'Falha baixar.', 'error'); } finally { hideLoading(); } }
    async function handleDeleteFile(fileId, fileName) { if (confirm(`Excluir "${fileName}"?`)) { console.log(`[Prof][Delete] Excluindo ID: ${fileId}`); showLoading(); clearFilesMessage(); try { await Api.deleteFile(fileId); showFilesMessage('Excluído!', 'success'); loadFiles(); } catch (error) { console.error("[Prof][Delete] Erro:", error); showFilesMessage(error.message || 'Falha excluir.', 'error'); } finally { hideLoading(); } } }
    function handleFileListClick(event) { const button = event.target.closest('button'); if (!button) return; const li = button.closest('.file-item'); if (!li || !li.dataset.id) return; const id = li.dataset.id; if (button.classList.contains('btn-edit')) handleEditClick(li); else if (button.classList.contains('btn-view')) handleViewFile(id, li.dataset.mimetype); else if (button.classList.contains('btn-download')) handleDownloadFile(id, li.dataset.filename); else if (button.classList.contains('btn-delete')) handleDeleteFile(id, li.querySelector('h4')?.textContent?.trim() || 'este arquivo'); }

    // =========================================================================
    // 10. LÓGICA DO HISTÓRICO DE CHAT (Modal)
    // =========================================================================
    function openHistoryModal() { if (!historyModal) return; historyModal.style.display = 'flex'; setTimeout(() => historyModal.classList.add('active'), 10); fetchAndDisplayHistory(1); }
    function closeHistoryModal() { if (!historyModal) return; historyModal.classList.remove('active'); setTimeout(() => { historyModal.style.display = 'none'; }, 300); }
    async function fetchAndDisplayHistory(page = 1) { if (!historyResultsContainer || !historyPrevBtn || !historyNextBtn || !historyPageInfo) { console.error("[Prof][History] Elementos modal histórico ausentes."); return; }; clearHistoryModalMsg(); historyResultsContainer.innerHTML = '<p>Carregando...</p>'; historyPrevBtn.disabled = true; historyNextBtn.disabled = true; try { const params = { page, limit: 20 }; const data = await Api.getHistory(params); currentHistoryPage = data.currentPage || 1; totalHistoryPages = data.totalPages || 1; renderHistoryMessages(data.messages || []); updatePaginationControls(); } catch (error) { console.error("[Prof][History] Erro:", error); showHistoryModalMsg(error.message || "Falha.", "error"); historyResultsContainer.innerHTML = '<p>Erro.</p>'; historyPageInfo.textContent = 'Erro'; } }
    function renderHistoryMessages(messages) { if (!historyResultsContainer) return; historyResultsContainer.innerHTML = ''; if (!messages || messages.length === 0) { historyResultsContainer.innerHTML = '<p>Nenhuma mensagem.</p>'; return; } messages.forEach(msg => { const messageDiv = document.createElement('div'); messageDiv.classList.add('message', msg.role === 'user' ? 'user-message' : 'tutor-message'); const contentDiv = document.createElement('div'); contentDiv.classList.add('message-content'); const timeDiv = document.createElement('div'); timeDiv.classList.add('message-time'); timeDiv.textContent = new Date(msg.createdAt).toLocaleString(); if (msg.role === 'model' && md) { try { contentDiv.innerHTML = md.render(msg.content || ''); } catch (e) { contentDiv.textContent = msg.content || ''; } } else { contentDiv.textContent = msg.content || ''; } messageDiv.appendChild(contentDiv); messageDiv.appendChild(timeDiv); historyResultsContainer.appendChild(messageDiv); }); historyResultsContainer.scrollTop = 0; }
    function updatePaginationControls() { if (!historyPrevBtn || !historyNextBtn || !historyPageInfo) return; historyPrevBtn.disabled = (currentHistoryPage <= 1); historyNextBtn.disabled = (currentHistoryPage >= totalHistoryPages); historyPageInfo.textContent = `Página ${currentHistoryPage} de ${totalHistoryPages}`; }

    // =========================================================================
    // 11. LÓGICA DO FEEDBACK TEXTUAL (Modal)
    // =========================================================================
    function openFeedbackModal() { if (!feedbackModal) return; console.log("[Prof] Abrindo modal feedback."); clearFeedbackModalMsg(); if (feedbackTextArea) feedbackTextArea.value = ''; if (submitFeedbackBtn) submitFeedbackBtn.disabled = false; feedbackModal.style.display = 'flex'; setTimeout(() => feedbackModal.classList.add('active'), 10); if (feedbackTextArea) feedbackTextArea.focus(); }
    function closeFeedbackModalFunction() { if (!feedbackModal) return; feedbackModal.classList.remove('active'); setTimeout(() => { feedbackModal.style.display = 'none'; if(feedbackForm) feedbackForm.reset(); clearFeedbackModalMsg(); }, 300); }

    // =========================================================================
    // 12. EVENT LISTENERS PRINCIPAIS
    // =========================================================================

    // Listener Chat
    if (chatForm) { chatForm.addEventListener('submit', async (e) => { e.preventDefault(); clearChatError(); const messageText = messageInput.value.trim(); if (!messageText) return; messageInput.disabled = true; sendButton.disabled = true; sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; addMessageToChatUI('user', messageText); messageInput.value = ''; scrollToBottom(); try { const data = await Api.sendMessage(messageText); if (data?.reply?.trim()) { typeTutorResponse(data.reply); } else { console.warn(`[Prof][ChatSubmit] Resposta inválida:`, data); addMessageToChatUI('tutor', '[Resposta inválida.]'); } } catch (error) { console.error(`[Prof][ChatSubmit] Erro:`, error); showChatError(error.message || 'Erro.'); addMessageToChatUI('tutor', `Erro: ${error.message || 'Falha.'}`); } finally { messageInput.disabled = false; sendButton.disabled = false; sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>'; messageInput.focus(); } }); }
    else { console.error("[Prof] ERRO FATAL: chatForm não encontrado!"); }

    // Listener Logout
    if (logoutButton) { logoutButton.addEventListener('click', () => { if(confirm('Tem certeza?')) Utils.logout(); }); }
    else { console.error("[Prof] ERRO FATAL: logoutButton não encontrado!"); }

    // Listener Seleção de Arquivo
    if (fileInput && selectFileForm) { fileInput.addEventListener('change', (event) => { clearUploadMessage(); if (event.target.files && event.target.files.length > 0) { const file = event.target.files[0]; fileNameDisplay.textContent = `Selecionado: ${file.name}`; openMetadataModal({ filename: file.name, fileObject: file }); } else { fileNameDisplay.textContent = 'Nenhum arquivo selecionado'; selectedFileObject = null; } }); }
    else { console.error("[Prof] ERRO FATAL: Elementos seleção arquivo não encontrados!"); }

    // Listener Submissão do Modal MetaDados
    if (metadataForm) { metadataForm.addEventListener('submit', async (e) => { e.preventDefault(); clearModalMessage(); const title = modalTitleInput.value.trim(); const description = modalDescriptionInput.value.trim(); const discipline = modalDisciplineInput ? modalDisciplineInput.value.trim() : null; const fileToUpload = selectedFileObject; const metaIdBeingEdited = currentEditingMetaId; if (!title) { showModalMessage('Título obrigatório.', 'error'); modalTitleInput.focus(); return; } confirmUploadButton.disabled = true; showLoading(); try { let metaIdToUpdate = metaIdBeingEdited; if (fileToUpload && !metaIdToUpdate) { const formData = new FormData(); formData.append('file', fileToUpload); let uploadResult; try { uploadResult = await Api.uploadFile(formData); } catch (uploadError) { throw new Error(`Falha enviar arquivo: ${uploadError.message || 'Erro'}`); } metaIdToUpdate = uploadResult?.file?.id; if (!metaIdToUpdate) throw new Error("Falha crítica: ID não retornado."); } if (!metaIdToUpdate) throw new Error("Erro interno: ID não determinado."); const payload = { title, description }; if (modalDisciplineInput && discipline) { payload.disciplina = discipline; } else { payload.disciplina = null; } await Api.updateFileMetadata(metaIdToUpdate, payload); if (fileToUpload && !metaIdBeingEdited) showUploadMessage('Manual enviado e detalhes salvos!', 'success'); else showFilesMessage('Detalhes atualizados!', 'success'); closeMetadataModal(); loadFiles(); } catch (err) { console.error('[Prof][Modal Submit] ERRO:', err); showModalMessage(err.message || 'Falha ao salvar.', 'error'); confirmUploadButton.disabled = false; } finally { hideLoading(); } }); }
    else { console.error("[Prof] ERRO FATAL: Formulário do modal não encontrado!"); }

     // Listener de clique unificado para a lista de arquivos
     if (filesList) { filesList.addEventListener('click', handleFileListClick); }
     else { console.error("[Prof] ERRO FATAL: #files-list não encontrado!"); }

    // Listeners Histórico
    if (openHistoryBtn) { openHistoryBtn.addEventListener('click', openHistoryModal); } else console.warn("[Prof] Botão histórico não encontrado.");
    if (closeHistoryModalBtn) { closeHistoryModalBtn.addEventListener('click', closeHistoryModal); }
    if (historyModal) { historyModal.addEventListener('click', (event) => { if (event.target === historyModal) closeHistoryModal(); }); }
    if (historyPrevBtn) { historyPrevBtn.addEventListener('click', () => { if (!historyPrevBtn.disabled) fetchAndDisplayHistory(currentHistoryPage - 1); }); }
    if (historyNextBtn) { historyNextBtn.addEventListener('click', () => { if (!historyNextBtn.disabled) fetchAndDisplayHistory(currentHistoryPage + 1); }); }

    // Listeners Feedback Modal
    if (openFeedbackBtn) { openFeedbackBtn.addEventListener('click', openFeedbackModal); } else console.warn("[Prof] Botão feedback não encontrado.");
    if (closeFeedbackModalBtnFeedback) { closeFeedbackModalBtnFeedback.addEventListener('click', closeFeedbackModalFunction); }
    if (feedbackModal) { feedbackModal.addEventListener('click', (event) => { if (event.target === feedbackModal) closeFeedbackModalFunction(); }); }
    if (feedbackForm) { feedbackForm.addEventListener('submit', async (e) => { e.preventDefault(); clearFeedbackModalMsg(); const message = feedbackTextArea.value.trim(); if (!message) { showFeedbackModalMsg("Escreva sua mensagem.", "error"); feedbackTextArea.focus(); return; } submitFeedbackBtn.disabled = true; submitFeedbackBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...'; showLoading(); try { await Api.sendFeedback(message); showFeedbackModalMsg("Feedback enviado! Obrigado.", "success"); feedbackTextArea.value = ''; setTimeout(closeFeedbackModalFunction, 1500); } catch (error) { console.error("[Prof][Feedback Submit] Erro:", error); showFeedbackModalMsg(error.message || "Falha enviar.", "error"); submitFeedbackBtn.disabled = false; submitFeedbackBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Mensagem'; } finally { hideLoading(); } }); }
    else { console.warn("[Prof] Formulário feedback não encontrado."); }

     // Listener Feedback Visual no Chat
     if (chatContainer) { chatContainer.addEventListener('click', (event) => { const button = event.target.closest('.feedback-btn'); if (!button) return; const messageDiv = button.closest('.message.tutor-message'); if (!messageDiv) return; const msg = messageDiv.querySelector('.message-content')?.textContent || ''; const type = button.classList.contains('like') ? 'Like' : 'Dislike'; console.log(`[Prof][Feedback] ${type} para: "${msg.substring(0, 50)}..."`); button.closest('.feedback-icons').querySelectorAll('.feedback-btn').forEach(btn => btn.disabled = true); button.style.opacity = '1'; button.style.transform = 'scale(1.1)'; }); }

    // Função fechar modal de feedback
    function closeFeedbackModalFunction() { if (!feedbackModal) return; feedbackModal.classList.remove('active'); setTimeout(() => { feedbackModal.style.display = 'none'; if(feedbackForm) feedbackForm.reset(); clearFeedbackModalMsg(); }, 300); }

    // =========================================================================
    // 11. AÇÕES INICIAIS AO CARREGAR A PÁGINA
    // =========================================================================
    if(chatContainer) addMessageToChatUI('tutor', 'Olá, Professor(a)! Use o chat ou gerencie os manuais ao lado.');
    loadFiles(); setupMobileMenu(); scrollToBottom();

}); // Fim do DOMContentLoaded