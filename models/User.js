// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  senha: { type: String, required: true },
  tipo: { type: String, enum: ['aluno', 'responsavel', 'professor', 'gestor'], required: true },
  ativo: { type: Boolean, default: true },
  fcmTokens: [{
    token: { type: String, required: true },
    dispositivo: { type: String, required: true },
    ultimoAcesso: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
