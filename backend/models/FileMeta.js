// models/FileMeta.js
const mongoose = require('mongoose');

const fileMetaSchema = new mongoose.Schema({
    originalName: { type: String, required: true, trim: true },
    serverFilename: { type: String, required: true, unique: true }, // Nome único no disco
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' }, // Ligação com usuário
    title: { type: String, trim: true, index: true }, // Indexado para busca
    description: { type: String, trim: true, index: true }, // Indexado para busca
    // --- CAMPO DISCIPLINA ADICIONADO ---
    disciplina: { type: String, trim: true, index: true }, // Indexado para busca/agrupamento
    // ----------------------------------
    metadataComplete: { type: Boolean, default: false, index: true }, // Indexado para filtrar finalizados
}, {
    timestamps: true // Adiciona createdAt e updatedAt automaticamente
});

// Índices podem ajudar na performance das buscas
fileMetaSchema.index({ uploadedBy: 1 });
// fileMetaSchema.index({ disciplina: 1, title: 1 }); // Exemplo índice composto

const FileMeta = mongoose.model('FileMeta', fileMetaSchema);

module.exports = FileMeta;