const Joi = require("joi");

const createNotaSchema = Joi.object({
  alunoId: Joi.string().required(),
  disciplina: Joi.string().required(),
  valor: Joi.number().min(0).max(10).required(),
  bimestre: Joi.string().valid("1º", "2º", "3º", "4º").required()
});

module.exports = {
  createNotaSchema
};
