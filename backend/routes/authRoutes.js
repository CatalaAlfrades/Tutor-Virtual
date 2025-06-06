const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Rotas PÚBLICAS
router.post('/register', registerUser);
router.post('/login', loginUser); // Rota única para todos os logins

// Rota PROTEGIDA
router.get('/me', protect, getMe);

module.exports = router;