document.addEventListener('DOMContentLoaded', () => {
    // Verificar se o administrador está logado
   const adminLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
   const userData = Utils.getUserData();
   const isAdmin = userData && userData.tipo === 'admin';
   
   // Substituir verificação inicial por:
    if (!Utils.isAdmin()) {
        window.location.href = 'login.html';
        return;
    }

    // Elementos do DOM
    const tabLinks = document.querySelectorAll('.sidebar-menu a');
    const tabContents = document.querySelectorAll('.tab-content');
    const logoutBtn = document.getElementById('logout-btn');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const cadastroProfessorForm = document.getElementById('cadastro-professor-form');
    const professorListBody = document.getElementById('professor-list-body');

    // Gerenciamento de abas
    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remover classe active de todos os links e conteúdos
            tabLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Adicionar classe active ao link clicado
            link.classList.add('active');
            
            // Mostrar conteúdo correspondente
            const tabId = link.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            
            // Fechar menu mobile após clicar
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
            }
            
            // Carregar dados específicos da aba
            if (tabId === 'listar-professores') {
                loadProfessores();
            }
        });
    });

    // Toggle menu mobile
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Tem certeza que deseja sair do painel de administração?')) {
             Utils.logout();
        }
      });
    }

    // Cadastro de professor
    if (cadastroProfessorForm) {
        cadastroProfessorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            Utils.clearMessage();
            Utils.showLoading();
            
            const professorData = {
                nome: cadastroProfessorForm.nome.value.trim(),
                email: cadastroProfessorForm.email.value.trim(),
                senha: cadastroProfessorForm.senha.value.trim(),
                disciplinas: cadastroProfessorForm.disciplinas.value.trim()
            };
            
            try {
                const data = await Api.createProfessor(professorData);
                if (data && data._id) {
                    Utils.showMessage('Professor cadastrado com sucesso!', 'success');
                    cadastroProfessorForm.reset();
                    
                    // Se estiver na aba de listagem, atualizar a lista
                    if (document.getElementById('listar-professores').classList.contains('active')) {
                        loadProfessores();
                    }
                }
            } catch (error) {
                Utils.showMessage(error.message || 'Erro no cadastro do professor', 'error');
            } finally {
                Utils.hideLoading();
            }
        });
    }

    // Função para carregar lista de professores
    async function loadProfessores() {
        try {
            Utils.showLoading();
            
            // Fazer requisição para obter lista de professores
            const professores = await Api.getProfessores();
            
            // Limpar tabela
            professorListBody.innerHTML = '';
            
            if (professores && professores.length > 0) {
                // Preencher tabela com dados dos professores
                professores.forEach(professor => {
                    const row = document.createElement('tr');
                    
                    row.innerHTML = `
                        <td>${professor.nome}</td>
                        <td>${professor.email}</td>
                        <td>${professor.disciplinas ? professor.disciplinas.join(', ') : ''}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn-action btn-edit" data-id="${professor._id}" title="Editar professor">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-action btn-delete" data-id="${professor._id}" title="Excluir professor">
                                    <i class="fas fa-trash"></i>
                                </button>
                                <button class="btn-action btn-password" data-id="${professor._id}" title="Redefinir senha">
                                    <i class="fas fa-key"></i>
                                </button>
                                <button class="btn-action ${professor.isActive ? 'btn-disable' : 'btn-enable'}" 
                                        data-id="${professor._id}" 
                                        data-active="${professor.isActive}" 
                                        title="${professor.isActive ? 'Desativar conta' : 'Ativar conta'}">
                                    <i class="fas ${professor.isActive ? 'fa-user-slash' : 'fa-user-check'}"></i>
                                </button>
                            </div>
                        </td>
                    `;
                    
                    professorListBody.appendChild(row);
                });
                
                // Adicionar event listeners para botões de ação
                setupActionButtons();
            } else {
                professorListBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhum professor cadastrado</td></tr>';
            }
        } catch (error) {
            Utils.showMessage('Erro ao carregar lista de professores: ' + (error.message || 'Erro desconhecido'), 'error');
            console.error(error);
        } finally {
            Utils.hideLoading();
        }
    }

    // Configurar botões de ação para editar/excluir professores
    function setupActionButtons() {
        // Botões de edição
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const professorId = btn.getAttribute('data-id');
                try {
                    Utils.showLoading();
                    const professor = await Api.getProfessorById(professorId);
                    
                    // Criar modal de edição
                    const modal = document.createElement('div');
                    modal.className = 'modal';
                    modal.innerHTML = `
                        <div class="modal-content">
                            <span class="close">&times;</span>
                            <h2>Editar Professor</h2>
                            <form id="edit-professor-form">
                                <div class="form-grid">
                                    <div>
                                        <label for="edit-nome">Nome:</label>
                                        <input type="text" id="edit-nome" name="nome" value="${professor.nome}" required>
                                    </div>
                                    <div>
                                        <label for="edit-email">Email:</label>
                                        <input type="email" id="edit-email" name="email" value="${professor.email}" required>
                                    </div>
                                    <div class="form-full-width">
                                        <label for="edit-disciplinas">Disciplinas:</label>
                                        <input type="text" id="edit-disciplinas" name="disciplinas" value="${professor.disciplinas ? professor.disciplinas.join(', ') : ''}" required>
                                        <small class="form-help">Separe as disciplinas por vírgula</small>
                                    </div>
                                    <div class="form-full-width">
                                        <button type="submit" class="btn">Salvar Alterações</button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    `;
                    
                    document.body.appendChild(modal);
                    
                    // Mostrar modal
                    modal.style.display = 'block';
                    
                    // Fechar modal ao clicar no X
                    modal.querySelector('.close').addEventListener('click', () => {
                        document.body.removeChild(modal);
                    });
                    
                    // Fechar modal ao clicar fora dele
                    window.addEventListener('click', (e) => {
                        if (e.target === modal) {
                            document.body.removeChild(modal);
                        }
                    });
                    
                    // Submeter formulário de edição
                    const editForm = document.getElementById('edit-professor-form');
                    editForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        Utils.showLoading();
                        
                        try {
                            const updatedData = {
                                nome: editForm.nome.value.trim(),
                                email: editForm.email.value.trim(),
                                disciplinas: editForm.disciplinas.value.trim()
                            };
                            
                            await Api.updateProfessor(professorId, updatedData);
                            Utils.showMessage('Professor atualizado com sucesso!', 'success');
                            document.body.removeChild(modal);
                            loadProfessores(); // Recarregar lista
                        } catch (error) {
                            Utils.showMessage('Erro ao atualizar professor: ' + (error.message || 'Erro desconhecido'), 'error');
                        } finally {
                            Utils.hideLoading();
                        }
                    });
                    
                } catch (error) {
                    Utils.showMessage('Erro ao carregar dados do professor: ' + (error.message || 'Erro desconhecido'), 'error');
                } finally {
                    Utils.hideLoading();
                }
            });
        });
        
        // Botões de redefinição de senha
        document.querySelectorAll('.btn-password').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const professorId = btn.getAttribute('data-id');
                
                // Criar modal de redefinição de senha
                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content">
                        <span class="close">&times;</span>
                        <h2>Redefinir Senha</h2>
                        <form id="reset-password-form">
                            <div>
                                <label for="new-password">Nova Senha:</label>
                                <input type="password" id="new-password" name="senha" placeholder="Mínimo 8 caracteres" required minlength="8">
                            </div>
                            <div>
                                <label for="confirm-password">Confirmar Senha:</label>
                                <input type="password" id="confirm-password" name="confirmarSenha" placeholder="Repita a senha" required minlength="8">
                                <small class="form-help" id="password-match-message"></small>
                            </div>
                            <button type="submit" class="btn" id="reset-password-btn">Redefinir Senha</button>
                        </form>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                // Mostrar modal
                modal.style.display = 'block';
                
                // Fechar modal ao clicar no X
                modal.querySelector('.close').addEventListener('click', () => {
                    document.body.removeChild(modal);
                });
                
                // Fechar modal ao clicar fora dele
                window.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        document.body.removeChild(modal);
                    }
                });
                
                // Verificar se as senhas coincidem
                const newPassword = document.getElementById('new-password');
                const confirmPassword = document.getElementById('confirm-password');
                const passwordMatchMessage = document.getElementById('password-match-message');
                const resetPasswordBtn = document.getElementById('reset-password-btn');
                
                function checkPasswordMatch() {
                    if (newPassword.value && confirmPassword.value) {
                        if (newPassword.value === confirmPassword.value) {
                            passwordMatchMessage.textContent = 'Senhas coincidem';
                            passwordMatchMessage.style.color = 'green';
                            resetPasswordBtn.disabled = false;
                        } else {
                            passwordMatchMessage.textContent = 'Senhas não coincidem';
                            passwordMatchMessage.style.color = 'red';
                            resetPasswordBtn.disabled = true;
                        }
                    } else {
                        passwordMatchMessage.textContent = '';
                        resetPasswordBtn.disabled = false;
                    }
                }
                
                newPassword.addEventListener('input', checkPasswordMatch);
                confirmPassword.addEventListener('input', checkPasswordMatch);
                
                // Submeter formulário de redefinição de senha
                const resetForm = document.getElementById('reset-password-form');
                resetForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    if (newPassword.value !== confirmPassword.value) {
                        Utils.showMessage('As senhas não coincidem', 'error');
                        return;
                    }
                    
                    Utils.showLoading();
                    
                    try {
                        await Api.updateProfessorSenha(professorId, newPassword.value);
                        Utils.showMessage('Senha redefinida com sucesso!', 'success');
                        document.body.removeChild(modal);
                    } catch (error) {
                        Utils.showMessage('Erro ao redefinir senha: ' + (error.message || 'Erro desconhecido'), 'error');
                    } finally {
                        Utils.hideLoading();
                    }
                });
            });
        });
        
        // Botões de ativação/desativação
        document.querySelectorAll('.btn-enable, .btn-disable').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const professorId = btn.getAttribute('data-id');
                const isActive = btn.getAttribute('data-active') === 'true';
                const action = isActive ? 'desativar' : 'ativar';
                
                if (confirm(`Tem certeza que deseja ${action} este professor?`)) {
                    try {
                        Utils.showLoading();
                        await Api.updateProfessor(professorId, { isActive: !isActive });
                        Utils.showMessage(`Professor ${action === 'ativar' ? 'ativado' : 'desativado'} com sucesso!`, 'success');
                        loadProfessores(); // Recarregar lista
                    } catch (error) {
                        Utils.showMessage(`Erro ao ${action} professor: ` + (error.message || 'Erro desconhecido'), 'error');
                    } finally {
                        Utils.hideLoading();
                    }
                }
            });
        });
        
        // Botões de exclusão
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const professorId = btn.getAttribute('data-id');
                if (confirm('Tem certeza que deseja excluir este professor? Esta ação não pode ser desfeita.')) {
                    try {
                        Utils.showLoading();
                        await Api.deleteProfessor(professorId);
                        Utils.showMessage('Professor excluído com sucesso!', 'success');
                        loadProfessores(); // Recarregar lista
                    } catch (error) {
                        Utils.showMessage('Erro ao excluir professor: ' + (error.message || 'Erro desconhecido'), 'error');
                    } finally {
                        Utils.hideLoading();
                    }
                }
            });
        });
    }

    // Carregar professores se estiver na aba de listagem
    if (document.getElementById('listar-professores').classList.contains('active')) {
        loadProfessores();
    }
    
    // Substituir este código no final do seu JS
