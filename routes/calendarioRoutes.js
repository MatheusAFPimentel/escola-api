const express = require('express');
const router = express.Router();
const CalendarioAcademico = require('../models/CalendarioAcademico');
const verificarToken = require('../middlewares/authMiddleware');
const Turma = require('../models/Turma');

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

// Criar evento no calendário
router.post('/', verificarToken, checkRole(['professor', 'gestor']), async (req, res) => {
  try {
    console.log('Dados recebidos:', req.body);
    console.log('Usuário:', req.user);

    const { titulo, descricao, dataInicio, dataFim, tipo, turma, recorrencia } = req.body;

    // Validações básicas
    if (!titulo || !dataInicio || !dataFim || !tipo) {
      return res.status(400).json({
        status: 'error',
        message: 'Campos obrigatórios: titulo, dataInicio, dataFim, tipo'
      });
    }

    // Validar datas
    const dataInicioObj = new Date(dataInicio);
    const dataFimObj = new Date(dataFim);

    if (isNaN(dataInicioObj.getTime()) || isNaN(dataFimObj.getTime())) {
      return res.status(400).json({
        status: 'error',
        message: 'Datas inválidas'
      });
    }

    if (dataInicioObj > dataFimObj) {
      return res.status(400).json({
        status: 'error',
        message: 'Data de início deve ser anterior à data de fim'
      });
    }

    // Se for evento de turma, validar se a turma existe
    if (turma) {
      const turmaExiste = await Turma.findById(turma);
      if (!turmaExiste) {
        return res.status(404).json({
          status: 'error',
          message: 'Turma não encontrada'
        });
      }
    }

    // Criar o evento
    const evento = new CalendarioAcademico({
      titulo,
      descricao,
      dataInicio: dataInicioObj,
      dataFim: dataFimObj,
      tipo,
      turma,
      recorrencia: recorrencia || {
        tipo: 'nenhuma',
        intervalo: 1
      }
    });

    console.log('Evento a ser criado:', evento);

    const eventoSalvo = await evento.save();
    console.log('Evento salvo:', eventoSalvo);

    res.status(201).json({
      status: 'success',
      data: eventoSalvo
    });
  } catch (error) {
    console.error('Erro ao criar evento:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao criar evento',
      error: error.message
    });
  }
});

// Listar eventos do calendário
router.get('/', verificarToken, async (req, res) => {
  try {
    const { inicio, fim, tipo, turma } = req.query;
    const query = { ativo: true };

    // Filtrar por período
    if (inicio && fim) {
      query.dataInicio = { $gte: new Date(inicio) };
      query.dataFim = { $lte: new Date(fim) };
    }

    // Filtrar por tipo
    if (tipo) {
      query.tipo = tipo;
    }

    // Filtrar por turma
    if (turma) {
      query.turma = turma;
    }

    // Se for aluno, mostrar apenas eventos da sua turma
    if (req.user.tipo === 'aluno') {
      const turmaAluno = await Turma.findOne({ alunos: req.user._id });
      if (turmaAluno) {
        query.turma = turmaAluno._id;
      }
    }

    const eventos = await CalendarioAcademico.find(query)
      .populate('turma', 'nome')
      .sort({ dataInicio: 1 });

    res.json({
      status: 'success',
      data: eventos
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao listar eventos',
      error: error.message
    });
  }
});

// Atualizar evento
router.put('/:id', verificarToken, checkRole(['professor', 'gestor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descricao, dataInicio, dataFim, tipo, turma, recorrencia, ativo } = req.body;

    const evento = await CalendarioAcademico.findByIdAndUpdate(
      id,
      {
        titulo,
        descricao,
        dataInicio,
        dataFim,
        tipo,
        turma,
        recorrencia,
        ativo
      },
      { new: true }
    );

    if (!evento) {
      return res.status(404).json({
        status: 'error',
        message: 'Evento não encontrado'
      });
    }

    res.json({
      status: 'success',
      data: evento
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao atualizar evento',
      error: error.message
    });
  }
});

// Excluir evento
router.delete('/:id', verificarToken, checkRole(['professor', 'gestor']), async (req, res) => {
  try {
    const { id } = req.params;

    const evento = await CalendarioAcademico.findByIdAndUpdate(
      id,
      { ativo: false },
      { new: true }
    );

    if (!evento) {
      return res.status(404).json({
        status: 'error',
        message: 'Evento não encontrado'
      });
    }

    res.json({
      status: 'success',
      message: 'Evento excluído com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao excluir evento',
      error: error.message
    });
  }
});

// Obter eventos por turma
router.get('/turma/:turmaId', verificarToken, async (req, res) => {
  try {
    const { turmaId } = req.params;
    const { inicio, fim } = req.query;

    const query = { 
      turma: turmaId,
      ativo: true
    };

    if (inicio && fim) {
      query.dataInicio = { $gte: new Date(inicio) };
      query.dataFim = { $lte: new Date(fim) };
    }

    const eventos = await CalendarioAcademico.find(query)
      .sort({ dataInicio: 1 });

    res.json({
      status: 'success',
      data: eventos
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao buscar eventos da turma',
      error: error.message
    });
  }
});

module.exports = router;
