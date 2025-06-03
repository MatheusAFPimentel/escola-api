const mongoose = require('mongoose');

const ComunicadoSchema = new mongoose.Schema({
  titulo: { 
    type: String, 
    required: true 
  },
  conteudo: { 
    type: String, 
    required: true 
  },
  tipo: {
    type: String,
    enum: ['geral', 'turma', 'aluno', 'professor'],
    required: true
  },
  destinatarios: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  turma: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Turma'
  },
  prioridade: {
    type: String,
    enum: ['baixa', 'media', 'alta'],
    default: 'media'
  },
  dataValidade: Date,
  lidoPor: [{
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    dataLeitura: Date
  }],
  ativo: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true 
});

// Índices para otimização
ComunicadoSchema.index({ tipo: 1 });
ComunicadoSchema.index({ turma: 1 });
ComunicadoSchema.index({ dataValidade: 1 });
ComunicadoSchema.index({ prioridade: 1 });

module.exports = mongoose.model('Comunicado', ComunicadoSchema);
