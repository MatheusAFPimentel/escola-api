const mongoose = require('mongoose');

const FrequenciaSchema = new mongoose.Schema({
  turma: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Turma',
    required: true
  },
  data: {
    type: Date,
    required: true
  },
  registros: [{
    aluno: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['presente', 'ausente', 'justificado'],
      required: true
    },
    justificativa: {
      type: String,
      default: null
    }
  }],
  professor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  observacao: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Índices para otimização de consultas
FrequenciaSchema.index({ turma: 1, data: 1 });
FrequenciaSchema.index({ 'registros.aluno': 1 });

module.exports = mongoose.model('Frequencia', FrequenciaSchema);