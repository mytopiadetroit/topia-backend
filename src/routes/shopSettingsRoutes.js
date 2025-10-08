const express = require('express');
const router = express.Router();
// const { authenticate } = require('../middlewares/authMiddleware');
const { getShopSettings, updateShopSettings } = require('../controllers/shopSettingsController');

router.route('/')
  .get(getShopSettings)
  .put(updateShopSettings);

module.exports = router;