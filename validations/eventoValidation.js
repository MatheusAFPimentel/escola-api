const Joi = require("joi");

const createEventoSchema = Joi.object({
  titulo: Joi.string().required(),
  descricao: Joi.string().optional().allow(""),
  data: Joi.date().required(),
  publico: Joi.string().valid("alunos", "professores", "responsaveis", "todos").required()
});

const updateEventoSchema = Joi.object({
  titulo: Joi.string().optional(),
  descricao: Joi.string().optional().allow(""),
  data: Joi.date().optional(),
  publico: Joi.string().valid("alunos", "professores", "responsaveis", "todos").optional()
});

module.exports = {
  createEventoSchema,
  updateEventoSchema
};
