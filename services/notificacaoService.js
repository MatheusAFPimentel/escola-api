const Notificacao = require('../models/Notificacao');
const User = require('../models/User');
const PushNotificationService = require('./pushNotificationService');

class NotificacaoService {
  static async notificarNovaNota(nota) {
    try {
      const aluno = await User.findById(nota.aluno);
      
      // Criar notificação para o aluno
      const notificacao = await Notificacao.create({
        destinatario: nota.aluno,
        tipo: 'nota_lancada',
        titulo: `Nova nota de ${nota.materia}`,
        mensagem: `Você recebeu nota ${nota.valor} no ${nota.bimestre}º bimestre`,
        dados: {
          notaId: nota._id,
          materia: nota.materia,
          valor: nota.valor,
          bimestre: nota.bimestre
        }
      });

      // Enviar push notification para o aluno
      await PushNotificationService.enviarNotificacao(
        nota.aluno,
        notificacao.titulo,
        notificacao.mensagem,
        notificacao.dados
      );

      // Se o aluno tiver responsável vinculado, notifica também
      if (aluno.responsavel) {
        const notificacaoResp = await Notificacao.create({
          destinatario: aluno.responsavel,
          tipo: 'nota_lancada',
          titulo: `Nova nota de ${nota.materia} - ${aluno.nome}`,
          mensagem: `${aluno.nome} recebeu nota ${nota.valor} em ${nota.materia} no ${nota.bimestre}º bimestre`,
          dados: {
            notaId: nota._id,
            materia: nota.materia,
            valor: nota.valor,
            bimestre: nota.bimestre,
            aluno: {
              id: aluno._id,
              nome: aluno.nome
            }
          }
        });

        // Enviar push notification para o responsável
        await PushNotificationService.enviarNotificacao(
          aluno.responsavel,
          notificacaoResp.titulo,
          notificacaoResp.mensagem,
          notificacaoResp.dados
        );
      }
    } catch (error) {
      console.error('Erro ao criar notificações:', error);
      throw error;
    }
  }

  static async notificarMediaBaixa(aluno, materia, media) {
    try {
      const mensagem = `Sua média em ${materia} está ${media}. Procure seu professor para orientações.`;
      
      await Notificacao.create({
        destinatario: aluno._id,
        tipo: 'media_baixa',
        titulo: `Atenção: Média baixa em ${materia}`,
        mensagem,
        dados: {
          materia,
          media
        }
      });

      if (aluno.responsavel) {
        await Notificacao.create({
          destinatario: aluno.responsavel,
          tipo: 'media_baixa',
          titulo: `Atenção: ${aluno.nome} - Média baixa em ${materia}`,
          mensagem: `A média de ${aluno.nome} em ${materia} está ${media}.`,
          dados: {
            materia,
            media,
            aluno: {
              id: aluno._id,
              nome: aluno.nome
            }
          }
        });
      }
    } catch (error) {
      console.error('Erro ao criar notificação de média baixa:', error);
    }
  }

  static async notificarFrequenciaBaixa(aluno, materia, percentual) {
    const mensagem = `Sua frequência em ${materia} está em ${percentual}%. Procure seu professor para orientações.`;

    // Notifica o aluno
    await Notificacao.create({
      destinatario: aluno._id,
      tipo: 'frequencia_baixa',
      titulo: `Frequência Baixa - ${materia}`,
      mensagem,
      dados: {
        materia,
        percentual
      }
    });

    // Notifica o professor
    const professor = await User.findOne({ tipo: 'professor' });
    if (professor) {
      await Notificacao.create({
        destinatario: professor._id,
        tipo: 'frequencia_baixa',
        titulo: `Frequência Baixa - ${aluno.nome}`,
        mensagem: `A frequência de ${aluno.nome} em ${materia} está em ${percentual}%.`,
        dados: {
          aluno: aluno._id,
          materia,
          percentual
        }
      });
    }
  }
}

module.exports = NotificacaoService; 