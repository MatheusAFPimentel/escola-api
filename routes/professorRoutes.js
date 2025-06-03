const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const Turma = require('../models/Turma');

// Middleware para verificar se é professor
const isProfessor = (req, res, next) => {
  if (req.user.tipo !== 'professor') {
    return res.status(403).json({
      status: 'error',
      message: 'Acesso negado. Apenas professores podem acessar este recurso.'
    });
  }
  next();
};

// Listar turmas do professor
router.get('/turmas', auth, isProfessor, async (req, res) => {
  try {
    const turmas = await Turma.find({ 
      professor: req.user._id,
      ativo: true 
    }).populate('alunos', 'nome email');

    res.json({
      status: 'success',
      data: turmas
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Criar nova turma
router.post('/turmas', auth, isProfessor, async (req, res) => {
  try {
    const turma = await Turma.create({
      ...req.body,
      professor: req.user._id
    });

    res.status(201).json({
      status: 'success',
      data: turma
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Atualizar turma
router.put('/turmas/:id', auth, isProfessor, async (req, res) => {
  try {
    const turma = await Turma.findOneAndUpdate(
      { 
        _id: req.params.id,
        professor: req.user._id,
        ativo: true
      },
      req.body,
      { new: true }
    );

    if (!turma) {
      return res.status(404).json({
        status: 'error',
        message: 'Turma não encontrada'
      });
    }

    res.json({
      status: 'success',
      data: turma
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Adicionar alunos à turma
router.post('/turmas/:id/alunos', auth, isProfessor, async (req, res) => {
  try {
    const turma = await Turma.findOne({ 
      _id: req.params.id,
      professor: req.user._id,
      ativo: true
    });

    if (!turma) {
      return res.status(404).json({
        status: 'error',
        message: 'Turma não encontrada'
      });
    }

    // Adiciona novos alunos (evita duplicatas)
    const novosAlunos = req.body.alunos.filter(
      aluno => !turma.alunos.includes(aluno)
    );
    turma.alunos.push(...novosAlunos);
    
    await turma.save();

    res.json({
      status: 'success',
      data: turma
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Remover alunos da turma
router.delete('/turmas/:id/alunos', auth, isProfessor, async (req, res) => {
  try {
    const turma = await Turma.findOne({ 
      _id: req.params.id,
      professor: req.user._id,
      ativo: true
    });

    if (!turma) {
      return res.status(404).json({
        status: 'error',
        message: 'Turma não encontrada'
      });
    }

    turma.alunos = turma.alunos.filter(
      aluno => !req.body.alunos.includes(aluno.toString())
    );
    
    await turma.save();

    res.json({
      status: 'success',
      data: turma
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;
