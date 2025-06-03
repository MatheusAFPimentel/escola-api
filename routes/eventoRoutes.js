// routes/eventoRoutes.js
const express = require('express');
const Evento = require('../models/Evento');
const verificarToken = require('../middlewares/authMiddleware');

const router = express.Router();

const urgencia = {
  URGENTE: 'urgente',      // 0-3 dias
  PROXIMO: 'proximo',      // 4-7 dias
  FUTURO: 'futuro',        // 8+ dias
  ATRASADO: 'atrasado'     // eventos passados
};

// Criar evento (professor ou gestor)
router.post('/', verificarToken, async (req, res) => {
  try {
    const { tipo } = req.user;
    if (tipo !== 'professor' && tipo !== 'gestor') {
      return res.status(403).json({
        status: 'error',
        message: 'Apenas professores e gestores podem criar eventos'
      });
    }

    const {
      titulo,
      descricao,
      tipo: tipoEvento,
      dataInicio,
      dataFim,
      turmas,
      materia,
      local
    } = req.body;

    // Validações básicas
    if (new Date(dataFim) < new Date(dataInicio)) {
      return res.status(400).json({
        status: 'error',
        message: 'A data de término deve ser posterior à data de início'
      });
    }

    if ((tipoEvento === 'prova' || tipoEvento === 'trabalho') && !materia) {
      return res.status(400).json({
        status: 'error',
        message: 'Matéria é obrigatória para provas e trabalhos'
      });
    }

    const evento = await Evento.create({
      titulo,
      descricao,
      tipo: tipoEvento,
      dataInicio,
      dataFim,
      turmas,
      materia,
      local,
      criadorEvento: req.user._id
    });

    const eventoPopulado = await Evento.findById(evento._id)
      .populate('criadorEvento', 'nome email')
      .populate('turmas', 'nome');

    res.status(201).json({
      status: 'success',
      data: eventoPopulado
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao criar evento',
      error: err.message
    });
  }
});

// Listar eventos (com filtros)
router.get('/', verificarToken, async (req, res) => {
  try {
    const { 
      inicio, 
      fim, 
      tipo, 
      turma,
      materia 
    } = req.query;

    const filtro = {};

    // Filtro por período
    if (inicio || fim) {
      filtro.dataInicio = {};
      if (inicio) filtro.dataInicio.$gte = new Date(inicio);
      if (fim) filtro.dataInicio.$lte = new Date(fim);
    }

    // Outros filtros
    if (tipo) filtro.tipo = tipo;
    if (turma) filtro.turmas = turma;
    if (materia) filtro.materia = materia;

    // Se for aluno, mostrar apenas eventos das suas turmas
    if (req.user.tipo === 'aluno') {
      filtro.turmas = { $in: req.user.turmas };
    }

    const eventos = await Evento.find(filtro)
      .populate('criadorEvento', 'nome email')
      .populate('turmas', 'nome')
      .sort({ dataInicio: 1 });

    res.json({
      status: 'success',
      data: eventos
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao listar eventos',
      error: err.message
    });
  }
});

// Atualizar evento
router.put('/:eventoId', verificarToken, async (req, res) => {
  try {
    const { tipo } = req.user;
    const evento = await Evento.findById(req.params.eventoId);

    if (!evento) {
      return res.status(404).json({
        status: 'error',
        message: 'Evento não encontrado'
      });
    }

    // Verifica se criadorEvento existe antes de tentar acessá-lo
    if (tipo !== 'gestor' && evento.criadorEvento && evento.criadorEvento.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Você não tem permissão para atualizar este evento'
      });
    }

    // Validações dos dados de atualização
    if (req.body.dataInicio && req.body.dataFim) {
      if (new Date(req.body.dataFim) < new Date(req.body.dataInicio)) {
        return res.status(400).json({
          status: 'error',
          message: 'A data de término deve ser posterior à data de início'
        });
      }
    }

    if (req.body.tipo && (req.body.tipo === 'prova' || req.body.tipo === 'trabalho') && !req.body.materia) {
      return res.status(400).json({
        status: 'error',
        message: 'Matéria é obrigatória para provas e trabalhos'
      });
    }

    const eventoAtualizado = await Evento.findByIdAndUpdate(
      req.params.eventoId,
      { $set: req.body },
      { new: true, runValidators: true }
    )
    .populate('criadorEvento', 'nome email')
    .populate('turmas', 'nome');

    res.json({
      status: 'success',
      data: eventoAtualizado
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao atualizar evento',
      error: err.message
    });
  }
});

// Cancelar evento
router.patch('/:eventoId/cancelar', verificarToken, async (req, res) => {
  try {
    const { tipo } = req.user;
    const evento = await Evento.findById(req.params.eventoId);

    if (!evento) {
      return res.status(404).json({
        status: 'error',
        message: 'Evento não encontrado'
      });
    }

    // Verifica se criadorEvento existe antes de tentar acessá-lo
    if (tipo !== 'gestor' && evento.criadorEvento && evento.criadorEvento.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Você não tem permissão para cancelar este evento'
      });
    }

    // Verifica se o evento já está cancelado
    if (evento.status === 'cancelado') {
      return res.status(400).json({
        status: 'error',
        message: 'Este evento já está cancelado'
      });
    }

    // Usa findByIdAndUpdate ao invés de save() para evitar validação completa
    const eventoAtualizado = await Evento.findByIdAndUpdate(
      req.params.eventoId,
      { status: 'cancelado' },
      { new: true, runValidators: false }
    ).populate('criadorEvento', 'nome email')
      .populate('turmas', 'nome');

    res.json({
      status: 'success',
      message: 'Evento cancelado com sucesso',
      data: eventoAtualizado
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao cancelar evento',
      error: err.message
    });
  }
});

