// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Importação das rotas
const authRoutes = require('./routes/authRoutes');
const notaRoutes = require('./routes/notaRoutes');
const eventoRoutes = require('./routes/eventoRoutes');
const tarefaRoutes = require('./routes/tarefaRoutes');
const professorRoutes = require('./routes/professorRoutes');
const notificacaoRoutes = require('./routes/notificacaoRoutes');
const contatoRoutes = require('./routes/contatoRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const frequenciaRoutes = require('./routes/frequenciaRoutes');
const calendarioRoutes = require('./routes/calendarioRoutes');
const comunicadoRoutes = require('./routes/comunicadoRoutes');

const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/notas', notaRoutes);
app.use('/api/eventos', eventoRoutes);
app.use('/api/tarefas', tarefaRoutes);
app.use('/api/professor', professorRoutes);
app.use('/api/notificacoes', notificacaoRoutes);
app.use('/api/contatos', contatoRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/frequencias', frequenciaRoutes);
app.use('/api/calendario', calendarioRoutes);
app.use('/api/comunicados', comunicadoRoutes);

// Rota inicial
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'API Escolar funcionando 🚀'
  });
});

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Algo deu errado!'
  });
});

// Conexão com MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('🟢 Conectado ao MongoDB');
    app.listen(process.env.PORT || 5000, () =>
      console.log(`🚀 Servidor rodando na porta ${process.env.PORT || 5000}`)
    );
  })
  .catch(err => console.error('🔴 Erro ao conectar no MongoDB:', err));
