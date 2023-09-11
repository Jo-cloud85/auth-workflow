import { Router } from 'express';
import controllerAuth from '../controllers/authController.js';

const router = Router();

router.post('/register', controllerAuth.register);
router.post('/login', controllerAuth.login);
router.get('/logout', controllerAuth.logout);
router.post('/verify-email', controllerAuth.verifyEmail)

export default router;
