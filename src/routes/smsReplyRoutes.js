const express = require('express');
const router = express.Router();
const smsReplyController = require('../controllers/smsReplyController');
const { authenticate, authorizationRole } = require('../middlewares/authMiddleware');

router.post('/webhook', smsReplyController.receiveSmsReply);
router.use(authenticate);
router.use(authorizationRole('admin'));

router.get('/', smsReplyController.getSmsReplies);
router.get('/stats', smsReplyController.getSmsReplyStats);

router.post('/:replyId/respond', smsReplyController.respondToSmsReply);

router.patch('/:replyId/status', smsReplyController.updateSmsReplyStatus);


router.get('/:replyId', smsReplyController.getSmsReplyDetails);

module.exports = router;