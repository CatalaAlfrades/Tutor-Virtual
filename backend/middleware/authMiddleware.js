const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Precisamos do modelo User para utilizadores normais
require('dotenv').config();

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 1. Extrair o token
            token = req.headers.authorization.split(' ')[1];

            // 2. Verificar e decodificar o token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. --- LÓGICA ALTERADA AQUI ---
            // Verificamos se o token é de um administrador pelo 'id' ou 'tipo'
            if (decoded.id === 'admin_user_01' && decoded.tipo === 'admin') {
                // É o administrador!
                // Criamos um objeto `req.user` manualmente para ele.
                // Não precisamos de ir à base de dados.
                req.user = {
                    _id: decoded.id,
                    nome: 'Administrador',
                    tipo: 'admin',
                    // Adicionamos isActive=true para passar no middleware isActiveUser, se usado.
                    isActive: true 
                };
                
                // Passa para o próximo middleware (ex: isAdmin)
                return next(); 
            }
            
            // 4. Se não for o admin, é um utilizador normal (aluno/professor).
            // Procuramos na base de dados, como antes.
            req.user = await User.findById(decoded.id).select('-senha');

            if (!req.user) {
                 return res.status(401).json({ message: 'Não autorizado, usuário do token não foi encontrado.' });
            }
            
            // Opcional, mas boa prática: atualizar último login
            // Pode ser removido se causar lentidão.
            await User.findByIdAndUpdate(req.user._id, { lastLogin: new Date() });

            // Passa para o próximo middleware
            next();

        } catch (error) {
            console.error('Erro na autenticação do token:', error.message);
             if (error.name === 'JsonWebTokenError') {
                 return res.status(401).json({ message: 'Não autorizado, token inválido.' });
             }
             if (error.name === 'TokenExpiredError') {
                 return res.status(401).json({ message: 'Não autorizado, token expirado.' });
             }
            res.status(401).json({ message: 'Não autorizado, falha na verificação do token.' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Não autorizado, token não fornecido.' });
    }
};


// Os outros middlewares (isProfessor, isAluno, isAdmin, etc.) permanecem exatamente iguais.
// Eles funcionam corretamente pois dependem do objeto `req.user` que o `protect` cria.

const isProfessor = (req, res, next) => {
    if (req.user && req.user.tipo === 'professor') {
        next();
    } else {
        res.status(403).json({ message: 'Acesso negado. Rota apenas para professores.' });
    }
};

const isAluno = (req, res, next) => {
    if (req.user && req.user.tipo === 'aluno') {
        next();
    } else {
        res.status(403).json({ message: 'Acesso negado. Rota apenas para alunos.' });
    }
};

const isAdmin = (req, res, next) => {
    // Este middleware agora funcionará para o admin!
    if (req.user && req.user.tipo === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Acesso negado. Rota apenas para administradores.' });
    }
};

const isAdminOrProfessor = (req, res, next) => {
    if (req.user && (req.user.tipo === 'admin' || req.user.tipo === 'professor')) {
        next();
    } else {
        res.status(403).json({ message: 'Acesso negado. Rota apenas para administradores ou professores.' });
    }
};

const isActiveUser = (req, res, next) => {
    if (req.user && req.user.isActive) {
        next();
    } else {
        res.status(403).json({ message: 'Conta desativada. Entre em contato com o administrador.' });
    }
};

module.exports = { 
    protect, 
    isProfessor, 
    isAluno, 
    isAdmin, 
    isAdminOrProfessor,
    isActiveUser 
};