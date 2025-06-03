const express = require('express');
const Contato = require('../models/Contato');
const User = require('../models/User');
const verificarToken = require('../middlewares/authMiddleware');
const router = express.Router();

// IMPORTANTE: Rota de busca deve vir ANTES da rota com parâmetro :id
// Rota de busca
router.get('/busca', verificarToken, async (req, res) => {
  try {
    const { 
      termo,
      dia,
      horarioInicio,
      horarioFim
    } = req.query;

    let filtro = { ativo: true };

    // Busca por termo (nome, disciplina, cargo)
    if (termo) {
      const regex = new RegExp(termo, 'i');
      filtro.$or = [
        { 'disciplinas': regex },
        { 'cargo': regex },
        { 'departamento': regex }
      ];

      // Adiciona busca pelo nome do usuário
      const usuariosEncontrados = await User.find({
        nome: regex
      }).select('_id');

      if (usuariosEncontrados.length > 0) {
        filtro.$or.push({
          usuario: { $in: usuariosEncontrados.map(u => u._id) }
        });
      }
    }

    // Filtro por horário de atendimento
    if (dia) {
      filtro['horarioAtendimento.dia'] = dia;
    }

    if (horarioInicio || horarioFim) {
      if (!filtro.horarioAtendimento) {
        filtro.horarioAtendimento = {};
      }

      if (horarioInicio) {
        filtro['horarioAtendimento.horarioInicio'] = { $lte: horarioInicio };
      }

      if (horarioFim) {
        filtro['horarioAtendimento.horarioFim'] = { $gte: horarioFim };
      }
    }

    const contatos = await Contato.find(filtro)
      .populate('usuario', 'nome email')
      .sort({ tipo: 1, cargo: 1 });

    // Agrupa resultados por tipo
    const resultadosAgrupados = contatos.reduce((acc, contato) => {
      if (!acc[contato.tipo]) {
        acc[contato.tipo] = [];
      }
      acc[contato.tipo].push({
        ...contato.toObject(),
        relevancia: calcularRelevancia(contato, termo)
      });
      return acc;
    }, {});

    // Ordena resultados por relevância dentro de cada grupo
    Object.keys(resultadosAgrupados).forEach(tipo => {
      resultadosAgrupados[tipo].sort((a, b) => b.relevancia - a.relevancia);
    });

    // Adiciona informações de disponibilidade aos resultados
    const resultadosComDisponibilidade = {};
    Object.keys(resultadosAgrupados).forEach(tipo => {
      resultadosComDisponibilidade[tipo] = resultadosAgrupados[tipo].map(contato => ({
        ...contato,
        disponibilidade: verificarDisponibilidade(contato.horarioAtendimento)
      }));
    });

    res.json({
      status: 'success',
      data: {
        total: contatos.length,
        termo: termo || 'todos',
        filtros: {
          dia,
          horarioInicio,
          horarioFim
        },
        resultados: resultadosComDisponibilidade
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao buscar contatos',
      error: err.message
    });
  }
});

// Listar todos os contatos (com filtros)
router.get('/', verificarToken, async (req, res) => {
  try {
    const { tipo, disciplina, cargo } = req.query;
    const filtro = { ativo: true };

    if (tipo) filtro.tipo = tipo;
    if (disciplina) filtro.disciplinas = disciplina;
    if (cargo) filtro.cargo = cargo;

    const contatos = await Contato.find(filtro)
      .populate('usuario', 'nome email')
      .sort({ tipo: 1, cargo: 1 });

    // Agrupa contatos por tipo
    const contatosAgrupados = contatos.reduce((acc, contato) => {
      if (!acc[contato.tipo]) {
        acc[contato.tipo] = [];
      }
      acc[contato.tipo].push(contato);
      return acc;
    }, {});

    res.json({
      status: 'success',
      data: {
        total: contatos.length,
        agrupado: contatosAgrupados,
        lista: contatos
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao listar contatos',
      error: err.message
    });
  }
});

// Buscar contato específico por ID (deve vir DEPOIS da rota /busca)
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const contato = await Contato.findById(req.params.id)
      .populate('usuario', 'nome email');

    if (!contato) {
      return res.status(404).json({
        status: 'error',
        message: 'Contato não encontrado'
      });
    }

    res.json({
      status: 'success',
      data: contato
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao buscar contato',
      error: err.message
    });
  }
});

