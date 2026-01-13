import express from 'express';
const router = express.Router();

import ctrl from '../controllers/notification.controller.js';
import auth from '../../middleware/auth.middleware.js';
import validate from '../utils/validate.js';
import validator from '../validators/notification.validator.js';

router.post('/', auth(["Admin"]), validator.createNotification(), validate, ctrl.create);

router.get('/unread-count', auth([]), ctrl.getUnreadCount);
router.get('/', auth([]), validator.getNotifications(), validate, ctrl.findAll);

router.put('/:id/read', auth([]), validator.markAsRead(), validate, ctrl.markAsRead);
router.put('/read-all', auth([]), ctrl.markAllAsRead);

router.delete('/:id', auth([]), ctrl.remove);
router.put('/:id/restore', auth("Admin"), ctrl.restore);

// Kế thừa
router.get('/stream', (req, res) => {
    try {
        const token = req.query.token || (req.cookies && req.cookies.token);
        if (!token) {
            res.status(401).end('Unauthorized');
            return;
        }
        const jwt = require('jsonwebtoken');
        let payload;
        try {
            payload = jwt.verify(String(token), process.env.JWT_SECRET);
        } catch (e) {
            res.status(401).end('Invalid token');
            return;
        }

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        });
        res.write(':ok\n\n');

        const { addClient } = require('../utils/notification-broadcaster.js');
        addClient(res, payload);

        const keepAlive = setInterval(() => {
            try {
                res.write(':\n\n');
            } catch (e) {
                clearInterval(keepAlive);
            }
        }, 20000);

        req.on('close', () => {
            clearInterval(keepAlive);
        });
    } catch (err) {
        console.error('SSE stream error:', err);
        res.status(500).end();
    }
});
//
router.get('/:id', auth([]), ctrl.findById);

export default router;
