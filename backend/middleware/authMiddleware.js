const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select('-senha');

            if (!req.user) {
                 return res.status(401).json({ message: 'Não autorizado, usuário não encontrado' });
            }

            next();
        } catch (error) {
            console.error('Erro na autenticação do token:', error.message);
             if (error.name === 'JsonWebTokenError') {
                 return res.status(401).json({ message: 'Não autorizado, token inválido' });
             }
             if (error.name === 'TokenExpiredError') {
                 return res.status(401).json({ message: 'Não autorizado, token expirado' });
             }
            res.status(401).json({ message: 'Não autorizado, falha no token' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Não autorizado, token não fornecido' });
    }
};

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


module.exports = { protect, isProfessor, isAluno };