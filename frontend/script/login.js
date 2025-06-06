document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const messageArea = document.getElementById('message-area');


  if (localStorage.getItem('loggedOut') === 'true') {
    Utils.showMessage('Você saiu do painel com sucesso.', 'success');
    localStorage.removeItem('loggedOut');
  }
  
  // Limpa mensagens antigas ao exibir a página
  Utils.clearMessage();

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    Utils.clearMessage();          // limpa mensagem anterior
    Utils.showLoading();           // opcional: exibe spinner/overlay

    const email = loginForm.email.value.trim();
    const senha = loginForm.senha.value.trim();

    try {
      // Chama API de login (supondo que Api.login faça POST /auth/login)
      const data = await Api.login({ email, senha });

      // Se chegou até aqui, credenciais estão corretas:
      // 1) Armazena token e userData
      Utils.saveToken(data.token);
      Utils.saveUserData(data.usuario);

      // 2) Mensagem de sucesso
      Utils.showMessage('Login efetuado com sucesso!', 'success');

      // 3) Aguarda um breve momento para permitir que o usuário veja a mensagem
      setTimeout(() => {
        // Redireciona para o painel de admin (ou outra rota)
        window.location.href = 'admin_dashboard.html';
      }, 800);

    } catch (error) {
      // Se a API retornar 401 (credenciais inválidas) ou outro erro, cai aqui
      console.error('Erro no login:', error);
      // Mostra mensagem de erro plausível
      Utils.showMessage(
        error.message === 'Usuário ou senha inválidos'
          ? 'E-mail ou senha incorretos. Tente novamente.'
          : `Falha ao entrar: ${error.message}`,
        'error'
      );
    } finally {
      Utils.hideLoading();
    }
  });
});
