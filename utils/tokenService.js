const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/RefreshToken');

const tokenService = {
  generateTokens: async (user, ip) => {
    // Access Token - curta duração (15 minutos)
    const accessToken = jwt.sign(
      { 
        _id: user._id,
        tipo: user.tipo,
        version: user.tokenVersion // para invalidação global
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Refresh Token - longa duração (7 dias)
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Salva o refresh token
    await RefreshToken.create({
      user: user._id,
      token: refreshToken,
      expires: refreshTokenExpires,
      createdByIp: ip
    });

    return {
      accessToken,
      refreshToken
    };
  },

  refreshTokens: async (refreshToken, ip) => {
    const refreshTokenDoc = await RefreshToken.findOne({ 
      token: refreshToken,
      revokedDate: { $exists: false }
    }).populate('user');

    if (!refreshTokenDoc || !refreshTokenDoc.isActive) {
      throw new Error('Invalid refresh token');
    }

    // Gera novo par de tokens
    const { accessToken, refreshToken: newRefreshToken } = 
      await tokenService.generateTokens(refreshTokenDoc.user, ip);

    // Revoga o token antigo
    refreshTokenDoc.revokedDate = new Date();
    refreshTokenDoc.revokedByIp = ip;
    refreshTokenDoc.replacedByToken = newRefreshToken;
    await refreshTokenDoc.save();

    return {
      accessToken,
      refreshToken: newRefreshToken
    };
  },

  revokeToken: async (refreshToken, ip) => {
    const refreshTokenDoc = await RefreshToken.findOne({ token: refreshToken });
    
    if (!refreshTokenDoc || !refreshTokenDoc.isActive) {
      throw new Error('Invalid refresh token');
    }

    // Revoga o token
    refreshTokenDoc.revokedDate = new Date();
    refreshTokenDoc.revokedByIp = ip;
    await refreshTokenDoc.save();
  }
};

module.exports = tokenService;
