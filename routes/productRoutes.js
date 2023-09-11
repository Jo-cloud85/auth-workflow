import { Router } from 'express';
import authMiddleware from '../middleware/authentication.js';
import controllerProduct from '../controllers/productController.js';
import controllerReview from '../controllers/reviewController.js';

const router = Router();

router
    .route('/')
    .post(
        [
            authMiddleware.authenticateUser, 
            authMiddleware.authorizePermissions('admin')
        ], 
        controllerProduct.createProduct
    )
    .get(
        controllerProduct.getAllProducts
    );

router
    .route('/uploadImage')
    .post(
        [
            authMiddleware.authenticateUser, 
            authMiddleware.authorizePermissions('admin')
        ], 
        controllerProduct.uploadImage
    );

router
    .route('/:id')
    .get(
        controllerProduct.getSingleProduct
    )
    .patch(
        [
            authMiddleware.authenticateUser, 
            authMiddleware.authorizePermissions('admin')
        ], 
        controllerProduct.updateProduct
    )
    .delete(
        [
            authMiddleware.authenticateUser, 
            authMiddleware.authorizePermissions('admin')
        ], 
        controllerProduct.deleteProduct
    );

router
    .route('/:id/reviews')
    .get(
        controllerReview.getSingleProductReviews
    );

export default router;
