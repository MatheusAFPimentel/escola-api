const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/authMiddleware');
const Frequencia = require('../models/Frequencia');
const Turma = require('../models/Turma');

// Middleware para verificar role
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

// Registrar frequência
router.post('/registrar', verificarToken, checkRole(['professor']), async (req, res) => {
  try {
    const { turmaId, data, registros, observacao } = req.body;

    console.log('Dados recebidos:', {
      turmaId,
      professorId: req.user._id,
      data,
      registros
    });

    // Validar se a turma existe
    const turma = await Turma.findById(turmaId).populate('alunos');
    
    if (!turma) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Turma não encontrada' 
      });
    }

    console.log('Turma encontrada:', {
      turmaId: turma._id,
      professorId: turma.professor,
      professorLogado: req.user._id,
      alunos: turma.alunos.map(a => a._id.toString())
    });

    // Verificar se o professor tem acesso à turma
    if (turma.professor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        status: 'error',
        message: 'Professor não tem permissão para esta turma' 
      });
    }

    // Validar se todos os alunos pertencem à turma
    const alunosIds = registros.map(r => r.aluno);
    const alunosTurma = turma.alunos.map(a => a._id.toString());
    
    console.log('Validação de alunos:', {
      alunosIds,
      alunosTurma
    });

    const alunosInvalidos = alunosIds.filter(id => !alunosTurma.includes(id));
    
    if (alunosInvalidos.length > 0) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Alguns alunos não pertencem a esta turma',
        alunosInvalidos
      });
    }

    // Criar registro de frequência
    const frequencia = new Frequencia({
      turma: turmaId,
      data,
      registros,
      professor: req.user._id,
      observacao
    });

    await frequencia.save();

    res.status(201).json({
      status: 'success',
      data: frequencia
    });
  } catch (error) {
    console.error('Erro ao registrar frequência:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Erro ao registrar frequência', 
      error: error.message 
    });
  }
});

// Consultar frequência por turma e data
router.get('/turma/:turmaId', verificarToken, async (req, res) => {
  try {
    const { turmaId } = req.params;
    const { data } = req.query;

    const query = { turma: turmaId };
    if (data) {
      const dataInicio = new Date(data);
      dataInicio.setHours(0, 0, 0, 0);
      const dataFim = new Date(data);
      dataFim.setHours(23, 59, 59, 999);
      query.data = { $gte: dataInicio, $lte: dataFim };
    }

    const frequencias = await Frequencia.find(query)
      .populate('registros.aluno', 'nome email')
      .populate('professor', 'nome')
      .sort({ data: -1 });

    res.json({
      status: 'success',
      data: frequencias
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: 'Erro ao consultar frequência', 
      error: error.message 
    });
  }
});

// Justificar falta
router.patch('/justificar/:frequenciaId', verificarToken, checkRole(['professor', 'gestor']), async (req, res) => {
  try {
    const { frequenciaId } = req.params;
    const { alunoId, justificativa } = req.body;

    const frequencia = await Frequencia.findById(frequenciaId);
    if (!frequencia) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Registro de frequência não encontrado' 
      });
    }

    const registro = frequencia.registros.find(r => r.aluno.toString() === alunoId);
    if (!registro) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Aluno não encontrado neste registro' 
      });
    }

    registro.status = 'justificado';
    registro.justificativa = justificativa;

    await frequencia.save();

    res.json({
      status: 'success',
      data: frequencia
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: 'Erro ao justificar falta', 
      error: error.message 
    });
  }
});

// Relatório de frequência por aluno
router.get('/aluno/:alunoId', verificarToken, async (req, res) => {
  try {
    const { alunoId } = req.params;
    const { periodo } = req.query;

    const query = { 'registros.aluno': alunoId };
    if (periodo) {
      const [inicio, fim] = periodo.split(',');
      query.data = {
        $gte: new Date(inicio),
        $lte: new Date(fim)
      };
    }

    const frequencias = await Frequencia.find(query)
      .populate('turma', 'nome disciplina')
      .populate('professor', 'nome')
      .sort({ data: -1 });

    // Calcular estatísticas
    const total = frequencias.length;
    const presentes = frequencias.reduce((acc, freq) => {
      const registro = freq.registros.find(r => r.aluno.toString() === alunoId);
      return acc + (registro?.status === 'presente' ? 1 : 0);
    }, 0);
    const ausentes = frequencias.reduce((acc, freq) => {
      const registro = freq.registros.find(r => r.aluno.toString() === alunoId);
      return acc + (registro?.status === 'ausente' ? 1 : 0);
    }, 0);
    const justificados = frequencias.reduce((acc, freq) => {
      const registro = freq.registros.find(r => r.aluno.toString() === alunoId);
      return acc + (registro?.status === 'justificado' ? 1 : 0);
    }, 0);

    res.json({
      status: 'success',
      data: {
        frequencias,
        estatisticas: {
          total,
          presentes,
          ausentes,
          justificados,
          percentualPresenca: total > 0 ? (presentes / total) * 100 : 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: 'Erro ao gerar relatório', 
      error: error.message 
    });
  }
});

module.exports = router;
