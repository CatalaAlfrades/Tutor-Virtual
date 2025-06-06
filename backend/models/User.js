const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: [true, 'O nome é obrigatório.'],
    },
    email: {
        type: String,
        required: [true, 'O email é obrigatório.'],
        unique: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Por favor, insira um email válido.',
        ],
    },
    senha: {
        type: String,
        required: [true, 'A senha é obrigatória.'],
        minlength: 6,
        select: false, // Não retorna a senha em queries por padrão
    },
    tipo: {
        type: String,
        enum: ['aluno', 'professor', 'admin'],
        required: [true, 'O tipo de usuário é obrigatório.'],
        default: 'aluno',
    },
    turma: {
        type: String,
        // Só é obrigatório se o tipo for 'aluno'
        required: function() { return this.tipo === 'aluno'; },
    },
    disciplinas: [{
        type: String,
    }],
    isActive: {
        type: Boolean,
        default: true,
    },
    lastLogin: {
        type: Date,
    },
}, {
    timestamps: true, // Adiciona createdAt e updatedAt
});

// Middleware (hook) que é executado ANTES de salvar o documento
userSchema.pre('save', async function(next) {
    // Só encripta a senha se ela foi modificada (ou é nova)
    if (!this.isModified('senha')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.senha = await bcrypt.hash(this.senha, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Método para comparar a senha fornecida com a senha encriptada na DB
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.senha);
};

const User = mongoose.model('User', userSchema);

module.exports = User;