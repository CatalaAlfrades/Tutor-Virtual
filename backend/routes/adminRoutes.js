const express = require('express');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const User = require('../models/User');
const router = express.Router();

// 1) Listar todos os professores
//    GET /api/admin/professores
//    Private/Admin
router.get('/professores', protect, isAdmin, async (req, res, next) => {
  try {
    const professores = await User.find({ tipo: 'professor' }).select('-senha');
    res.json(professores);
  } catch (error) {
    next(error);
  }
});

// 2) Obter um único professor (por ID)
//    GET /api/admin/professores/:id
//    Private/Admin
router.get('/professores/:id', protect, isAdmin, async (req, res, next) => {
  try {
    const professor = await User.findById(req.params.id).select('-senha');
    if (!professor) {
      return res.status(404).json({ message: 'Professor não encontrado' });
    }
    res.json(professor);
  } catch (error) {
    next(error);
  }
});

// 3) Criar novo professor
//    POST /api/admin/professores
//    Private/Admin
router.post('/professores', protect, isAdmin, async (req, res, next) => {
  try {
    const { nome, email, senha, disciplinas } = req.body;
    const existe = await User.findOne({ email });
    if (existe) {
      return res.status(400).json({ message: 'E-mail já cadastrado' });
    }
    const novoProf = await User.create({
      nome,
      email,
      senha,
      tipo: 'professor',
      disciplinas: disciplinas.split(',').map(d => d.trim()),
    });
    // Retorna sem senha
    const { senha: _, ...profSemSenha } = novoProf.toObject();
    res.status(201).json(profSemSenha);
  } catch (error) {
    next(error);
  }
});

// 4) Atualizar dados do professor (exceto senha)
//    PUT /api/admin/professores/:id
//    Private/Admin
router.put('/professores/:id', protect, isAdmin, async (req, res, next) => {
  try {
    const professor = await User.findById(req.params.id);
    if (!professor) {
      return res.status(404).json({ message: 'Professor não encontrado' });
    }
    const { nome, email, disciplinas, isActive } = req.body;
    professor.nome = nome ?? professor.nome;
    professor.email = email ?? professor.email;
    professor.disciplinas = disciplinas
      ? disciplinas.split(',').map(d => d.trim())
      : professor.disciplinas;
    if (typeof isActive === 'boolean') {
      professor.isActive = isActive;
    }
    const atualizado = await professor.save();
    const { senha: _, ...profSemSenha } = atualizado.toObject();
    res.json(profSemSenha);
  } catch (error) {
    next(error);
  }
});

// 5) Atualizar senha do professor
//    PUT /api/admin/professores/:id/senha
//    Private/Admin
router.put('/professores/:id/senha', protect, isAdmin, async (req, res, next) => {
  try {
    const professor = await User.findById(req.params.id);
    if (!professor) {
      return res.status(404).json({ message: 'Professor não encontrado' });
    }
    professor.senha = req.body.senha; // no model deve haver middleware pre('save') para hashear
    await professor.save();
    res.json({ message: 'Senha atualizada com sucesso' });
  } catch (error) {
    next(error);
  }
});

// 6) Remover professor
//    DELETE /api/admin/professores/:id
//    Private/Admin
router.delete('/professores/:id', protect, isAdmin, async (req, res, next) => {
  try {
    const professor = await User.findById(req.params.id);
    if (!professor) {
      return res.status(404).json({ message: 'Professor não encontrado' });
    }
    await professor.remove();
    res.json({ message: 'Professor removido com sucesso' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;