const Joi = require("joi");

const createTarefaSchema = Joi.object({
  titulo: Joi.string().required(),
  descricao: Joi.string().optional().allow(""),
  dataEntrega: Joi.date().required(),
  turma: Joi.string().required(),
  professorId: Joi.string().required()
});

const updateTarefaSchema = Joi.object({
  titulo: Joi.string().optional(),
  descricao: Joi.string().optional().allow(""),
  dataEntrega: Joi.date().optional(),
  turma: Joi.string().optional(),
  professorId: Joi.string().optional()
});

module.exports = {
  createTarefaSchema,
  updateTarefaSchema
};
