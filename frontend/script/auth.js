document.addEventListener('DOMContentLoaded', () => {
    // Referências aos elementos do DOM
    const loginForm = document.getElementById('login-form');
    const cadastroForm = document.getElementById('cadastro-form');
    const adminLoginToggle = document.getElementById('admin-login-toggle');

    // Flag para controlar o estado do formulário de login
    let isAdminLogin = false;

    // Função para validar o formato da turma
    function validateTurmaFormat(input, showMessage = false) {
        const value = input.value.trim();
        const turmaRegex = /^[A-Z\s]+[0-9]{1,2}[A-Z\s]+$/i;
        const isValid = turmaRegex.test(value);
        const formHelp = input.nextElementSibling;
        
        if (value) {
            if (isValid) {
                input.style.borderColor = 'var(--success-color)';
                if (formHelp) formHelp.style.color = 'var(--success-color)';
                return true;
            } else {
                input.style.borderColor = 'var(--error-color)';
                if (formHelp) formHelp.style.color = 'var(--error-color)';
                if (showMessage) {
                    Utils.showMessage('Formato da turma inválido. Ex: TI10AD', 'error');
                }
                return false;
            }
        } else {
            input.style.borderColor = '';
            if (formHelp) formHelp.style.color = '';
            return false;
        }
    }

    // --- Lógica para a PÁGINA DE LOGIN ---
    if (loginForm) {
    // O link para alternar para admin não é mais necessário, pode removê-lo do HTML e daqui
            const adminLoginToggle = document.getElementById('admin-login-toggle');
            if (adminLoginToggle) adminLoginToggle.style.display = 'none';

            loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            Utils.clearMessage();
            Utils.showLoading();
            const loginButton = document.getElementById('login-button');
            if(loginButton) loginButton.disabled = true;

            const email = loginForm.email.value.trim();
            const senha = loginForm.senha.value;

            try {
                const data = await Api.login(email, senha);

                if (data && data.user && data.token) {
                    Utils.saveToken(data.token);
                    Utils.saveUserData(data.user);

                    // AQUI ESTÁ O PONTO DE FALHA
                    switch (data.user.tipo) {
                        case 'admin':
                            window.location.href = 'admin_dashboard.html';
                            break;
                        case 'professor':
                            window.location.href = 'dashboard_professor.html';
                            break;
                        case 'aluno':
                            window.location.href = 'dashboard_aluno.html';
                            break;
                        default:
                            // ELE ESTÁ A ENTRAR AQUI
                            throw new Error('Tipo de usuário desconhecido.');
                    }
                } else {
                    throw new Error('Resposta inválida do servidor.');
                }
            } catch (error) {
                console.error("Erro no login:", error);
                Utils.showMessage(error.message || 'Falha no login. Verifique suas credenciais.', 'error');
            } finally {
                Utils.hideLoading();
                if(loginButton) loginButton.disabled = false;
            }
        });
    }

    // --- Lógica para a PÁGINA DE CADASTRO ---
    if (cadastroForm) {
        const turmaInput = document.getElementById('turma');
        if (turmaInput) {
            turmaInput.addEventListener('input', () => validateTurmaFormat(turmaInput));
            turmaInput.addEventListener('blur', () => validateTurmaFormat(turmaInput, true));
        }

        cadastroForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            Utils.clearMessage();
            if (turmaInput && !validateTurmaFormat(turmaInput, true)) {
                Utils.showMessage('Por favor, corrija o formato da turma.', 'error');
                return;
            }
            
            Utils.showLoading(); // Usa o método de Utils
            const registerButton = document.getElementById('register-button');
            if(registerButton) registerButton.disabled = true;

            const userData = {
                nome: cadastroForm.nome.value.trim(),
                email: cadastroForm.email.value.trim(),
                senha: cadastroForm.senha.value,
                tipo: 'aluno',
                turma: cadastroForm.turma.value.trim().toUpperCase()
            };

            try {
                await Api.register(userData);
                Utils.showMessage('Cadastro realizado com sucesso! Redirecionando...', 'success');
                setTimeout(() => window.location.href = 'login.html', 2500);
            } catch (error) {
                console.error("Erro no cadastro:", error);
                Utils.showMessage(error.message || 'Falha no cadastro.', 'error');
            } finally {
                 Utils.hideLoading(); // Usa o método de Utils
                 if(registerButton) registerButton.disabled = false;
            }
        });
    }
});