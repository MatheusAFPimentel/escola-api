const mongoose = require('mongoose');

const CalendarioAcademicoSchema = new mongoose.Schema({
  titulo: { 
    type: String, 
    required: true 
  },
  descricao: String,
  dataInicio: { 
    type: Date, 
    required: true 
  },
  dataFim: { 
    type: Date, 
    required: true 
  },
  tipo: {
    type: String,
    enum: ['periodo_letivo', 'feriado', 'evento', 'avaliacao', 'trabalho'],
    required: true
  },
  turma: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Turma'
  },
  recorrencia: {
    tipo: {
      type: String,
      enum: ['nenhuma', 'diaria', 'semanal', 'mensal', 'anual'],
      default: 'nenhuma'
    },
    intervalo: {
      type: Number,
      default: 1
    },
    fim: Date
  },
  ativo: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true 
});

// Índices para otimização de consultas
CalendarioAcademicoSchema.index({ dataInicio: 1, dataFim: 1 });
CalendarioAcademicoSchema.index({ tipo: 1 });
CalendarioAcademicoSchema.index({ turma: 1 });

module.exports = mongoose.model('CalendarioAcademico', CalendarioAcademicoSchema);
