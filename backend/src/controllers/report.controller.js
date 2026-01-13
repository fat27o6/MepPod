import XLSX from "xlsx";

import ReportDAO from "../dao/report.dao.js";

class ReportController {
  async getMedicineInventory(req, res) {
    try {
      const list = await ReportDAO.getMedicineInventoryList();
      return res.json({
        success: true,
        data: list
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false });
    }
  }
  async getTotalMedicineQuantity(req, res) {
    try {
      const total = await ReportDAO.getTotalMedicineQuantity();
      return res.json({
        success: true,
        total_quantity: total
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false });
    }
  }
  async getTotalMedicineValue(req, res) {
    try {
      const total = await ReportDAO.getTotalMedicineValue();
      return res.json({
        success: true,
        total_value: total
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false });
    }
  }

  // 1) API thu – chi
  async getCashflow(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59);

      const data = await ReportDAO.getFinancialSummary(start, end);

      return res.json({
        success: true,
        range: `${startDate} → ${endDate}`,
        data
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ success: false });
    }
  }
  async getCashflowByMonth(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59);

      const data = await ReportDAO.getFinancialSummaryByMonth(start, end);

      return res.json({
        success: true,
        type: "monthly",
        range: `${startDate} → ${endDate}`,
        data
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ success: false });
    }
  }
  async getCashflowByYear(req, res) {
    try {
      const { startYear, endYear } = req.query;

      const start = new Date(`${startYear}-01-01`);
      const end = new Date(`${endYear}-12-31`);
      end.setHours(23, 59, 59);

      const data = await ReportDAO.getFinancialSummaryByYear(start, end);

      return res.json({
        success: true,
        type: "yearly",
        range: `${startYear} → ${endYear}`,
        data
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ success: false });
    }
  }

  // 2) API tính lãi/lỗ
  async getProfitLossDaily(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59);

      const { income, medicineCost, payrollCost } =
        await ReportDAO.getFinancialSummary(start, end);

      // Convert về object dạng key/value ngày => số tiền
      const mapToObj = (arr) =>
        Object.fromEntries(arr.map((d) => [d._id, d.total]));

      const incomeMap = mapToObj(income);
      const medicineMap = mapToObj(medicineCost);
      const payrollMap = mapToObj(payrollCost);

      // Ghép các ngày
      const result = {};

      const curr = new Date(start);
      while (curr <= end) {
        const day = curr.toISOString().slice(0, 10);

        const thu = incomeMap[day] || 0;
        const chiThuoc = medicineMap[day] || 0;
        const chiLuong = payrollMap[day] || 0;
        const loiNhuan = thu - (chiThuoc + chiLuong);

        result[day] = {
          income: thu,
          medicineCost: chiThuoc,
          payrollCost: chiLuong,
          profit: loiNhuan
        };

        curr.setDate(curr.getDate() + 1);
      }

      return res.json({
        success: true,
        type: "profit-loss-daily",
        data: result
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ success: false });
    }
  }
  async getProfitLossMonthly(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59);

      const { income, medicineCost, payrollCost } =
        await ReportDAO.getFinancialSummaryByMonth(start, end);

      const incomeMap = ReportDAO.mapByKey(income);
      const medicineMap = ReportDAO.mapByKey(medicineCost);
      const payrollMap = ReportDAO.mapByKey(payrollCost);

      const result = {}; // YYYY-MM → data

      // Tạo danh sách tháng trong khoảng
      const curr = new Date(start);
      while (curr <= end) {
        const key = curr.toISOString().slice(0, 7); // YYYY-MM

        const thu = incomeMap[key] || 0;
        const chiThuoc = medicineMap[key] || 0;
        const chiLuong = payrollMap[key] || 0;
        const loiNhuan = thu - (chiThuoc + chiLuong);

        result[key] = {
          income: thu,
          medicineCost: chiThuoc,
          payrollCost: chiLuong,
          profit: loiNhuan
        };

        curr.setMonth(curr.getMonth() + 1);
      }

      return res.json({
        success: true,
        type: "profit-loss-monthly",
        data: result
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ success: false });
    }
  }
  async getProfitLossYearly(req, res) {
    try {
      const { startYear, endYear } = req.query;

      const start = new Date(`${startYear}-01-01`);
      const end = new Date(`${endYear}-12-31`);
      end.setHours(23, 59, 59);

      const { income, medicineCost, payrollCost } =
        await ReportDAO.getFinancialSummaryByYear(start, end);

      const incomeMap = ReportDAO.mapByKey(income);
      const medicineMap = ReportDAO.mapByKey(medicineCost);
      const payrollMap = ReportDAO.mapByKey(payrollCost);

      const result = {}; // YYYY → data

      for (let year = parseInt(startYear); year <= parseInt(endYear); year++) {
        const key = `${year}`;

        const thu = incomeMap[key] || 0;
        const chiThuoc = medicineMap[key] || 0;
        const chiLuong = payrollMap[key] || 0;
        const loiNhuan = thu - (chiThuoc + chiLuong);

        result[key] = {
          income: thu,
          medicineCost: chiThuoc,
          payrollCost: chiLuong,
          profit: loiNhuan
        };
      }

      return res.json({
        success: true,
        type: "profit-loss-yearly",
        data: result
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ success: false });
    }
  }

  // Kế thừa
  // Export report (CSV or HTML for PDF printing)
  // GET /api/reports/export?type=medicine-inventory|profit-loss-monthly|cashflow&format=csv|pdf&startDate=...&endDate=...
  async exportReport(req, res) {
    try {
      const { type, format = "csv", startDate, endDate } = req.query;

      const sendCSV = (filename, headers, rows) => {
        const esc = (v) => {
          if (v === null || v === undefined) return "";
          const s = String(v);
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        };
        const csvLines = [];
        csvLines.push(headers.join(","));
        for (const row of rows) {
          csvLines.push(row.map(esc).join(","));
        }
        const csv = csvLines.join("\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(csv);
      };

      const sendXLSX = (filename, headers, rows) => {
        // Build sheet as array of arrays (with headers first)
        const aoa = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(Buffer.from(buf));
      };

      const sendHTML = (title, htmlBody) => {
        const html = `
          <!doctype html>
          <html>
            <head>
              <meta charset="utf-8"/>
              <title>${title}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background: #f5f5f5; }
              </style>
            </head>
            <body>
              <h1>${title}</h1>
              ${htmlBody}
            </body>
          </html>
        `;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.send(html);
      };

      if (!type) return res.status(400).json({ error: "Missing report type" });

      if (type === "medicine-inventory" || type === "medicine-inventory-quantity" || type === "medicine-inventory-value") {
        const list = await ReportDAO.getMedicineInventoryList();
        // support subtypes: full, quantity-only, value-only
        if (type === "medicine-inventory-quantity") {
          const headers = ["name", "unit", "total_remaining"];
          const rows = (list || []).map((r) => [r.name || "", r.unit || "", r.total_remaining || 0]);
          if (format === "csv") return sendCSV("medicine_inventory_quantity.csv", headers, rows);
          if (format === "xlsx" || format === "excel") return sendXLSX("medicine_inventory_quantity.xlsx", headers, rows);
          const rowsHtml = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
          return sendHTML("Medicine Inventory Quantity Report", `<table><thead><tr><th>ID</th><th>Tên</th><th>Đơn vị</th><th>Tồn</th></tr></thead><tbody>${rowsHtml}</tbody></table>`);
        }

        if (type === "medicine-inventory-value") {
          const headers = ["name", "unit", "total_value"];
          const rows = (list || []).map((r) => [r.name || "", r.unit || "", r.total_value || 0]);
          if (format === "csv") return sendCSV("medicine_inventory_value.csv", headers, rows);
          if (format === "xlsx" || format === "excel") return sendXLSX("medicine_inventory_value.xlsx", headers, rows);
          const rowsHtml = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
          return sendHTML("Medicine Inventory Value Report", `<table><thead><tr><th>ID</th><th>Tên</th><th>Đơn vị</th><th>Giá trị</th></tr></thead><tbody>${rowsHtml}</tbody></table>`);
        }

        // default: full inventory with both fields
        const headers = ["name", "unit", "total_remaining", "total_value"];
        const rows = (list || []).map((r) => [r.name || "", r.unit || "", r.total_remaining || 0, r.total_value || 0]);
        if (format === "csv") return sendCSV("medicine_inventory.csv", headers, rows);
        if (format === "xlsx" || format === "excel") return sendXLSX("medicine_inventory.xlsx", headers, rows);
        const rowsHtml = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
        return sendHTML("Medicine Inventory Report", `<table><thead><tr><th>ID</th><th>Tên</th><th>Đơn vị</th><th>Tồn</th><th>Giá trị</th></tr></thead><tbody>${rowsHtml}</tbody></table>`);
      }

      if (type === "profit-loss-monthly") {
        if (!startDate || !endDate) return res.status(400).json({ error: "startDate and endDate required" });
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59);
        const { income, medicineCost, payrollCost } = await ReportDAO.getFinancialSummaryByMonth(start, end);
        const incomeMap = ReportDAO.mapByKey(income);
        const medicineMap = ReportDAO.mapByKey(medicineCost);
        const payrollMap = ReportDAO.mapByKey(payrollCost);

        const result = {};
        const curr = new Date(start);
        while (curr <= end) {
          const key = curr.toISOString().slice(0, 7);
          const thu = incomeMap[key] || 0;
          const chiThuoc = medicineMap[key] || 0;
          const chiLuong = payrollMap[key] || 0;
          const loiNhuan = thu - (chiThuoc + chiLuong);
          result[key] = { income: thu, medicineCost: chiThuoc, payrollCost: chiLuong, profit: loiNhuan };
          curr.setMonth(curr.getMonth() + 1);
        }

        const headers = ["month", "income", "medicineCost", "payrollCost", "profit"];
        const rows = Object.keys(result).map((k) => [k, result[k].income, result[k].medicineCost, result[k].payrollCost, result[k].profit]);
        if (format === "csv") {
          return sendCSV("profit_loss_monthly.csv", headers, rows);
        } else if (format === "xlsx" || format === "excel") {
          return sendXLSX("profit_loss_monthly.xlsx", headers, rows);
        } else {
          const rowsHtml = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
          const table = `<table><thead><tr><th>Month</th><th>Income</th><th>Medicine Cost</th><th>Payroll Cost</th><th>Profit</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
          return sendHTML("Profit/Loss Monthly Report", table);
        }
      }

      if (type === "cashflow") {
        if (!startDate || !endDate) return res.status(400).json({ error: "startDate and endDate required" });
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59);
        const data = await ReportDAO.getFinancialSummary(start, end);
        // Flatten by date
        const mapToObj = (arr) => Object.fromEntries(arr.map((d) => [d._id, d.total]));
        const incomeMap = mapToObj(data.income || []);
        const medicineMap = mapToObj(data.medicineCost || []);
        const payrollMap = mapToObj(data.payrollCost || []);
        const result = {};
        const curr = new Date(start);
        while (curr <= end) {
          const day = curr.toISOString().slice(0, 10);
          const thu = incomeMap[day] || 0;
          const chiThuoc = medicineMap[day] || 0;
          const chiLuong = payrollMap[day] || 0;
          result[day] = { income: thu, medicineCost: chiThuoc, payrollCost: chiLuong };
          curr.setDate(curr.getDate() + 1);
        }
        const headers = ["date", "income", "medicineCost", "payrollCost"];
        const rows = Object.keys(result).map((k) => [k, result[k].income, result[k].medicineCost, result[k].payrollCost]);
        if (format === "csv") {
          return sendCSV("cashflow_report.csv", headers, rows);
        } else if (format === "xlsx" || format === "excel") {
          return sendXLSX("cashflow_report.xlsx", headers, rows);
        } else {
          const rowsHtml = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
          const table = `<table><thead><tr><th>Date</th><th>Income</th><th>Medicine Cost</th><th>Payroll Cost</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
          return sendHTML("Cashflow Report", table);
        }
      }

      if (type === "profit-loss-yearly") {
        // support exporting yearly profit/loss by providing startYear & endYear or default to current year
        const startYear = req.query.startYear || new Date().getFullYear();
        const endYear = req.query.endYear || startYear;
        const start = new Date(`${startYear}-01-01`);
        const end = new Date(`${endYear}-12-31`);
        end.setHours(23, 59, 59);

        const { income, medicineCost, payrollCost } = await ReportDAO.getFinancialSummaryByYear(start, end);
        const incomeMap = ReportDAO.mapByKey(income);
        const medicineMap = ReportDAO.mapByKey(medicineCost);
        const payrollMap = ReportDAO.mapByKey(payrollCost);

        const result = {};
        for (let year = parseInt(startYear); year <= parseInt(endYear); year++) {
          const key = `${year}`;
          const thu = incomeMap[key] || 0;
          const chiThuoc = medicineMap[key] || 0;
          const chiLuong = payrollMap[key] || 0;
          const loiNhuan = thu - (chiThuoc + chiLuong);
          result[key] = { income: thu, medicineCost: chiThuoc, payrollCost: chiLuong, profit: loiNhuan };
        }

        const headers = ["year", "income", "medicineCost", "payrollCost", "profit"];
        const rows = Object.keys(result).map((k) => [k, result[k].income, result[k].medicineCost, result[k].payrollCost, result[k].profit]);
        if (format === "csv") {
          return sendCSV("profit_loss_yearly.csv", headers, rows);
        } else if (format === "xlsx" || format === "excel") {
          return sendXLSX("profit_loss_yearly.xlsx", headers, rows);
        } else {
          const rowsHtml = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
          const table = `<table><thead><tr><th>Year</th><th>Income</th><th>Medicine Cost</th><th>Payroll Cost</th><th>Profit</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
          return sendHTML("Profit/Loss Yearly Report", table);
        }
      }

      return res.status(400).json({ error: "Unsupported report type" });
    } catch (err) {
      console.error("Export report error:", err);
      return res.status(500).json({ error: err.message || "Export failed" });
    }
  }
  //
}

export default new ReportController();