import express from 'express';
const router = express.Router();

import ctrl from "../controllers/report.controller.js";
import auth from "../../middleware/auth.middleware.js";

router.get("/medicine/inventory", auth(["Admin", "Accountant"]), ctrl.getMedicineInventory);
router.get("/medicine/inventory/quantity", auth(["Admin", "Accountant"]), ctrl.getTotalMedicineQuantity);
router.get("/medicine/inventory/value", auth(["Admin", "Accountant"]), ctrl.getTotalMedicineValue);

router.get("/cashflow", auth(["Admin", "Accountant"]), ctrl.getCashflow);
router.get("/cashflow/month", auth(["Admin", "Accountant"]), ctrl.getCashflowByMonth);
router.get("/cashflow/year", auth(["Admin", "Accountant"]), ctrl.getCashflowByYear);

router.get("/profit-loss/daily", auth(["Admin", "Accountant"]), ctrl.getProfitLossDaily);
router.get("/profit-loss/monthly", auth(["Admin", "Accountant"]), ctrl.getProfitLossMonthly);
router.get("/profit-loss/yearly", auth(["Admin", "Accountant"]), ctrl.getProfitLossYearly);

router.get("/export", auth(["Admin", "Accountant"]), ctrl.exportReport);

export default router;
