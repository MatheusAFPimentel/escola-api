// routes/notaRoutes.js
const express = require('express');
const Nota = require('../models/Nota');
const verificarToken = require('../middlewares/authMiddleware');
const User = require('../models/User');
const NotificacaoService = require('../services/notificacaoService');
const Frequencia = require('../models/Frequencia');

const router = express.Router();

// Criar nota (professor ou gestor)
router.post('/', verificarToken, async (req, res) => {
  try {
    const { tipo } = req.user;
    if (tipo !== 'professor' && tipo !== 'gestor') {
      return res.status(403).json({
        status: 'error',
        message: 'Acesso negado. Apenas professores e gestores podem registrar notas.'
      });
    }

    // Validar se o aluno existe
    const alunoExiste = await User.findById(req.body.aluno);
    if (!alunoExiste) {
      return res.status(400).json({
        status: 'error',
        message: 'Aluno não encontrado'
      });
    }

    if (alunoExiste.tipo !== 'aluno') {
      return res.status(400).json({
        status: 'error',
        message: 'O ID fornecido não corresponde a um aluno'
      });
    }

    // Validar os dados da nota
    const { aluno, materia, valor, bimestre } = req.body;

    if (!materia || materia.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'A matéria é obrigatória'
      });
    }

    if (typeof valor !== 'number' || valor < 0 || valor > 10) {
      return res.status(400).json({
        status: 'error',
        message: 'O valor da nota deve ser um número entre 0 e 10'
      });
    }

    if (![1, 2, 3, 4].includes(bimestre)) {
      return res.status(400).json({
        status: 'error',
        message: 'O bimestre deve ser um número entre 1 e 4'
      });
    }

    const novaNota = new Nota({
      aluno,
      materia,
      valor,
      bimestre,
      professor: req.user._id
    });

    const notaSalva = await novaNota.save();
    
    // Popula os dados do professor e aluno na resposta
    const notaCompleta = await Nota.findById(notaSalva._id)
      .populate('aluno', 'nome email')
      .populate('professor', 'nome email');

    // Envia notificação
    try {
      await NotificacaoService.notificarNovaNota(notaCompleta);
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      // Não retornamos erro para o cliente pois a nota foi salva com sucesso
    }

    res.status(201).json({
      status: 'success',
      data: notaCompleta
    });
  } catch (err) {
    console.error('Erro ao registrar nota:', err);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao registrar nota',
      error: err.message
    });
  }
});

// Listar notas do aluno logado
router.get('/minhas', verificarToken, async (req, res) => {
  try {
    const { tipo, _id } = req.user;
    if (tipo !== 'aluno' && tipo !== 'responsavel') {
      return res.status(403).json({
        status: 'error',
        message: 'Apenas alunos ou responsáveis podem acessar'
      });
    }

    const notas = await Nota.find({ aluno: _id })
      .populate('professor', 'nome email')
      .sort({ bimestre: 1, materia: 1 });

    res.json({
      status: 'success',
      data: notas
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao buscar notas',
      error: err.message
    });
  }
});

// Listar todas as notas (admin)
router.get('/', verificarToken, async (req, res) => {
  try {
    if (req.user.tipo !== 'gestor') {
      return res.status(403).json({
        status: 'error',
        message: 'Acesso negado'
      });
    }

    const notas = await Nota.find()
      .populate('aluno', 'nome email')
      .populate('professor', 'nome email')
      .sort({ aluno: 1, bimestre: 1, materia: 1 });

    res.json({
      status: 'success',
      data: notas
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao listar todas as notas',
      error: err.message
    });
  }
});