// Criar novo contato (apenas admin)
router.post('/', verificarToken, async (req, res) => {
  try {
    if (req.user.tipo !== 'gestor') {
      return res.status(403).json({
        status: 'error',
        message: 'Apenas gestores podem criar contatos'
      });
    }

    const contato = await Contato.create(req.body);
    const contatoPopulado = await Contato.findById(contato._id)
      .populate('usuario', 'nome email');

    res.status(201).json({
      status: 'success',
      data: contatoPopulado
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao criar contato',
      error: err.message
    });
  }
});

// Atualizar contato (apenas admin ou próprio usuário)
router.put('/:id', verificarToken, async (req, res) => {
  try {
    const contato = await Contato.findById(req.params.id);

    if (!contato) {
      return res.status(404).json({
        status: 'error',
        message: 'Contato não encontrado'
      });
    }

    // Verifica permissões
    if (req.user.tipo !== 'gestor' && contato.usuario.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Você não tem permissão para atualizar este contato'
      });
    }

    const contatoAtualizado = await Contato.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('usuario', 'nome email');

    res.json({
      status: 'success',
      data: contatoAtualizado
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao atualizar contato',
      error: err.message
    });
  }
});

// Função auxiliar para calcular relevância do resultado
function calcularRelevancia(contato, termo) {
  if (!termo) return 1;
  
  let pontos = 0;
  const termoBusca = termo.toLowerCase();

  // Nome do usuário
  if (contato.usuario.nome.toLowerCase().includes(termoBusca)) {
    pontos += 3;
  }

  // Disciplinas
  if (contato.disciplinas.some(d => d.toLowerCase().includes(termoBusca))) {
    pontos += 2;
  }

  // Cargo
  if (contato.cargo.toLowerCase().includes(termoBusca)) {
    pontos += 2;
  }

  // Departamento
  if (contato.departamento && contato.departamento.toLowerCase().includes(termoBusca)) {
    pontos += 1;
  }

  return pontos;
}

// Função para verificar disponibilidade atual
function verificarDisponibilidade(horarios) {
  const agora = new Date();
  const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const diaAtual = diasSemana[agora.getDay()];
  const horaAtual = `${agora.getHours().toString().padStart(2, '0')}:${agora.getMinutes().toString().padStart(2, '0')}`;

  // Encontra horário de atendimento para hoje
  const horarioHoje = horarios.find(h => h.dia === diaAtual);

  if (!horarioHoje) {
    return {
      disponivel: false,
      status: 'INDISPONIVEL',
      proximoHorario: encontrarProximoHorario(horarios, diaAtual, horaAtual)
    };
  }

  // Verifica se está no horário de atendimento
  if (horaAtual >= horarioHoje.horarioInicio && horaAtual <= horarioHoje.horarioFim) {
    return {
      disponivel: true,
      status: 'DISPONIVEL',
      horarioAtual: horarioHoje,
      tempoRestante: calcularTempoRestante(horaAtual, horarioHoje.horarioFim)
    };
  }

  return {
    disponivel: false,
    status: 'FORA_DO_HORARIO',
    proximoHorario: encontrarProximoHorario(horarios, diaAtual, horaAtual)
  };
}

// Função para encontrar próximo horário disponível
function encontrarProximoHorario(horarios, diaAtual, horaAtual) {
  const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const diaAtualIndex = diasSemana.indexOf(diaAtual);
  
  // Verifica próximos 7 dias
  for (let i = 0; i < 7; i++) {
    const proximoDiaIndex = (diaAtualIndex + i) % 7;
    const proximoDia = diasSemana[proximoDiaIndex];
    
    const horariosNoDia = horarios.filter(h => h.dia === proximoDia);
    
    for (const horario of horariosNoDia) {
      if (i === 0 && horario.horarioInicio <= horaAtual) continue;
      
      return {
        dia: proximoDia,
        horario: horario,
        diasAteProximo: i
      };
    }
  }
  
  return null;
}

// Função para calcular tempo restante
function calcularTempoRestante(horaAtual, horaFim) {
  const [horaAtualH, horaAtualM] = horaAtual.split(':').map(Number);
  const [horaFimH, horaFimM] = horaFim.split(':').map(Number);
  
  const minutosRestantes = (horaFimH * 60 + horaFimM) - (horaAtualH * 60 + horaAtualM);
  
  return {
    horas: Math.floor(minutosRestantes / 60),
    minutos: minutosRestantes % 60
  };
}

module.exports = router; 