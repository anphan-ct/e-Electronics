const express = require("express");
const router = express.Router();

const authController = require("../controllers/userController");
const verifyToken = require("../middleware/authMiddleware");
const verifyRecaptcha = require("../middleware/recaptchaMiddleware");
const { loginSecurity } = require("../middleware/loginSecurityMiddleware");


// REGISTER
router.post("/register", authController.register);

// LOGIN
router.post("/login", authController.login);

// GET USER PROFILE
router.get("/profile", verifyToken, authController.getProfile);

// GET ALL USER 
router.get("/users", verifyToken, authController.getAllUsers);

// UPDATE USER PROFILE
router.put("/update-profile", verifyToken, authController.updateProfile);

// CHANGE PASSWORD
router.put("/change-password", verifyToken, authController.changePassword);

// GOOGLE LOGIN
router.post("/google", authController.loginGoogle);

// LINK GOOGLE ACCOUNT
router.post("/google/link", authController.linkGoogleAccount);

module.exports = router;