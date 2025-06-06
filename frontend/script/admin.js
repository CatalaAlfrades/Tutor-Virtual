document.addEventListener('DOMContentLoaded', () => {
    // Verificação de acesso administrativo unificado
    const isAdminPage = window.location.pathname.includes('admin_');
    
    if (isAdminPage) {
        const token = Utils.getToken();
        const userData = Utils.getUserData();
        
        if (!token || !userData || userData.tipo !== 'admin') {
            window.location.href = 'login.html';
        }
    }

    // -----------------------------
  // Parte nova: CONFIRMAR LOGOUT
  // -----------------------------
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Janela de confirmação
      const confirmar = confirm('Tem certeza que deseja sair do painel de administração?');
      if (confirmar) {
        Utils.logout(); // remove token + userData e redireciona para login.html
      }
    });
  }

});