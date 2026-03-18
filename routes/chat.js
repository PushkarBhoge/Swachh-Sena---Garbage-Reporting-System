const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.post('/send', chatController.sendMessage);
router.get('/history', chatController.getHistory);
router.delete('/clear', chatController.clearHistory);

module.exports = router;
