const express = require('express');
const router = express.Router();
const { getTaxSettings, updateTaxSettings } = require('../controllers/taxController');

router.route('/')
  .get(getTaxSettings)
  .put(updateTaxSettings);

module.exports = router;
