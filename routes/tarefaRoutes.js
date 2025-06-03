// routes/tarefaRoutes.js
const express = require('express');
const Tarefa = require('../models/Tarefa');
const verificarToken = require('../middlewares/authMiddleware');

const router = express.Router();

// Criar tarefa (professor)
router.post('/', verificarToken, async (req, res) => {
  try {
    const { tipo, _id } = req.user;
    if (tipo !== 'professor') {
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    const { titulo, descricao, dataEntrega, aluno } = req.body;

    const novaTarefa = new Tarefa({
      titulo,
      descricao,
      dataEntrega,
      aluno,
      professor: _id,
      ativo: true
    });

    await novaTarefa.save();
    res.status(201).json(novaTarefa);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar tarefa' });
  }
});

// Listar tarefas do aluno
router.get('/minhas', verificarToken, async (req, res) => {
  try {
    const { tipo, _id } = req.user;
    if (tipo !== 'aluno') {
      return res.status(403).json({ erro: 'Apenas alunos podem acessar suas tarefas' });
    }

    const tarefas = await Tarefa.find({ aluno: _id, ativo: true }).populate('professor', 'nome');
    res.json(tarefas);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar tarefas' });
  }
});

// Listar tarefas do professor
router.get('/professor', verificarToken, async (req, res) => {
  try {
    const { tipo, _id } = req.user;
    if (tipo !== 'professor') {
      return res.status(403).json({ erro: 'Apenas professores podem acessar suas tarefas' });
    }

    const tarefas = await Tarefa.find({ professor: _id, ativo: true }).populate('aluno', 'nome');
    res.json(tarefas);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar tarefas' });
  }
});

// Editar tarefa (professor)
router.put('/:id', verificarToken, async (req, res) => {
  try {
    const { tipo, _id } = req.user;
    if (tipo !== 'professor') {
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    const tarefa = await Tarefa.findById(req.params.id);
    if (!tarefa || !tarefa.ativo) {
      return res.status(404).json({ erro: 'Tarefa não encontrada' });
    }
    if (tarefa.professor.toString() !== _id.toString()) {
      return res.status(403).json({ erro: 'Você só pode editar suas próprias tarefas' });
    }

    const { titulo, descricao, dataEntrega, aluno } = req.body;
    if (titulo !== undefined) tarefa.titulo = titulo;
    if (descricao !== undefined) tarefa.descricao = descricao;
    if (dataEntrega !== undefined) tarefa.dataEntrega = dataEntrega;
    if (aluno !== undefined) tarefa.aluno = aluno;

    await tarefa.save();
    res.json(tarefa);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao editar tarefa' });
  }
});

// Excluir tarefa (soft delete)
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const { tipo, _id } = req.user;
    if (tipo !== 'professor') {
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    const tarefa = await Tarefa.findById(req.params.id);
    if (!tarefa || !tarefa.ativo) {
      return res.status(404).json({ erro: 'Tarefa não encontrada' });
    }
    if (tarefa.professor.toString() !== _id.toString()) {
      return res.status(403).json({ erro: 'Você só pode excluir suas próprias tarefas' });
    }

    tarefa.ativo = false;
    await tarefa.save();
    res.json({ mensagem: 'Tarefa excluída com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao excluir tarefa' });
  }
});

module.exports = router;
