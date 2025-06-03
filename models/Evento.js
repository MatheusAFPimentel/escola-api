// models/Evento.js
const mongoose = require('mongoose');

const EventoSchema = new mongoose.Schema({
  titulo: { 
    type: String, 
    required: true 
  },
  descricao: { 
    type: String, 
    required: true 
  },
  tipo: { 
    type: String, 
    enum: ['prova', 'trabalho', 'reuniao', 'feriado', 'outro'],
    required: true 
  },
  dataInicio: { 
    type: Date, 
    required: true 
  },
  dataFim: { 
    type: Date, 
    required: true 
  },
  turmas: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Turma' 
  }],
  criadorEvento: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  materia: { 
    type: String,
    required: function() {
      return this.tipo === 'prova' || this.tipo === 'trabalho';
    }
  },
  local: { 
    type: String 
  },
  status: { 
    type: String, 
    enum: ['agendado', 'cancelado', 'concluido'],
    default: 'agendado' 
  }
}, { 
  timestamps: true 
});

// Índices para melhorar performance das consultas
EventoSchema.index({ dataInicio: 1, dataFim: 1 });
EventoSchema.index({ turmas: 1 });
EventoSchema.index({ tipo: 1 });

module.exports = mongoose.model('Evento', EventoSchema);
