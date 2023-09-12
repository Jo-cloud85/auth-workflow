import { Router } from 'express';
import controllerAuth from '../controllers/authController.js';
import authMiddleware from '../middleware/authentication.js'

const router = Router();

router.post('/register', controllerAuth.register);
router.post('/login', controllerAuth.login);
router.delete('/logout', authMiddleware.authenticateUser, controllerAuth.logout);
router.post('/verify-email', controllerAuth.verifyEmail)
router.post('/forgot-password', controllerAuth.forgotPassword)
router.post('/reset-password', controllerAuth.resetPassword)

export default router;
