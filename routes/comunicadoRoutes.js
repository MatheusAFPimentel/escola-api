const express = require('express');
const router = express.Router();
const Comunicado = require('../models/Comunicado');
const verificarToken = require('../middlewares/authMiddleware');
const Turma = require('../models/Turma');
const User = require('../models/User');

// Middleware para verificar permissões
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Não autorizado' 
      });
    }

    if (!roles.includes(req.user.tipo)) {
      return res.status(403).json({ 
        status: 'error',
        message: 'Acesso negado' 
      });
    }

    next();
  };
};

// Criar comunicado
router.post('/', verificarToken, checkRole(['professor', 'gestor']), async (req, res) => {
  try {
    const { 
      titulo, 
      conteudo, 
      tipo, 
      destinatarios, 
      turma, 
      prioridade, 
      dataValidade 
    } = req.body;

    // Validações básicas
    if (!titulo || !conteudo || !tipo) {
      return res.status(400).json({
        status: 'error',
        message: 'Campos obrigatórios: titulo, conteudo, tipo'
      });
    }

    // Validar turma se for comunicado de turma
    if (tipo === 'turma' && turma) {
      const turmaExiste = await Turma.findById(turma);
      if (!turmaExiste) {
        return res.status(404).json({
          status: 'error',
          message: 'Turma não encontrada'
        });
      }
    }

    // Validar destinatários se for comunicado específico
    if (tipo === 'aluno' || tipo === 'professor') {
      if (!destinatarios || !Array.isArray(destinatarios) || destinatarios.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Destinatários são obrigatórios para este tipo de comunicado'
        });
      }

      // Verificar se todos os destinatários existem
      const destinatariosExistem = await User.find({
        _id: { $in: destinatarios },
        tipo: tipo
      });

      if (destinatariosExistem.length !== destinatarios.length) {
        return res.status(400).json({
          status: 'error',
          message: 'Um ou mais destinatários não encontrados'
        });
      }
    }

    const comunicado = new Comunicado({
      titulo,
      conteudo,
      tipo,
      destinatarios,
      turma,
      prioridade,
      dataValidade
    });

    await comunicado.save();

    res.status(201).json({
      status: 'success',
      data: comunicado
    });
  } catch (error) {
    console.error('Erro ao criar comunicado:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao criar comunicado',
      error: error.message
    });
  }
});

// Listar comunicados
router.get('/', verificarToken, async (req, res) => {
  try {
    const { tipo, turma, prioridade } = req.query;
    const query = { ativo: true };

    // Filtrar por tipo
    if (tipo) {
      query.tipo = tipo;
    }

    // Filtrar por turma
    if (turma) {
      query.turma = turma;
    }

    // Filtrar por prioridade
    if (prioridade) {
      query.prioridade = prioridade;
    }

    // Filtrar por destinatário
    if (req.user.tipo === 'aluno') {
      query.$or = [
        { tipo: 'geral' },
        { tipo: 'aluno', destinatarios: req.user._id },
        { tipo: 'turma', turma: { $in: await Turma.find({ alunos: req.user._id }).select('_id') } }
      ];
    } else if (req.user.tipo === 'professor') {
      query.$or = [
        { tipo: 'geral' },
        { tipo: 'professor', destinatarios: req.user._id },
        { tipo: 'turma', turma: { $in: await Turma.find({ professores: req.user._id }).select('_id') } }
      ];
    }

    const comunicados = await Comunicado.find(query)
      .populate('turma', 'nome')
      .populate('destinatarios', 'nome email')
      .sort({ createdAt: -1 });

    res.json({
      status: 'success',
      data: comunicados
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao listar comunicados',
      error: error.message
    });
  }
});

// Marcar comunicado como lido
router.post('/:id/ler', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;

    const comunicado = await Comunicado.findById(id);
    if (!comunicado) {
      return res.status(404).json({
        status: 'error',
        message: 'Comunicado não encontrado'
      });
    }

    // Verificar se o usuário já leu
    const jaLeu = comunicado.lidoPor.some(
      leitura => leitura.usuario.toString() === req.user._id.toString()
    );

    if (!jaLeu) {
      comunicado.lidoPor.push({
        usuario: req.user._id,
        dataLeitura: new Date()
      });
      await comunicado.save();
    }

    res.json({
      status: 'success',
      message: 'Comunicado marcado como lido'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao marcar comunicado como lido',
      error: error.message
    });
  }
});

// Atualizar comunicado
router.put('/:id', verificarToken, checkRole(['professor', 'gestor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      titulo, 
      conteudo, 
      tipo, 
      destinatarios, 
      turma, 
      prioridade, 
      dataValidade,
      ativo 
    } = req.body;

    const comunicado = await Comunicado.findByIdAndUpdate(
      id,
      {
        titulo,
        conteudo,
        tipo,
        destinatarios,
        turma,
        prioridade,
        dataValidade,
        ativo
      },
      { new: true }
    );

    if (!comunicado) {
      return res.status(404).json({
        status: 'error',
        message: 'Comunicado não encontrado'
      });
    }

    res.json({
      status: 'success',
      data: comunicado
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao atualizar comunicado',
      error: error.message
    });
  }
});

// Excluir comunicado (soft delete)
router.delete('/:id', verificarToken, checkRole(['professor', 'gestor']), async (req, res) => {
  try {
    const { id } = req.params;

    const comunicado = await Comunicado.findByIdAndUpdate(
      id,
      { ativo: false },
      { new: true }
    );

    if (!comunicado) {
      return res.status(404).json({
        status: 'error',
        message: 'Comunicado não encontrado'
      });
    }

    res.json({
      status: 'success',
      message: 'Comunicado excluído com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao excluir comunicado',
      error: error.message
    });
  }
});

module.exports = router;
