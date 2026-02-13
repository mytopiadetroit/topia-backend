const express = require('express')
const router = express.Router()
const {
  createSubscription,
  getSubscription,
  updateSubscription,
  cancelSubscription,
  getSubscriptionSettings,
  updateSubscriptionSettings,
  getAllSubscriptions,
  updateSubscriptionAdmin,
  adminUpgradeToTopiaCircle
} = require('../controllers/subscriptionController')
const { authenticate, authorizationRole } = require('../middlewares/authMiddleware')

router.get('/settings', getSubscriptionSettings)
router.post('/', authenticate, createSubscription)
router.get('/my-subscription', authenticate, getSubscription)
router.put('/my-subscription', authenticate, updateSubscription)
router.post('/cancel', authenticate, cancelSubscription)
router.put('/settings', authenticate, authorizationRole('admin'), updateSubscriptionSettings)
router.get('/admin/all', authenticate, authorizationRole('admin'), getAllSubscriptions)
router.put('/admin/:id', authenticate, authorizationRole('admin'), updateSubscriptionAdmin)
router.post('/admin/upgrade/:userId', authenticate, authorizationRole('admin'), adminUpgradeToTopiaCircle)

module.exports = router