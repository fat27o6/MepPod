import Invoice from '../models/invoice.model.js';
import Payment from '../models/payment.model.js';
import MedicineImport from '../models/medicine-import.model.js';
import PurchaseTransaction from '../models/purchase-transaction.model.js';
import Payroll from '../models/payroll.model.js';

class ReportDAO {
  async getMedicineInventoryList() {
    return await MedicineImport.aggregate([
      { $match: { disabled: false } },
      {
        $group: {
          _id: "$medicine_id",
          total_remaining: { $sum: "$remaining" },
          total_value: { $sum: { $multiply: ["$remaining", "$unit_price"] } }
        }
      },
      {
        $lookup: {
          from: "medicines",
          localField: "_id",
          foreignField: "_id",
          as: "medicine"
        }
      },
      { $unwind: "$medicine" },
      {
        $project: {
          _id: 0,
          medicine_id: "$medicine._id",
          name: "$medicine.name",
          unit: "$medicine.unit",
          total_remaining: 1,
          total_value: 1
        }
      }
    ]);
  }
  async getTotalMedicineQuantity() {
    const result = await MedicineImport.aggregate([
      { $match: { disabled: false } },
      {
        $group: {
          _id: null,
          total_remaining: { $sum: "$remaining" }
        }
      }
    ]);

    return result[0]?.total_remaining || 0;
  }
  async getTotalMedicineValue() {
    const result = await MedicineImport.aggregate([
      { $match: { disabled: false } },
      {
        $group: {
          _id: null,
          total_value: { $sum: { $multiply: ["$remaining", "$unit_price"] } }
        }
      }
    ]);

    return result[0]?.total_value || 0;
  }

  // 1) Gom theo ngày
  async getPaymentsByDateRange(start, end) {
    return Payment.aggregate([
      { $match: { date: { $gte: start, $lte: end }, disabled: false } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          total: { $sum: "$amount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  }
  async getMedicinePurchaseByDateRange(start, end) {
    return PurchaseTransaction.aggregate([
      { $match: { date: { $gte: start, $lte: end }, disabled: false } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          total: { $sum: "$amount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  }
  async getPayrollByDateRange(start, end) {
    return Payroll.aggregate([
      { $match: { paydate: { $gte: start, $lte: end }, disabled: false } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$paydate" } },
          total: { $sum: "$net_salary" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  }
  async getFinancialSummary(start, end) {
    const [income, medicineCost, payrollCost] = await Promise.all([
      this.getPaymentsByDateRange(start, end),
      this.getMedicinePurchaseByDateRange(start, end),
      this.getPayrollByDateRange(start, end)
    ]);

    return { income, medicineCost, payrollCost };
  }

  // 2) Gom theo tháng (YYYY-MM)
  async getPaymentsByMonth(start, end) {
    return Payment.aggregate([
      { $match: { date: { $gte: start, $lte: end }, disabled: false } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
          total: { $sum: "$amount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  }
  async getMedicinePurchaseByMonth(start, end) {
    return PurchaseTransaction.aggregate([
      { $match: { date: { $gte: start, $lte: end }, disabled: false } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
          total: { $sum: "$amount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  }
  async getPayrollByMonth(start, end) {
    return Payroll.aggregate([
      { $match: { paydate: { $gte: start, $lte: end }, disabled: false } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$paydate" } },
          total: { $sum: "$net_salary" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  }
  async getFinancialSummaryByMonth(start, end) {
    const [income, medicineCost, payrollCost] = await Promise.all([
      this.getPaymentsByMonth(start, end),
      this.getMedicinePurchaseByMonth(start, end),
      this.getPayrollByMonth(start, end)
    ]);

    return { income, medicineCost, payrollCost };
  }

  // 3) Gom theo năm (YYYY)
  async getPaymentsByYear(start, end) {
    return Payment.aggregate([
      { $match: { date: { $gte: start, $lte: end }, disabled: false } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y", date: "$date" } },
          total: { $sum: "$amount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  }
  async getMedicinePurchaseByYear(start, end) {
    return PurchaseTransaction.aggregate([
      { $match: { date: { $gte: start, $lte: end }, disabled: false } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y", date: "$date" } },
          total: { $sum: "$amount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  }
  async getPayrollByYear(start, end) {
    return Payroll.aggregate([
      { $match: { paydate: { $gte: start, $lte: end }, disabled: false } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y", date: "$paydate" } },
          total: { $sum: "$net_salary" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  }
  async getFinancialSummaryByYear(start, end) {
    const [income, medicineCost, payrollCost] = await Promise.all([
      this.getPaymentsByYear(start, end),
      this.getMedicinePurchaseByYear(start, end),
      this.getPayrollByYear(start, end)
    ]);

    return { income, medicineCost, payrollCost };
  }

  mapByKey(arr) {
    return Object.fromEntries(arr.map(d => [d._id, d.total]));
  }
}

export default new ReportDAO();