// Funções auxiliares
const determinarStatus = (dataInicio, dataFim) => {
  const agora = new Date();
  if (agora < new Date(dataInicio)) return 'agendado';
  if (agora > new Date(dataFim)) return 'concluido';
  return 'emAndamento';
};

const determinarUrgencia = (dataEvento) => {
  const diasAteEvento = Math.ceil((new Date(dataEvento) - new Date()) / (1000 * 60 * 60 * 24));
  
  if (diasAteEvento < 0) return 'atrasado';
  if (diasAteEvento <= 3) return 'urgente';
  if (diasAteEvento <= 7) return 'proximo';
  return 'futuro';
};

// Listar eventos por período
router.get('/periodo/:tipo', verificarToken, async (req, res) => {
  try {
    const { tipo } = req.params; // dia, semana, mes
    const { status: statusFiltro } = req.query;
    const agora = new Date();
    let dataInicio, dataFim;

    switch (tipo) {
      case 'dia':
        dataInicio = new Date(agora.setHours(0, 0, 0, 0));
        dataFim = new Date(agora.setHours(23, 59, 59, 999));
        break;
      case 'semana':
        dataInicio = new Date(agora.setDate(agora.getDate() - agora.getDay()));
        dataFim = new Date(agora.setDate(agora.getDate() + 6));
        break;
      case 'mes':
        dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
        dataFim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
        break;
      case 'proximos':
        dataInicio = new Date();
        dataFim = new Date(agora.setDate(agora.getDate() + 30));
        break;
      default:
        return res.status(400).json({
          status: 'error',
          message: 'Período inválido. Use: dia, semana, mes ou proximos'
        });
    }

    const filtro = {
      dataInicio: { $gte: dataInicio, $lte: dataFim }
    };

    // Se for aluno, mostrar apenas eventos das suas turmas
    if (req.user.tipo === 'aluno') {
      filtro.turmas = { $in: req.user.turmas };
    }

    // Adiciona filtros opcionais da query
    if (req.query.tipo) filtro.tipo = req.query.tipo;
    if (req.query.materia) filtro.materia = req.query.materia;

    const eventos = await Evento.find(filtro)
      .populate('criadorEvento', 'nome email')
      .populate('turmas', 'nome')
      .sort({ dataInicio: 1 });

    // Filtra eventos por status se necessário
    const eventosFiltrados = statusFiltro 
      ? eventos.filter(evento => determinarStatus(evento.dataInicio, evento.dataFim) === statusFiltro)
      : eventos;

    // Agrupa eventos por data
    const eventosAgrupados = eventosFiltrados.reduce((grupos, evento) => {
      const data = evento.dataInicio.toISOString().split('T')[0];
      if (!grupos[data]) {
        grupos[data] = [];
      }
      grupos[data].push(evento);
      return grupos;
    }, {});

    // Estatísticas de status
    const estatisticasStatus = eventos.reduce((acc, evento) => {
      const status = determinarStatus(evento.dataInicio, evento.dataFim);
      if (!acc[status]) acc[status] = 0;
      acc[status]++;
      return acc;
    }, {});

    // Agrupa por urgência para o resumo
    const eventosPorUrgencia = {
      urgente: [],
      proximo: [],
      futuro: [],
      atrasado: []
    };

    eventos.forEach(evento => {
      const urgencia = determinarUrgencia(evento.dataInicio);
      eventosPorUrgencia[urgencia].push(evento);
    });

    // Adiciona indicadores aos eventos
    const eventosComIndicadores = Object.keys(eventosAgrupados).reduce((acc, data) => {
      acc[data] = eventosAgrupados[data].map(evento => {
        const statusAtual = determinarStatus(evento.dataInicio, evento.dataFim);
        return {
          ...evento.toObject(),
          urgencia: determinarUrgencia(evento.dataInicio),
          diasAteEvento: Math.ceil((new Date(evento.dataInicio) - new Date()) / (1000 * 60 * 60 * 24)),
          status: statusAtual,
          emAndamento: statusAtual === 'emAndamento'
        };
      });
      return acc;
    }, {});

    res.json({
      status: 'success',
      periodo: {
        inicio: dataInicio,
        fim: dataFim
      },
      filtros: {
        status: statusFiltro || 'todos'
      },
      estatisticas: {
        total: {
          geral: eventos.length,
          filtrado: eventosFiltrados.length
        },
        porStatus: estatisticasStatus
      },
      resumoUrgencia: {
        urgente: eventosPorUrgencia.urgente.map(e => ({
          titulo: e.titulo,
          data: e.dataInicio,
          tipo: e.tipo,
          diasAteEvento: Math.ceil((new Date(e.dataInicio) - new Date()) / (1000 * 60 * 60 * 24)),
          status: determinarStatus(e.dataInicio, e.dataFim)
        })),
        proximo: eventosPorUrgencia.proximo.map(e => ({
          titulo: e.titulo,
          data: e.dataInicio,
          tipo: e.tipo,
          diasAteEvento: Math.ceil((new Date(e.dataInicio) - new Date()) / (1000 * 60 * 60 * 24)),
          status: determinarStatus(e.dataInicio, e.dataFim)
        }))
      },
      data: eventosComIndicadores
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao listar eventos',
      error: err.message
    });
  }
});

module.exports = router;
