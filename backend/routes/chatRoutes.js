// backend/routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { processChatMessage, getChatHistory } = require('../controllers/chatController'); // Importa ambas

// Rota para enviar mensagem (POST) - Protegida
router.post('/', protect, processChatMessage);

// *** NOVA ROTA para buscar histórico (GET) - Protegida ***
router.get('/history', protect, getChatHistory);

module.exports = router;