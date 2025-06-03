const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], { 
      abortEarly: false,
      stripUnknown: true
    });
    
    if (!error) return next();

    const errors = error.details.map(detail => ({
      campo: detail.path.join('.'),
      mensagem: detail.message
    }));

    return res.status(400).json({
      status: 'error',
      message: 'Dados inválidos',
      errors
    });
  };
};

module.exports = validate;
