const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: [true, 'Nome é obrigatório'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email é obrigatório'],
        unique: true,
        lowercase: true,
        match: [/.+\@.+\..+/, 'Por favor, use um email válido'],
    },
    senha: {
        type: String,
        required: [true, 'Senha é obrigatória'],
        minlength: [6, 'Senha deve ter no mínimo 6 caracteres'],
        select: false,
    },
    tipo: {
        type: String,
        required: true,
        enum: ['aluno', 'professor'],
    },
    disciplinas: {
        type: [String],
        required: function() { return this.tipo === 'professor'; }, 
        default: undefined 
    },
    turma: {
        type: String,
        trim: true,
        required: function() { return this.tipo === 'aluno'; }, 
    },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
    if (!this.isModified('senha')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.senha = await bcrypt.hash(this.senha, salt);
    next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.senha);
};

const User = mongoose.model('User', userSchema);

module.exports = User;