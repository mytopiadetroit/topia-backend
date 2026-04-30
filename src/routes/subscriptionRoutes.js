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
  adminUpgradeToTopiaCircle,
  updateBillingDate,
  updatePaymentMethod,
  toggleSubscriptionStatus,
  updatePaymentInfo,
  updatePaymentStatus
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
router.put('/admin/:subscriptionId/billing-date', authenticate, authorizationRole('admin'), updateBillingDate)
router.put('/admin/:subscriptionId/payment-method', authenticate, authorizationRole('admin'), updatePaymentMethod)
router.put('/admin/:subscriptionId/status', authenticate, authorizationRole('admin'), toggleSubscriptionStatus)
router.put('/admin/:id/payment-info', authenticate, authorizationRole('admin'), updatePaymentInfo)
router.put('/admin/:id/payment-status', authenticate, authorizationRole('admin'), updatePaymentStatus)

module.exports = router