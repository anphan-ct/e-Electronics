const express = require("express");
const router = express.Router();

const authController = require("../controllers/userController");
const verifyToken = require("../middleware/authMiddleware");


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

module.exports = router;