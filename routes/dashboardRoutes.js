const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const {
  calcularMediaBimestral,
  contarTurmasProfessor,
  contarNotasLancadasHoje,
  contarAvaliacoesProximas
} = require('../utils/dashboardUtils');
const Nota = require('../models/Nota');
const Evento = require('../models/Evento');
const Contato = require('../models/Contato');
const User = require('../models/User');
const Turma = require('../models/Turma');

router.get('/', verificarToken, async (req, res) => {
  try {
    const usuario = req.user;
    const agora = new Date();

    // Dados base do dashboard
    const dadosBase = {
      usuario: {
        id: usuario._id,
        nome: usuario.nome,
        tipo: usuario.tipo,
        email: usuario.email
      },
      timestamp: new Date()
    };

    // Dados específicos por tipo de usuário
    switch (usuario.tipo) {
      case 'aluno':
        dadosBase.dados = await getDadosAluno(usuario._id);
        break;
      case 'professor':
        dadosBase.dados = await getDadosProfessor(usuario._id);
        break;
      case 'responsavel':
        dadosBase.dados = await getDadosResponsavel(usuario.dependentes);
        break;
      default:
        dadosBase.dados = await getDadosGerais();
    }

    res.json({
      status: 'success',
      data: dadosBase
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao carregar dashboard',
      error: err.message
    });
  }
});

// Função para dados do aluno
async function getDadosAluno(alunoId) {
  const [notas, eventos, contatos] = await Promise.all([
    Nota.find({ aluno: alunoId })
      .sort({ dataLancamento: -1 })
      .limit(5)
      .populate('professor', 'nome'),
    Evento.find({
      dataInicio: { $gte: new Date() },
      status: 'agendado'
    })
      .sort({ dataInicio: 1 })
      .limit(5),
    Contato.find({ ativo: true })
      .limit(5)
      .populate('usuario', 'nome email')
  ]);

  const mediaBimestral = await calcularMediaBimestral([alunoId]);

  return {
    notas: {
      recentes: notas.map(nota => ({
        id: nota._id,
        valor: nota.valor,
        materia: nota.materia,
        professor: nota.professor.nome,
        data: nota.dataLancamento
      })),
      mediaBimestral
    },
    eventos: eventos.map(evento => ({
      id: evento._id,
      titulo: evento.titulo,
      tipo: evento.tipo,
      data: evento.dataInicio
    })),
    contatos: contatos.map(contato => ({
      id: contato._id,
      nome: contato.usuario.nome,
      cargo: contato.cargo,
      email: contato.emailProfissional
    }))
  };
}

// Função para dados do professor
async function getDadosProfessor(professorId) {
  const [turmas, notasHoje, avaliacoesProximas, eventos] = await Promise.all([
    contarTurmasProfessor(professorId),
    contarNotasLancadasHoje(professorId),
    contarAvaliacoesProximas(professorId),
    Evento.find({
      criadorEvento: professorId,
      dataInicio: { $gte: new Date() },
      status: 'agendado'
    })
      .sort({ dataInicio: 1 })
      .limit(5)
  ]);

  return {
    estatisticas: {
      turmas,
      notasLancadas: notasHoje,
      avaliacoesProximas
    },
    eventos: eventos.map(evento => ({
      id: evento._id,
      titulo: evento.titulo,
      tipo: evento.tipo,
      data: evento.dataInicio,
      local: evento.local
    }))
  };
}

// Função para dados do responsável
async function getDadosResponsavel(dependentesIds) {
  const [notas, eventos] = await Promise.all([
    Nota.find({ aluno: { $in: dependentesIds } })
      .sort({ dataLancamento: -1 })
      .limit(10)
      .populate('professor', 'nome')
      .populate('aluno', 'nome'),
    Evento.find({
      dataInicio: { $gte: new Date() },
      status: 'agendado'
    })
      .sort({ dataInicio: 1 })
      .limit(5)
  ]);

  const mediasBimestrais = await Promise.all(
    dependentesIds.map(async (alunoId) => {
      const medias = await calcularMediaBimestral([alunoId]);
      const aluno = await User.findById(alunoId).select('nome');
      return {
        aluno: {
          id: alunoId,
          nome: aluno.nome
        },
        medias
      };
    })
  );

  return {
    dependentes: mediasBimestrais,
    notas: notas.map(nota => ({
      id: nota._id,
      valor: nota.valor,
      materia: nota.materia,
      professor: nota.professor.nome,
      aluno: nota.aluno.nome,
      data: nota.dataLancamento
    })),
    eventos: eventos.map(evento => ({
      id: evento._id,
      titulo: evento.titulo,
      tipo: evento.tipo,
      data: evento.dataInicio
    }))
  };
}

// Função para dados gerais (gestor/admin)
async function getDadosGerais() {
  const [
    totalAlunos,
    totalProfessores,
    totalTurmas,
    eventosProximos,
    ultimasNotas
  ] = await Promise.all([
    User.countDocuments({ tipo: 'aluno', ativo: true }),
    User.countDocuments({ tipo: 'professor', ativo: true }),
    Turma.countDocuments({ ativo: true }),
    Evento.find({
      dataInicio: { $gte: new Date() },
      status: 'agendado'
    })
      .sort({ dataInicio: 1 })
      .limit(5),
    Nota.find()
      .sort({ dataLancamento: -1 })
      .limit(5)
      .populate('aluno', 'nome')
      .populate('professor', 'nome')
  ]);

  return {
    estatisticas: {
      alunos: totalAlunos,
      professores: totalProfessores,
      turmas: totalTurmas
    },
    eventos: eventosProximos.map(evento => ({
      id: evento._id,
      titulo: evento.titulo,
      tipo: evento.tipo,
      data: evento.dataInicio
    })),
    ultimasNotas: ultimasNotas.map(nota => ({
      id: nota._id,
      aluno: nota.aluno.nome,
      professor: nota.professor.nome,
      materia: nota.materia,
      valor: nota.valor,
      data: nota.dataLancamento
    }))
  };
}

module.exports = router; 