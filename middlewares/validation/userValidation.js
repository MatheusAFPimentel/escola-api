const Joi = require("joi");

const userSchema = {
  register: Joi.object({
    nome: Joi.string().required().min(3).max(100),
    email: Joi.string().required().email(),
    senha: Joi.string().required().min(6),
    tipo: Joi.string().required().valid('aluno', 'responsavel', 'professor', 'gestor'),
    telefone: Joi.string().pattern(/^\d{10,11}$/),
    matricula: Joi.string().when('tipo', {
      is: 'aluno',
      then: Joi.required()
    })
  }),

  login: Joi.object({
    email: Joi.string().required().email(),
    senha: Joi.string().required()
  })
};

module.exports = userSchema;
