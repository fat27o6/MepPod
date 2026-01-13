import express from 'express';
const router = express.Router();

import authCtrl from '../controllers/auth.controller.js';
import auth from '../../middleware/auth.middleware.js';

router.post('/register', authCtrl.register);
router.post('/register-patient', authCtrl.registerPatient);

router.post('/login', authCtrl.login);
router.post('/login-patient', authCtrl.loginPatient);

router.post('/logout', auth(process.env.ALLROLE), authCtrl.logout);
router.post('/forgot-password', authCtrl.forgotPassword);
router.get('/validate', auth(process.env.ALLROLE), authCtrl.validateToken);

router.get('/account/:id', auth(process.env.ALLROLE), authCtrl.getAccount);
router.get('/employee/:id', auth("Admin"), authCtrl.getEmployee);
router.patch('/resetpass/:id', auth("Admin"), authCtrl.resetpass);
router.put('/account/:id', auth(process.env.ALLROLE), authCtrl.updateAccount);

export default router;