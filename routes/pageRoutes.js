const express = require('express');
const pageController = require('../controllers/pageController');

const router = express.Router();

// Route halaman publik; pengelolaan menu dipindahkan ke area /admin
router.get('/', pageController.home);

module.exports = router;
