const User = require('../models/User');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const registerUser = async (req, res, next) => {
    const { nome, email, senha, tipo, disciplinas, turma } = req.body;

    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'Usuário com este email já existe' });
        }

        const user = await User.create({
            nome,
            email,
            senha,
            tipo,
            disciplinas: tipo === 'professor' ? disciplinas?.split(',').map(d => d.trim()).filter(Boolean) : undefined, // Processa disciplinas
            turma: tipo === 'aluno' ? turma : undefined,
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                nome: user.nome,
                email: user.email,
                tipo: user.tipo,
                turma: user.turma,
                disciplinas: user.disciplinas,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Dados inválidos para criação do usuário' });
        }
    } catch (error) {
        next(error);
    }
};

const loginUser = async (req, res, next) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
         return res.status(400).json({ message: 'Por favor, forneça email e senha' });
    }

    try {
        const user = await User.findOne({ email }).select('+senha');

        if (user && (await user.matchPassword(senha))) {
            res.json({
                _id: user._id,
                nome: user.nome,
                email: user.email,
                tipo: user.tipo,
                turma: user.turma,
                disciplinas: user.disciplinas,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Email ou senha inválidos' });
        }
    } catch (error) {
        next(error);
    }
};

const getMe = async (req, res, next) => {

    if (req.user) {
         res.status(200).json(req.user);
    } else {
         res.status(401).json({ message: 'Usuário não encontrado ou não autorizado' });
    }

};


module.exports = {
    registerUser,
    loginUser,
    getMe
};