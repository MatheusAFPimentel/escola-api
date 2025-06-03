// models/Tarefa.js
const mongoose = require('mongoose');

const TarefaSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  descricao: { type: String },
  dataEntrega: { type: Date, required: true },
  aluno: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  professor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ativo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Tarefa', TarefaSchema);
