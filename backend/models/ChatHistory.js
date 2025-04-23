// models/ChatHistory.js
const mongoose = require('mongoose');

// Define o schema para uma única mensagem na conversa
const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'model'], // Papéis válidos para a API Gemini
        required: true
    },
    parts: [{ // Array de partes da mensagem (a API espera isso)
        text: {
            type: String,
            required: true
        }
    }]
}, {
    _id: false, // Não cria IDs separados para cada mensagem
    timestamps: false // NÃO adiciona createdAt/updatedAt às mensagens individuais
    // A API Gemini rejeita campos extras como timestamps dentro das mensagens do histórico
});

// Define o schema principal do histórico de chat
const chatHistorySchema = new mongoose.Schema({
    userId: { // ID do usuário dono deste histórico
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User', // Referência ao modelo User
        index: true // Indexado para busca rápida
    },
    messages: [messageSchema], // Array contendo as mensagens da conversa
    lastInteraction: { // Data da última interação para possível limpeza futura
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true // Adiciona createdAt/updatedAt ao documento de histórico GERAL
});

// Cria o índice composto para otimizar a busca e atualização
chatHistorySchema.index({ userId: 1, lastInteraction: -1 });

const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);

module.exports = ChatHistory;