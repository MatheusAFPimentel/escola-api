// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Token não fornecido'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ 
      _id: decoded._id, 
      ativo: true 
    });

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Usuário não encontrado ou inativo'
      });
    }

    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    console.error('Erro de autenticação:', error);
    res.status(401).json({
      status: 'error',
      message: 'Não autorizado'
    });
  }
};

module.exports = auth;
