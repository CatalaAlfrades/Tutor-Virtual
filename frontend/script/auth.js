// frontend/script/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const cadastroForm = document.getElementById('cadastro-form');

    // --- Login ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Previne recarregamento
            Utils.clearMessage(); // Limpa mensagens anteriores
            Utils.showLoading();
            const loginButton = document.getElementById('login-button');
            if(loginButton) loginButton.disabled = true;

            const email = loginForm.email.value.trim();
            const senha = loginForm.senha.value.trim();

            try {
                const data = await Api.login(email, senha);

                if (data && data.token && data._id) {
                    Utils.saveToken(data.token);
                    Utils.saveUserData(data); // Salva dados do usuário (sem senha/token)

                    // Redireciona para a dashboard correta
                    if (data.tipo === 'aluno') {
                        window.location.href = 'dashboard_aluno.html';
                    } else if (data.tipo === 'professor') {
                        window.location.href = 'dashboard_professor.html';
                    } else {
                        // Fallback se o tipo for inesperado
                        console.warn("Tipo de usuário desconhecido:", data.tipo);
                        Utils.showMessage('Login bem-sucedido, mas tipo de usuário desconhecido.', 'info');
                        // Poderia redirecionar para uma página genérica ou index
                         window.location.href = '../index.html';
                    }
                } else {
                     throw new Error("Resposta inválida do servidor após login.");
                }

            } catch (error) {
                console.error("Erro no login:", error);
                Utils.showMessage(error.message || 'Falha no login. Verifique suas credenciais.');
            } finally {
                Utils.hideLoading();
                 if(loginButton) loginButton.disabled = false;
            }
        });
    }

    // --- Cadastro ---
    if (cadastroForm) {
        const tipoSelect = document.getElementById('tipo');
        const professorFields = document.getElementById('professor-fields');
        const alunoFields = document.getElementById('aluno-fields');
        const disciplinasInput = document.getElementById('disciplinas');
        const turmaInput = document.getElementById('turma');

        // Mostra/esconde campos condicionais
        tipoSelect.addEventListener('change', () => {
            const tipo = tipoSelect.value;
            professorFields.style.display = tipo === 'professor' ? 'block' : 'none';
            alunoFields.style.display = tipo === 'aluno' ? 'block' : 'none';
            // Define required dinamicamente (ou valida no submit)
            if(disciplinasInput) disciplinasInput.required = (tipo === 'professor');
            if(turmaInput) turmaInput.required = (tipo === 'aluno');
        });


        cadastroForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            Utils.clearMessage();
            Utils.showLoading();
             const registerButton = document.getElementById('register-button');
            if(registerButton) registerButton.disabled = true;


            const userData = {
                nome: cadastroForm.nome.value.trim(),
                email: cadastroForm.email.value.trim(),
                senha: cadastroForm.senha.value.trim(),
                tipo: 'aluno',
                turma: cadastroForm.turma.value.trim()
            };

            // Validação simples extra (poderia ser mais robusta)
            if (userData.tipo === 'professor' && !userData.disciplinas) {
                 Utils.showMessage('Por favor, informe as disciplinas que leciona.');
                 Utils.hideLoading();
                 if(registerButton) registerButton.disabled = false;
                 return;
            }
             if (userData.tipo === 'aluno' && !userData.turma) {
                 Utils.showMessage('Por favor, informe sua turma.');
                 Utils.hideLoading();
                 if(registerButton) registerButton.disabled = false;
                 return;
            }


            try {
                const data = await Api.register(userData);

                if (data && data.token && data._id) {
                    // Cadastro bem-sucedido! Informa o usuário e redireciona para login
                     Utils.showMessage('Cadastro realizado com sucesso! Você será redirecionado para o login.', 'success');
                     // Ou salva o token/dados e redireciona direto pra dashboard:
                     // Utils.saveToken(data.token);
                     // Utils.saveUserData(data);
                     // Redirecionar para dashboard (exemplo abaixo)

                    // Espera um pouco para o usuário ver a mensagem e redireciona
                    setTimeout(() => {
                        window.location.href = 'login.html';

                        /* // Redirecionamento direto para dashboard (alternativa)
                         if (data.tipo === 'aluno') {
                             window.location.href = 'dashboard_aluno.html';
                         } else if (data.tipo === 'professor') {
                             window.location.href = 'dashboard_professor.html';
                         } else {
                             window.location.href = '../index.html';
                         }
                         */
                    }, 2500); // Espera 2.5 segundos

                } else {
                     throw new Error("Resposta inválida do servidor após cadastro.");
                }

            } catch (error) {
                console.error("Erro no cadastro:", error);
                Utils.showMessage(error.message || 'Falha no cadastro. Verifique os dados ou tente outro email.');
                 Utils.hideLoading(); // Esconde loading no erro
                 if(registerButton) registerButton.disabled = false; // Reabilita botão no erro
            }
             // Não esconder loading aqui se for redirecionar com sucesso
        });
    }
});