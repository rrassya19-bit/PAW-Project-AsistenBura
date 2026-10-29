const express = require('express');
const pageController = require('../controllers/pageController');

const router = express.Router();

// Route hanya memetakan URL ke controller
router.get('/', pageController.home);

module.exports = router;
