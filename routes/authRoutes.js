import { Router } from "express";
import controllerAuth from "../controllers/authController.js";
import authMiddleware from "../middleware/authentication.js";

const router = Router();

// Ensure that all the routes matches the frontend

router.post("/register", controllerAuth.register);

router.post("/login", controllerAuth.login);

// in the e-commerce api proj, it is a public 'get' route but here we change to 'delete'
// because we want to delete the tokens
router.delete(
	"/logout",
	authMiddleware.authenticateUser,
	controllerAuth.logout
);

router.post("/verify-email", controllerAuth.verifyEmail);

router.post("/forgot-password", controllerAuth.forgotPassword);

router.post("/reset-password", controllerAuth.resetPassword);

export default router;
