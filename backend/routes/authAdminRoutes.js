const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

/**
 * @route   POST /api/admin/login
 * @desc    Autentica o administrador e retorna o token
 * @access  Public
 */
router.post('/login', (req, res) => {
    try {
        const { email, senha } = req.body;

        // CRUCIAL: Busca as credenciais do arquivo de ambiente (.env)
        // Isso evita que senhas fiquem expostas no código.
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        // Validação das credenciais
        if (!adminEmail || !adminPassword) {
            console.error('Credenciais de administrador não configuradas no arquivo .env');
            return res.status(500).json({ message: 'Erro de configuração do servidor.' });
        }

        if (email !== adminEmail || senha !== adminPassword) {
            return res.status(401).json({ message: 'Credenciais de administrador inválidas.' });
        }

        // Se as credenciais estiverem corretas, cria o payload do token
        const payload = {
            id: 'admin_user_01', // Um ID estático para o admin, ou use um UUID
            nome: 'Administrador',
            tipo: 'admin' // O tipo é o mais importante para o frontend!
        };

        // Gera o token JWT usando o segredo do .env
        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '3h' } // Sessão mais curta para admin por segurança
        );

        // Retorna a resposta de sucesso com o token e os dados do usuário
        res.status(200).json({
            token,
            user: {
                nome: payload.nome,
                tipo: payload.tipo,
                email: adminEmail
            }
        });

    } catch (error) {
        console.error('Erro no endpoint de login de admin:', error);
        res.status(500).json({ message: 'Ocorreu um erro interno ao tentar fazer o login.' });
    }
});

module.exports = router;