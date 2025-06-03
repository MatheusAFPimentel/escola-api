const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function limparTokensTeste() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🟢 Conectado ao MongoDB');

    // Remove todos os tokens de teste
    const resultado = await User.updateMany(
      {}, 
      { $set: { fcmTokens: [] } }
    );

    console.log('Tokens removidos:', resultado);
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

limparTokensTeste(); 