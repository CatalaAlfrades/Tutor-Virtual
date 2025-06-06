// Atualizar o authController para incluir autenticação administrativa
const User = require('../models/User');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateToken = (user) => {
    // CRÍTICO: O payload deve conter todos os dados que o frontend precisa
    // para identificar o usuário sem ter que fazer outra chamada à API.
    const payload = {
        id: user._id,
        nome: user.nome,
        tipo: user.tipo // Certifique-se de que 'user.tipo' tem um valor!
    };
    
    // LOG para ver o que está a ser colocado no token
    console.log('[generateToken] Payload sendo assinado:', payload);

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: user.tipo === 'admin' ? '3h' : '30d',
    });
};

const registerUser = async (req, res, next) => {
    const { nome, email, senha, tipo, disciplinas, turma } = req.body;

    try {
        // Verificar se o email já existe
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'Usuário com este email já existe' });
        }

        // Validação adicional para turma
        if (tipo === 'aluno' && turma) {
            const turmaRegex = /^[A-Za-z]+[0-9]+[A-Za-z]+$/;
            if (!turmaRegex.test(turma)) {
                return res.status(400).json({ 
                    message: 'Formato de turma inválido. Use o padrão: letras+números+letras (Ex: TI10AD)',
                    field: 'turma'
                });
            }
        }

        // Criar usuário (apenas alunos via API pública)
        if (tipo !== 'aluno') {
            return res.status(403).json({ 
                message: 'Cadastro não autorizado. Apenas alunos podem se cadastrar por esta rota.' 
            });
        }

        const user = await User.create({
            nome,
            email,
            senha,
            tipo: 'aluno', // Forçar tipo aluno para segurança
            turma
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                nome: user.nome,
                email: user.email,
                tipo: user.tipo,
                turma: user.turma,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Dados inválidos para criação do usuário' });
        }
    } catch (error) {
        // Tratamento específico para erros de validação do Mongoose
        if (error.name === 'ValidationError') {
            const messages = {};
            for (const field in error.errors) {
                messages[field] = error.errors[field].message;
            }
            return res.status(400).json({ 
                message: 'Erro de validação', 
                errors: messages 
            });
        }
        next(error);
    }
};

const loginUser = async (req, res, next) => {
    const { email, senha } = req.body;
    console.log(`[LOGIN] Tentativa de login para o email: ${email}`);

    if (!email || !senha) {
         return res.status(400).json({ message: 'Por favor, forneça email e senha' });
    }

    try {
        // Passo 1: Encontrar o usuário e garantir que a senha seja incluída
        console.log('[LOGIN] Passo 1: Procurando usuário na DB...');
        const user = await User.findOne({ email }).select('+senha');

        if (!user) {
            console.log('[LOGIN] Resultado: Usuário não encontrado.');
            return res.status(401).json({ message: 'Email ou senha inválidos' });
        }
        
        console.log(`[LOGIN] Resultado: Usuário ${user.email} encontrado.`);
        console.log(`[LOGIN] Hash da senha na DB: ${user.senha}`); // Isto deve mostrar um hash longo

        // Passo 2: Comparar a senha
        console.log('[LOGIN] Passo 2: Comparando a senha fornecida com o hash...');
        const isMatch = await user.matchPassword(senha);

        console.log(`[LOGIN] Resultado da comparação (isMatch): ${isMatch}`); // Isto DEVE ser 'true'

        if (!isMatch) {
            console.log('[LOGIN] Conclusão: As senhas não correspondem.');
            return res.status(401).json({ message: 'Email ou senha inválidos' });
        }
        
        console.log('[LOGIN] Conclusão: As senhas correspondem!');
        
        // Passo 3: Verificar se a conta está ativa
        if (!user.isActive) {
            console.log('[LOGIN] Conclusão: Conta desativada.');
            return res.status(403).json({ message: 'Conta desativada. Entre em contato com o administrador.' });
        }
        
        console.log('[LOGIN] Conclusão: Conta ativa. Gerando token...');
        
        // ... (resto da sua lógica para gerar token e enviar a resposta)
        const token = generateToken(user);
        
        const responsePayload = {
            token,
            user: {
                _id: user._id,
                nome: user.nome,
                email: user.email,
                tipo: user.tipo, // Verificando o valor de user.tipo
                turma: user.turma,
                disciplinas: user.disciplinas
            }
        };

        // ==========================================================
        // LOG DE DEPURAÇÃO CRÍTICO - ADICIONE ESTA LINHA
        // ==========================================================
        console.log('[loginUser] Enviando a seguinte resposta para o frontend:', JSON.stringify(responsePayload, null, 2));

        res.json(responsePayload);

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

// Função para criar o admin inicial (usado na inicialização do servidor)
const createInitialAdmin = async () => {
    try {
        const adminExists = await User.findOne({ email: 'admin@tutorvirtual.com' });
        
        if (!adminExists) {
            // AQUI ESTÁ O PROBLEMA
            await User.create({
                nome: 'Administrador',
                email: 'admin@tutorvirtual.com',
                senha: 'admin123', // Senha em texto simples
                tipo: 'admin'
            });
            console.log('Administrador inicial criado com sucesso');
        }
    } catch (error) {
        console.error('Erro ao criar administrador inicial:', error);
    }
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
    createInitialAdmin
};
