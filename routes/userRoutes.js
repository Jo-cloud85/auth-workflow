import { Router } from 'express';
import authMiddleware from '../middleware/authentication.js';
import controllerUser from '../controllers/userController.js';

const router = Router();

router
    .route('/')
    .get(
        authMiddleware.authenticateUser, 
        authMiddleware.authorizePermissions('admin'), 
        controllerUser.getAllUsers
    );

router
    .route('/showMe')
    .get(
        authMiddleware.authenticateUser, 
        controllerUser.showCurrentUser
    );

router
    .route('/updateUser')
    .patch(
        authMiddleware.authenticateUser, 
        controllerUser.updateUser
    );

router
    .route('/updateUserPassword')
    .patch(
        authMiddleware.authenticateUser, 
        controllerUser.updateUserPassword
    );

router
    .route('/:id')
    .get(
        authMiddleware.authenticateUser, 
        controllerUser.getSingleUser
    );

export default router;
