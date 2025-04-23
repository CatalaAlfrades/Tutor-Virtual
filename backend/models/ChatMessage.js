// backend/models/ChatMessage.js
const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  user: { // ID do usuário que enviou ou recebeu a mensagem
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Referência ao modelo User
      required: true,
      index: true // Indexado para buscar histórico por usuário
  },
  role: { // Quem disse (usuário ou IA)
      type: String,
      enum: ['user', 'model'], // Usar 'model' como no Gemini API
      required: true
  },
  content: { // O conteúdo da mensagem
      type: String,
      required: true,
      trim: true
  },
  createdAt: { // Data/hora da mensagem
      type: Date,
      default: Date.now,
      index: true // Indexado para ordenar e filtrar por data
  }
}, {
  // Timestamps default (createdAt/updatedAt) não são necessários aqui,
  // pois já temos o createdAt específico da mensagem.
  timestamps: false
});

// Índice composto para buscas comuns: histórico de um usuário ordenado por data
chatMessageSchema.index({ user: 1, createdAt: -1 });

// Índice de TEXTO para permitir busca por palavra-chave no conteúdo
// ATENÇÃO: Só pode haver UM índice de texto por coleção.
// Se você precisar de busca textual em outros campos, precisará de estratégias diferentes.
chatMessageSchema.index({ content: 'text' });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);