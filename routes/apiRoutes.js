const express = require('express');
const apiController = require('../controllers/apiController');

const router = express.Router();

// Route hanya memetakan URL ke controller
router.get('/status', apiController.getStatus);
router.get('/produk', apiController.getProduk);

module.exports = router;
