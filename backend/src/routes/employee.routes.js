import express from 'express';
const router = express.Router();

import ctrl from '../controllers/employee.controller.js';
import auth from '../../middleware/auth.middleware.js';
import validate from '../utils/validate.js';
import validator from '../validators/employee.validator.js';

router.post('/', auth("Admin"), validator.createEmployee(), validate, ctrl.create);

router.get('/getalldoc', auth("Patient"), ctrl.getAllDoctor);
router.get('/', auth(["Admin", "Receptionist","Doctor"]), ctrl.findAll);
router.get('/:id', auth(process.env.ALLROLE), ctrl.findById);

router.put('/:id', auth("Admin"), validator.updateEmployee(), validate, ctrl.update);
router.delete('/:id', auth("Admin"), ctrl.remove);
router.put('/:id/restore', auth("Admin"), ctrl.restore);

export default router;