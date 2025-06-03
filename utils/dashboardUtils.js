const Nota = require('../models/Nota');
const Evento = require('../models/Evento');
const Turma = require('../models/Turma');

// Calcula média bimestral para aluno(s)
async function calcularMediaBimestral(alunoIds) {
  const notas = await Nota.find({
    aluno: { $in: alunoIds },
    bimestre: new Date().getMonth() <= 3 ? 1 : 
             new Date().getMonth() <= 6 ? 2 :
             new Date().getMonth() <= 9 ? 3 : 4
  });

  const mediasPorMateria = notas.reduce((acc, nota) => {
    if (!acc[nota.materia]) {
      acc[nota.materia] = {
        soma: 0,
        quantidade: 0
      };
    }
    acc[nota.materia].soma += nota.valor;
    acc[nota.materia].quantidade += 1;
    return acc;
  }, {});

  return Object.entries(mediasPorMateria).map(([materia, dados]) => ({
    materia,
    media: dados.soma / dados.quantidade
  }));
}

// Conta turmas ativas do professor
async function contarTurmasProfessor(professorId) {
  const turmas = await Turma.find({
    professor: professorId,
    ativo: true
  });

  return {
    total: turmas.length,
    turmas: turmas.map(t => ({
      id: t._id,
      nome: t.nome,
      quantidadeAlunos: t.alunos.length
    }))
  };
}

// Conta notas lançadas hoje pelo professor
async function contarNotasLancadasHoje(professorId) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const notas = await Nota.find({
    professor: professorId,
    dataLancamento: {
      $gte: hoje,
      $lt: new Date(hoje.getTime() + 24 * 60 * 60 * 1000)
    }
  });

  return {
    quantidade: notas.length,
    materias: [...new Set(notas.map(n => n.materia))]
  };
}

// Conta avaliações próximas do professor
async function contarAvaliacoesProximas(professorId) {
  const hoje = new Date();
  const proximaSemana = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);

  const avaliacoes = await Evento.find({
    criadorEvento: professorId,
    tipo: { $in: ['prova', 'trabalho'] },
    dataInicio: { $gte: hoje, $lte: proximaSemana },
    status: 'agendado'
  });

  return {
    quantidade: avaliacoes.length,
    proxima: avaliacoes[0] ? {
      titulo: avaliacoes[0].titulo,
      data: avaliacoes[0].dataInicio,
      tipo: avaliacoes[0].tipo
    } : null
  };
}

module.exports = {
  calcularMediaBimestral,
  contarTurmasProfessor,
  contarNotasLancadasHoje,
  contarAvaliacoesProximas
}; 