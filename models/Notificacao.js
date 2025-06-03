const mongoose = require('mongoose');

const NotificacaoSchema = new mongoose.Schema({
  destinatario: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  tipo: { 
    type: String, 
    enum: ['nota_lancada', 'media_baixa', 'evento', 'geral'],
    required: true 
  },
  titulo: { 
    type: String, 
    required: true 
  },
  mensagem: { 
    type: String, 
    required: true 
  },
  lida: { 
    type: Boolean, 
    default: false 
  },
  dados: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Notificacao', NotificacaoSchema);
