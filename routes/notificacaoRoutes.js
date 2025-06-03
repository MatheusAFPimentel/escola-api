const express = require('express');
const router = express.Router();
const Notificacao = require('../models/Notificacao');
const verificarToken = require('../middlewares/authMiddleware');
const PushNotificationService = require('../services/pushNotificationService');

// Listar notificações do usuário
router.get('/minhas', verificarToken, async (req, res) => {
  try {
    const notificacoes = await Notificacao.find({ 
      destinatario: req.user._id 
    })
    .sort({ createdAt: -1 })
    .limit(50);

    res.json({
      status: 'success',
      data: notificacoes
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao buscar notificações',
      error: err.message
    });
  }
});

// Marcar notificação como lida
router.patch('/:notificacaoId/ler', verificarToken, async (req, res) => {
  try {
    const notificacao = await Notificacao.findOneAndUpdate(
      { 
        _id: req.params.notificacaoId,
        destinatario: req.user._id
      },
      { lida: true },
      { new: true }
    );

    if (!notificacao) {
      return res.status(404).json({
        status: 'error',
        message: 'Notificação não encontrada'
      });
    }

    res.json({
      status: 'success',
      data: notificacao
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao atualizar notificação',
      error: err.message
    });
  }
});

// Atualizar token FCM (chamado pelo app mobile)
router.post('/token', verificarToken, async (req, res) => {
  try {
    const { token, dispositivo } = req.body;

    if (!token || !dispositivo) {
      return res.status(400).json({
        status: 'error',
        message: 'Token e dispositivo são obrigatórios'
      });
    }

    await PushNotificationService.atualizarToken(req.user._id, token, dispositivo);

    res.json({
      status: 'success',
      message: 'Token FCM atualizado com sucesso'
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao atualizar token FCM',
      error: err.message
    });
  }
});

// Remover token FCM (chamado pelo app mobile ao fazer logout)
router.delete('/token', verificarToken, async (req, res) => {
  try {
    await PushNotificationService.removerTokens(req.user._id);

    res.json({
      status: 'success',
      message: 'Tokens FCM removidos com sucesso'
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao remover tokens FCM',
      error: err.message
    });
  }
});

module.exports = router;
