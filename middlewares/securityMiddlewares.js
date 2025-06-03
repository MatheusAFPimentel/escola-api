const xss = require('xss-clean');
const { logger } = require('./loggingMiddleware');

// Middleware para detectar e registrar tentativas de ataque
const securityAudit = (req, res, next) => {
  const suspiciousPatterns = [
    /(<|%3C)script[\s\S]*?(>|%3E)/i,  // Scripts
    /(javascript|vbscript):/i,         // JavaScript/VBScript protocols
    /ON\w+=['"].*?['"]/i,             // Event handlers
    /union\s+select/i,                 // SQL injection
    /exec\s*\(/i                       // Code execution
  ];

  const body = JSON.stringify(req.body);
  const params = JSON.stringify(req.params);
  const query = JSON.stringify(req.query);

  const detectSuspiciousPattern = (content) => {
    return suspiciousPatterns.some(pattern => pattern.test(content));
  };

  if (detectSuspiciousPattern(body) || 
      detectSuspiciousPattern(params) || 
      detectSuspiciousPattern(query)) {
    logger.warn({
      message: 'Tentativa suspeita detectada',
      ip: req.ip,
      method: req.method,
      path: req.path,
      body: req.body,
      params: req.params,
      query: req.query,
      user: req.user ? req.user._id : 'anonymous'
    });
  }

  next();
};

// Middleware para validar e sanitizar headers
const headerSecurity = (req, res, next) => {
  // Remove headers que podem expor informações sensíveis
  const secureHeaders = [
    'X-Powered-By',
    'Server',
    'X-AspNet-Version',
    'X-AspNetMvc-Version'
  ];

  secureHeaders.forEach(header => {
    res.removeHeader(header);
  });

  // Adiciona headers de segurança
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
};

// Middleware para verificar roles
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    next();
  };
};

module.exports = {
  xssProtection: xss(),
  securityAudit,
  headerSecurity,
  checkRole
};
