const auth = require('./authMiddleware');
const validate = require('./validationMiddleware');
const userValidation = require('./validation/userValidation');

module.exports = {
  auth,
  validate,
  validation: {
    user: userValidation
  }
};