// Obter boletim completo do aluno (para aluno, responsável ou professor)
router.get('/boletim/:alunoId', verificarToken, async (req, res) => {
  try {
    const { tipo, _id } = req.user;
    const { alunoId } = req.params;
    const { periodo } = req.query; // Opcional: filtrar por período

    // Validação do ID do aluno
    if (!alunoId || !alunoId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID do aluno inválido'
      });
    }

    // Verifica permissões
    if (tipo === 'aluno' && _id.toString() !== alunoId) {
      return res.status(403).json({
        status: 'error',
        message: 'Você só pode ver seu próprio boletim'
      });
    }

    // Verifica se o aluno existe
    const aluno = await User.findOne({ 
      _id: alunoId,
      tipo: 'aluno' 
    });

    if (!aluno) {
      return res.status(404).json({
        status: 'error',
        message: 'Aluno não encontrado'
      });
    }

    // Busca todas as notas do aluno
    const notas = await Nota.find({ aluno: aluno._id })
      .populate('professor', 'nome')
      .sort({ materia: 1, bimestre: 1 });

    // Busca registros de frequência do aluno
    const queryFrequencia = { 'registros.aluno': aluno._id };
    if (periodo) {
      const [inicio, fim] = periodo.split(',');
      queryFrequencia.data = {
        $gte: new Date(inicio),
        $lte: new Date(fim)
      };
    }

    const frequencias = await Frequencia.find(queryFrequencia)
      .populate('turma', 'nome disciplina')
      .sort({ data: 1 });

    // Calcula estatísticas de frequência por disciplina
    const frequenciaPorDisciplina = frequencias.reduce((acc, freq) => {
      const disciplina = freq.turma.disciplina;
      
      if (!acc[disciplina]) {
        acc[disciplina] = {
          totalAulas: 0,
          presencas: 0,
          faltas: 0,
          justificadas: 0
        };
      }

      const registro = freq.registros.find(r => r.aluno.toString() === aluno._id.toString());
      if (registro) {
        acc[disciplina].totalAulas++;
        if (registro.status === 'presente') {
          acc[disciplina].presencas++;
        } else if (registro.status === 'ausente') {
          acc[disciplina].faltas++;
        } else if (registro.status === 'justificado') {
          acc[disciplina].justificadas++;
        }
      }

      return acc;
    }, {});

    // Agrupa notas por matéria
    const boletim = notas.reduce((acc, nota) => {
      const materiaKey = nota.materia;
      
      if (!acc[materiaKey]) {
        acc[materiaKey] = {
          materia: materiaKey,
          notas: [],
          medias: {
            bimestral: {
              1: { soma: 0, quantidade: 0, media: 0 },
              2: { soma: 0, quantidade: 0, media: 0 },
              3: { soma: 0, quantidade: 0, media: 0 },
              4: { soma: 0, quantidade: 0, media: 0 }
            },
            final: 0
          },
          frequencia: frequenciaPorDisciplina[materiaKey] || {
            totalAulas: 0,
            presencas: 0,
            faltas: 0,
            justificadas: 0,
            percentualPresenca: 0
          }
        };
      }

      acc[materiaKey].notas.push({
        valor: nota.valor,
        bimestre: nota.bimestre,
        professor: nota.professor.nome,
        dataLancamento: nota.createdAt
      });

      // Atualiza a soma e quantidade de notas do bimestre
      acc[materiaKey].medias.bimestral[nota.bimestre].soma += nota.valor;
      acc[materiaKey].medias.bimestral[nota.bimestre].quantidade += 1;

      return acc;
    }, {});

    // Calcula médias bimestrais, final e percentual de frequência
    for (const materia of Object.values(boletim)) {
      let somaMediasBimestrais = 0;
      let bimestresComNota = 0;

      // Calcula média de cada bimestre
      for (const bimestre of Object.values(materia.medias.bimestral)) {
        if (bimestre.quantidade > 0) {
          bimestre.media = (bimestre.soma / bimestre.quantidade).toFixed(1);
          somaMediasBimestrais += parseFloat(bimestre.media);
          bimestresComNota += 1;
        }
      }

      // Calcula média final
      materia.medias.final = bimestresComNota > 0
        ? (somaMediasBimestrais / bimestresComNota).toFixed(1)
        : "0.0";

      // Calcula percentual de frequência
      const freq = materia.frequencia;
      freq.percentualPresenca = freq.totalAulas > 0
        ? ((freq.presencas + freq.justificadas) / freq.totalAulas * 100).toFixed(1)
        : 0;

      // Verifica se a média está abaixo de 6 e notifica
      if (parseFloat(materia.medias.final) < 6) {
        try {
          await NotificacaoService.notificarMediaBaixa(aluno, materia.materia, parseFloat(materia.medias.final));
        } catch (error) {
          console.error('Erro ao enviar notificação de média baixa:', error);
        }
      }

      // Verifica se a frequência está abaixo de 75% e notifica
      if (parseFloat(freq.percentualPresenca) < 75) {
        try {
          await NotificacaoService.notificarFrequenciaBaixa(aluno, materia.materia, parseFloat(freq.percentualPresenca));
        } catch (error) {
          console.error('Erro ao enviar notificação de frequência baixa:', error);
        }
      }
    }

    res.json({
      status: 'success',
      data: {
        aluno: {
          id: aluno._id,
          nome: aluno.nome
        },
        boletim: Object.values(boletim),
        periodo: periodo || 'Ano letivo completo'
      }
    });
  } catch (error) {
    console.error('Erro ao gerar boletim:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao gerar boletim',
      error: error.message
    });
  }
});

// Obter média por matéria
router.get('/media/:materia', verificarToken, async (req, res) => {
  try {
    const { tipo, _id } = req.user;
    const { materia } = req.params;

    // Se for aluno, busca apenas suas notas
    const query = tipo === 'aluno' ? { aluno: _id, materia } : { materia };

    const notas = await Nota.find(query);
    
    // Agrupa notas por aluno
    const mediasPorAluno = notas.reduce((acc, nota) => {
      if (!acc[nota.aluno]) {
        acc[nota.aluno] = {
          notas: [],
          media: 0
        };
      }
      acc[nota.aluno].notas.push(nota.valor);
      return acc;
    }, {});

    // Calcula médias
    for (const alunoId in mediasPorAluno) {
      const notasAluno = mediasPorAluno[alunoId].notas;
      mediasPorAluno[alunoId].media = (
        notasAluno.reduce((a, b) => a + b, 0) / notasAluno.length
      ).toFixed(1);
    }

    // Se for aluno, retorna apenas sua média
    if (tipo === 'aluno') {
      const minhaMedia = mediasPorAluno[_id]?.media || 0;
      return res.json({
        status: 'success',
        data: {
          materia,
          media: minhaMedia
        }
      });
    }

    // Para professores e gestores, retorna todas as médias
    const mediaGeral = Object.values(mediasPorAluno)
      .reduce((acc, curr) => acc + parseFloat(curr.media), 0) / Object.keys(mediasPorAluno).length;

    res.json({
      status: 'success',
      data: {
        materia,
        mediaGeral: mediaGeral.toFixed(1),
        totalAlunos: Object.keys(mediasPorAluno).length
      }
    });
  } catch (err) {
    console.error('Erro ao calcular médias:', err);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao calcular médias',
      error: err.message
    });
  }
});

