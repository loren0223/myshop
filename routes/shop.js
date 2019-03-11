const path = require('path');

const express = require('express');

const isAuth = require('../middleware/is-auth');

// Import controller for shop route
const shopController = require('../controllers/shop');
// Initiate shop route
const router = express.Router();

// Define shop route
router.get('/', shopController.getIndex);

router.get('/products', shopController.getProducts);

router.get('/products/:productId', shopController.getProduct);

router.get('/cart', isAuth, shopController.getCart);

router.post('/cart', isAuth, shopController.postCart);

router.post('/cart-delete-item', isAuth, shopController.postCartDeleteProduct);

router.post('/create-order', isAuth, shopController.postOrder);

router.get('/orders', isAuth, shopController.getOrders);

router.get('/order/:orderId', isAuth, shopController.getOrderInvoice);

// Export shop route
module.exports = router;
