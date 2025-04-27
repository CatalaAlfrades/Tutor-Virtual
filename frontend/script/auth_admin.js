document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cadastro-professor-form');
    const ADMIN_CODE = "IPIZ2024@ADMIN"; // Código estático (altere conforme necessidade)

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            Utils.clearMessage();
            Utils.showLoading();
            
            const adminCode = form.querySelector('#codigo-admin').value.trim();
            if (adminCode !== ADMIN_CODE) {
                Utils.showMessage('Código administrativo inválido!', 'error');
                Utils.hideLoading();
                return;
            }

            const userData = {
                nome: form.nome.value.trim(),
                email: form.email.value.trim(),
                senha: form.senha.value.trim(),
                tipo: 'professor',
                disciplinas: form.disciplinas.value.trim()
            };

            try {
                const data = await Api.register(userData);
                if (data && data.token) {
                    Utils.showMessage('Professor cadastrado com sucesso! Redirecionando...', 'success');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                }
            } catch (error) {
                Utils.showMessage(error.message || 'Erro no cadastro do professor');
            } finally {
                Utils.hideLoading();
            }
        });
    }
});