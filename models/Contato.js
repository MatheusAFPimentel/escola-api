const mongoose = require('mongoose');

const ContatoSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tipo: {
    type: String,
    enum: ['professor', 'administracao', 'coordenacao', 'secretaria'],
    required: true
  },
  cargo: {
    type: String,
    required: true
  },
  disciplinas: [{
    type: String
  }],
  horarioAtendimento: [{
    dia: {
      type: String,
      enum: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
      required: true
    },
    horarioInicio: {
      type: String,
      required: true
    },
    horarioFim: {
      type: String,
      required: true
    },
    local: String
  }],
  telefone: {
    type: String
  },
  emailProfissional: {
    type: String,
    required: true
  },
  sala: String,
  departamento: String,
  ativo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para melhorar performance das consultas
ContatoSchema.index({ tipo: 1 });
ContatoSchema.index({ usuario: 1 });
ContatoSchema.index({ 'disciplinas': 1 });

module.exports = mongoose.model('Contato', ContatoSchema); 