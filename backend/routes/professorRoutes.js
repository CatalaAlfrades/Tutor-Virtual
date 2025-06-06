const express = require('express');
const router = express.Router();
const {
    createProfessor,
    getProfessores,
    getProfessorById,
    updateProfessor,
    deleteProfessor
} = require('../controllers/professorController');

// Importa os middlewares de proteção
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Define as rotas e aplica os middlewares de proteção
// Todas as rotas aqui exigem que o usuário esteja logado (protect)
// E que o usuário seja um administrador (isAdmin)

// Rota para criar um professor e listar todos os professores
// GET /api/admin/professores -> Lista todos
// POST /api/admin/professores -> Cria um novo
router.route('/professores')
    .post(protect, isAdmin, createProfessor)
    .get(protect, isAdmin, getProfessores);

// Rota para atualizar e deletar um professor específico por ID
// PUT /api/admin/professores/:id -> Atualiza
// DELETE /api/admin/professores/:id -> Deleta
router.route('/professores/:id')
    .get(protect, isAdmin, getProfessorById)
    .put(protect, isAdmin, updateProfessor)
    .delete(protect, isAdmin, deleteProfessor);

module.exports = router;