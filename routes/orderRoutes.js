import { Router } from 'express';
import authMiddleware from '../middleware/authentication.js';
import controllerOrder from '../controllers/orderController.js';

const router = Router();

router
    .route('/')
    .post(
        authMiddleware.authenticateUser, 
        controllerOrder.createOrder)
    .get(
        authMiddleware.authenticateUser, 
        authMiddleware.authorizePermissions('admin'),
        controllerOrder. getAllOrders);

router
    .route('/showAllMyOrders')
    .get(
        authMiddleware.authenticateUser, 
        controllerOrder.getCurrentUserOrders
    );

router
    .route('/:id')
    .get(
        authMiddleware.authenticateUser, 
        controllerOrder.getSingleOrder
    )
    .patch(
        authMiddleware.authenticateUser, 
        controllerOrder.updateOrder
    );

export default router;
