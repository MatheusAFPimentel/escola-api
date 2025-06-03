// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Registro de usuário
router.post('/register', async (req, res, next) => {
  try {
    // Verifica se o email já existe
    const emailExists = await User.findOne({ email: req.body.email });
    if (emailExists) {
      return res.status(400).json({
        status: 'error',
        message: 'Email já cadastrado'
      });
    }

    // Verifica se a matrícula já existe (caso seja aluno)
    if (req.body.tipo === 'aluno' && req.body.matricula) {
      const matriculaExists = await User.findOne({ matricula: req.body.matricula });
      if (matriculaExists) {
        return res.status(400).json({
          status: 'error',
          message: 'Matrícula já cadastrada'
        });
      }
    }

    const { senha, ...userData } = req.body;
    
    // Criptografa a senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(senha, salt);
    
    const user = await User.create({
      ...userData,
      senha: hashedPassword,
      ativo: true
    });

    // Remove a senha do objeto de resposta
    const userResponse = user.toObject();
    delete userResponse.senha;

    // Gera o token JWT
    const token = jwt.sign(
      { _id: user._id, tipo: user.tipo },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      status: 'success',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, senha } = req.body;

    // Busca o usuário sem filtrar por ativo inicialmente
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Credenciais inválidas'
      });
    }

    // Verifica se o usuário está ativo
    if (!user.ativo) {
      return res.status(401).json({
        status: 'error',
        message: 'Usuário inativo'
      });
    }

    const isValidPassword = await bcrypt.compare(senha, user.senha);

    if (!isValidPassword) {
      return res.status(401).json({
        status: 'error',
        message: 'Credenciais inválidas'
      });
    }

    // Gera o token JWT
    const token = jwt.sign(
      { _id: user._id, tipo: user.tipo },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove a senha do objeto de resposta
    const userResponse = user.toObject();
    delete userResponse.senha;

    res.json({
      status: 'success',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