// Atualizar nota
router.put('/:notaId', verificarToken, async (req, res) => {
  try {
    const { tipo } = req.user;
    const { notaId } = req.params;
    const { valor, bimestre, materia } = req.body;

    // Verifica permissões
    if (tipo !== 'professor' && tipo !== 'gestor') {
      return res.status(403).json({
        status: 'error',
        message: 'Apenas professores e gestores podem atualizar notas'
      });
    }

    // Validações
    if (typeof valor !== 'number' || valor < 0 || valor > 10) {
      return res.status(400).json({
        status: 'error',
        message: 'O valor da nota deve ser um número entre 0 e 10'
      });
    }

    if (bimestre && ![1, 2, 3, 4].includes(bimestre)) {
      return res.status(400).json({
        status: 'error',
        message: 'O bimestre deve ser um número entre 1 e 4'
      });
    }

    // Busca a nota existente
    const nota = await Nota.findById(notaId);
    if (!nota) {
      return res.status(404).json({
        status: 'error',
        message: 'Nota não encontrada'
      });
    }

    // Verifica se o professor é o mesmo que criou a nota
    if (tipo === 'professor' && nota.professor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Você só pode atualizar notas que você mesmo registrou'
      });
    }

    // Atualiza a nota
    const notaAtualizada = await Nota.findByIdAndUpdate(
      notaId,
      {
        $set: {
          valor: valor,
          ...(bimestre && { bimestre }),
          ...(materia && { materia })
        }
      },
      { new: true }
    ).populate('aluno', 'nome email')
     .populate('professor', 'nome email');

    res.json({
      status: 'success',
      message: 'Nota atualizada com sucesso',
      data: notaAtualizada
    });
  } catch (err) {
    console.error('Erro ao atualizar nota:', err);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao atualizar nota',
      error: err.message
    });
  }
});

// Excluir nota
router.delete('/:notaId', verificarToken, async (req, res) => {
  try {
    const { tipo } = req.user;
    const { notaId } = req.params;

    // Verifica permissões
    if (tipo !== 'professor' && tipo !== 'gestor') {
      return res.status(403).json({
        status: 'error',
        message: 'Apenas professores e gestores podem excluir notas'
      });
    }

    // Busca a nota
    const nota = await Nota.findById(notaId);
    if (!nota) {
      return res.status(404).json({
        status: 'error',
        message: 'Nota não encontrada'
      });
    }

    // Verifica se o professor é o mesmo que criou a nota
    if (tipo === 'professor' && nota.professor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Você só pode excluir notas que você mesmo registrou'
      });
    }

    await nota.deleteOne();

    res.json({
      status: 'success',
      message: 'Nota excluída com sucesso'
    });
  } catch (err) {
    console.error('Erro ao excluir nota:', err);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao excluir nota',
      error: err.message
    });
  }
});

// Listar notas com filtros
router.get('/filtrar', verificarToken, async (req, res) => {
  try {
    const { materia, bimestre, aluno } = req.query;
    const { tipo, _id } = req.user;

    // Construir query de filtro
    const filtro = {};
    
    // Se for aluno, só pode ver suas próprias notas
    if (tipo === 'aluno') {
      filtro.aluno = _id;
    } else if (tipo === 'professor') {
      filtro.professor = _id;
    }

    // Adiciona filtros opcionais
    if (materia) filtro.materia = materia;
    if (bimestre) filtro.bimestre = parseInt(bimestre);
    if (aluno && tipo !== 'aluno') filtro.aluno = aluno;

    const notas = await Nota.find(filtro)
      .populate('aluno', 'nome email')
      .populate('professor', 'nome email')
      .sort({ createdAt: -1 }); // Ordena do mais recente para o mais antigo

    // Formata as notas para melhor visualização
    const notasFormatadas = notas.map(nota => ({
      id: nota._id,
      aluno: nota.aluno.nome,
      professor: nota.professor.nome,
      materia: nota.materia,
      valor: nota.valor,
      bimestre: nota.bimestre,
      dataLancamento: nota.createdAt
    }));

    res.json({
      status: 'success',
      data: notasFormatadas
    });
  } catch (err) {
    console.error('Erro ao filtrar notas:', err);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao filtrar notas',
      error: err.message
    });
  }
});

module.exports = router;
