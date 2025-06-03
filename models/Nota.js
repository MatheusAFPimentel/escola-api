// models/Nota.js
const mongoose = require('mongoose');

const NotaSchema = new mongoose.Schema({
  aluno: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  materia: { type: String, required: true },
  valor: { type: Number, required: true },
  bimestre: { type: Number, enum: [1, 2, 3, 4], required: true },
  professor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Nota', NotaSchema);
