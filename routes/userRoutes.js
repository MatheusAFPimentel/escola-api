const express = require("express");
const router = express.Router();
const { registerUser, loginUser } = require("../controllers/userController");
const validate = require("../middlewares/validate");
const { registerUserSchema, loginUserSchema } = require("../validations/userValidation");

router.post("/register", validate(registerUserSchema), registerUser);
router.post("/login", validate(loginUserSchema), loginUser);

module.exports = router;
