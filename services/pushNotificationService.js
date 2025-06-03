const admin = require('firebase-admin');
const User = require('../models/User');

// Verifica se as variáveis de ambiente necessárias estão definidas
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Erro: Variáveis de ambiente ausentes:', missingEnvVars);
  console.error('Por favor, configure as variáveis de ambiente no arquivo .env');
} else {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
    console.log('Firebase Admin SDK inicializado com sucesso');
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin SDK:', error);
  }
}

class PushNotificationService {
  static async enviarNotificacao(destinatarioId, titulo, mensagemTexto, dados = {}) {
    // Se o Firebase não estiver configurado, apenas registra a notificação no banco
    if (!admin.apps.length) {
      console.log('Firebase não configurado. Notificação será salva apenas no banco de dados.');
      return null;
    }

    try {
      const usuario = await User.findById(destinatarioId);
      
      // Se não houver tokens FCM, apenas retorna
      if (!usuario?.fcmTokens?.length) {
        return null;
      }

      const tokens = usuario.fcmTokens.map(t => t.token);

      const mensagemNotificacao = {
        notification: {
          title: titulo,
          body: mensagemTexto
        },
        data: {
          ...dados,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          // Adiciona dados úteis para o app
          tipo: dados.tipo || 'geral',
          timestamp: new Date().toISOString()
        }
      };

      // Envia para todos os dispositivos do usuário
      const resultados = await Promise.all(
        tokens.map(async token => {
          try {
            return await admin.messaging().send({
              ...mensagemNotificacao,
              token
            });
          } catch (error) {
            if (error.code === 'messaging/invalid-argument' || 
                error.code === 'messaging/registration-token-not-registered') {
              // Token inválido ou expirado, marca para remoção
              return { token, remover: true };
            }
            throw error;
          }
        })
      );

      // Remove tokens inválidos ou expirados
      const tokensParaRemover = resultados
        .filter(r => r?.remover)
        .map(r => r.token);

      if (tokensParaRemover.length > 0) {
        await User.updateOne(
          { _id: destinatarioId },
          { $pull: { fcmTokens: { token: { $in: tokensParaRemover } } } }
        );
      }

      return resultados.filter(r => !r?.remover);
    } catch (error) {
      console.error('Erro ao enviar notificação push:', error);
      return null;
    }
  }

  static async atualizarToken(userId, novoToken, dispositivo) {
    try {
      // Valida o formato do token (formato básico FCM)
      if (!novoToken || typeof novoToken !== 'string' || novoToken.length < 100) {
        throw new Error('Token FCM inválido');
      }

      // Remove o token se já existir
      await User.updateOne(
        { _id: userId },
        { $pull: { fcmTokens: { token: novoToken } } }
      );

      // Adiciona o novo token
      await User.updateOne(
        { _id: userId },
        {
          $push: {
            fcmTokens: {
              token: novoToken,
              dispositivo,
              ultimoAcesso: new Date()
            }
          }
        }
      );

      return true;
    } catch (error) {
      console.error('Erro ao atualizar token FCM:', error);
      throw error;
    }
  }

  // Método para remover todos os tokens de um usuário
  static async removerTokens(userId) {
    try {
      await User.updateOne(
        { _id: userId },
        { $set: { fcmTokens: [] } }
      );
      return true;
    } catch (error) {
      console.error('Erro ao remover tokens FCM:', error);
      throw error;
    }
  }
}

module.exports = PushNotificationService; 