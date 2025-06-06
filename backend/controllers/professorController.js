const User = require('../models/User'); // Assumindo que professores são 'Users' com tipo 'professor'
const bcrypt = require('bcryptjs');

// @desc    Cadastrar um novo professor
// @route   POST /api/admin/professores
// @access  Private/Admin
const createProfessor = async (req, res) => {
    const { nome, email, senha, disciplinas } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({ message: 'Por favor, preencha nome, email e senha.' });
    }

    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'Um usuário com este email já existe.' });
        }

        // Criptografar a senha
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        const professor = await User.create({
            nome,
            email,
            senha: senhaHash,
            tipo: 'professor', // Define o tipo como professor
            disciplinas: disciplinas ? disciplinas.split(',').map(d => d.trim()) : [],
            isActive: true
        });

        if (professor) {
            res.status(201).json({
                _id: professor._id,
                nome: professor.nome,
                email: professor.email,
                tipo: professor.tipo,
                disciplinas: professor.disciplinas,
            });
        } else {
            res.status(400).json({ message: 'Dados inválidos para criar professor.' });
        }
    } catch (error) {
        console.error('Erro ao criar professor:', error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
};

// @desc    Listar todos os professores
// @route   GET /api/admin/professores
// @access  Private/Admin
const getProfessores = async (req, res) => {
    try {
        // Encontra todos os usuários cujo tipo é 'professor'
        const professores = await User.find({ tipo: 'professor' }).select('-senha');
        res.json(professores);
    } catch (error) {
        console.error('Erro ao buscar professores:', error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
};

// @desc    Obter um professor por ID
// @route   GET /api/admin/professores/:id
// @access  Private/Admin
const getProfessorById = async (req, res) => {
    try {
        const professor = await User.findById(req.params.id).select('-senha');

        if (professor && professor.tipo === 'professor') {
            res.json(professor);
        } else {
            res.status(404).json({ message: 'Professor não encontrado.' });
        }
    } catch (error) {
        console.error('Erro ao buscar professor por ID:', error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
};

// @desc    Atualizar um professor
// @route   PUT /api/admin/professores/:id
// @access  Private/Admin
const updateProfessor = async (req, res) => {
    try {
        const professor = await User.findById(req.params.id);

        if (professor && professor.tipo === 'professor') {
            professor.nome = req.body.nome || professor.nome;
            professor.email = req.body.email || professor.email;
            professor.isActive = req.body.isActive !== undefined ? req.body.isActive : professor.isActive;
            if (req.body.disciplinas) {
                 professor.disciplinas = req.body.disciplinas.split(',').map(d => d.trim());
            }

            // Se uma nova senha for fornecida, atualize-a
            if (req.body.senha) {
                const salt = await bcrypt.genSalt(10);
                professor.senha = await bcrypt.hash(req.body.senha, salt);
            }

            const updatedProfessor = await professor.save();
            res.json(updatedProfessor);
        } else {
            res.status(404).json({ message: 'Professor não encontrado.' });
        }
    } catch (error) {
        console.error('Erro ao atualizar professor:', error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
};

// @desc    Deletar um professor
// @route   DELETE /api/admin/professores/:id
// @access  Private/Admin
const deleteProfessor = async (req, res) => {
    try {
        const professor = await User.findById(req.params.id);
        if (professor && professor.tipo === 'professor') {
            await professor.deleteOne(); // ou .remove() em versões mais antigas do mongoose
            res.json({ message: 'Professor removido com sucesso.' });
        } else {
            res.status(404).json({ message: 'Professor não encontrado.' });
        }
    } catch (error) {
        console.error('Erro ao deletar professor:', error);
        res.status(500).json({ message: 'Erro no servidor.' });
    }
};


module.exports = {
    createProfessor,
    getProfessores,
    getProfessorById,
    updateProfessor,
    deleteProfessor,
};