const style = document.createElement('style');
style.textContent = `
    /* Modal principal */
    .modal {
        display: none;
        position: fixed;
        z-index: 1050;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
        background-color: rgba(0,0,0,0.6);
    }
    
    .modal-content {
        background-color: var(--medium-bg);
        margin: 5% auto;
        padding: 2rem;
        border: 1px solid var(--border-color-light);
        width: 90%;
        max-width: 600px;
        border-radius: var(--border-radius);
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        color: var(--text-light);
        position: relative;
    }
    
    .close {
        color: var(--text-muted);
        position: absolute;
        top: 15px;
        right: 20px;
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
        transition: color 0.2s ease;
    }
    
    .close:hover {
        color: var(--primary-color);
    }

    /* Botões de ação GLOBAIS (tabela + modal) */
    .btn-action {
        background: transparent !important;
        border: none !important;
        padding: 0.25rem !important;
        min-width: auto !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
    }
    
    .btn-action i {
        font-size: 1.2rem !important;
        width: 1.2rem !important;
        height: 1.2rem !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
    }
    
    /* Cores específicas para cada tipo de botão */
    .btn-edit, .btn-edit i {
        color: var(--primary-color) !important;
    }
    
    .btn-delete, .btn-delete i {
        color: var(--error-color) !important;
    }
    
    .btn-password, .btn-password i {
        color: var(--info-color) !important;
    }
    
    .btn-enable, .btn-enable i {
        color: var(--success-color) !important;
    }
    
    .btn-disable, .btn-disable i {
        color: #ff7675 !important;
    }
    
    /* Efeitos hover */
    .btn-action:hover {
        transform: scale(1.15) !important;
        background-color: rgba(255,255,255,0.05) !important;
    }
    
    /* Container de botões */
    .action-buttons {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
    }
`;
document.head.appendChild(style);
});
