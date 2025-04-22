import { Router } from 'express';
import { AuthController } from '../controller/authController';
import { verifyToken } from '../middleware/authMiddleware'; // Імпортуємо verifyToken

const router = Router();
const authController = new AuthController();

router.post('/register', authController.register);

router.post('/login', authController.login);

router.get('/profile', verifyToken, authController.getProfile);


router.post('/forgot-password', authController.forgotPassword);

router.post('/reset-password', authController.resetPassword);

export default router;