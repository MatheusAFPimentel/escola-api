const mongoose = require('mongoose');

const TurmaSchema = new mongoose.Schema({
  nome: { 
    type: String, 
    required: true 
  },
  ano: { 
    type: Number, 
    required: true 
  },
  professor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  disciplina: {
    type: String,
    required: true
  },
  alunos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  ativo: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Turma', TurmaSchema);
