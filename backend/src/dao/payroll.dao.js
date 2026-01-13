import nodemailer from "nodemailer";

import Payroll from "../models/payroll.model.js";
import BaseDAO from './base.dao.js';

// Kế thừa
function getEnvValue(key, defaultValue = null) {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.replace(/^["']|["']$/g, '').trim();
}

function isSMTPConfigured() {
  const host = getEnvValue('SMTP_HOST');
  const user = getEnvValue('SMTP_USER');
  const pass = getEnvValue('SMTP_PASS');
  return !!(host && user && pass);
}

function createTransporter() {
  if (!isSMTPConfigured()) {
    throw new Error(
      "SMTP chưa được cấu hình. Vui lòng kiểm tra các biến môi trường: SMTP_HOST, SMTP_USER, SMTP_PASS"
    );
  }

  const host = getEnvValue('SMTP_HOST');
  const port = Number(getEnvValue('SMTP_PORT')) || 587;
  const secure = getEnvValue('SMTP_SECURE') === "true";
  const user = getEnvValue('SMTP_USER');
  const pass = getEnvValue('SMTP_PASS');

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    // Thêm timeout và retry options
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000,
    // Thêm tls options để tránh lỗi certificate
    tls: { rejectUnauthorized: false },
  });
}
//

class PayrollDAO extends BaseDAO {
  async injectDB(conn) {
    return;
  }

  constructor() {
    super(Payroll);
  }

  async findByEmployeeAndMonth(employeeId, month, year, session) {
    return this.model.findOne({
      employee_id: employeeId,
      paydate: {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0),
      },
      disabled: false
    }).session(session);
  }

  async create(data, session = null) {
    return this.model.create([data], { session });
  }

  async findAll(filter = {}) {
    if (filter.disabled === undefined) {
      filter.disabled = false;
    }
    return await Payroll.find(filter).populate("employee_id");
  }

  async findById(id) {
    return await Payroll.findOne({ _id: id, disabled: false }).populate("employee_id");
  }


  // 1) GỬI THEO EMPLOYEE ID (tháng hiện tại)
  async sendMonthlyPayrollEmail(employeeId) {
    try {
      if (!isSMTPConfigured()) {
        throw new Error("SMTP chưa cấu hình.");
      }

      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const payroll = await Payroll.findOne({
        employee_id: employeeId,
        paydate: {
          $gte: new Date(year, month - 1, 1),
          $lte: new Date(year, month, 0),
        },
      }).populate("employee_id");

      if (!payroll) throw new Error("Không tìm thấy bảng lương tháng này.");

      return await this._sendEmailForPayroll(payroll);
    } catch (err) {
      throw err;
    }
  }

  // 2) GỬI THEO PAYROLL ID
  async sendPayrollByPayrollId(payrollId) {
    try {
      if (!isSMTPConfigured()) {
        throw new Error("SMTP chưa cấu hình.");
      }

      const payroll = await Payroll.findById(payrollId).populate("employee_id");
      if (!payroll) throw new Error("Không tìm thấy bảng lương.");

      return await this._sendEmailForPayroll(payroll);
    } catch (err) {
      throw err;
    }
  }

  // Kế thừa
  // 3) HÀM DÙNG CHUNG ĐỂ GỬI EMAIL
  async _sendEmailForPayroll(payroll) {
    try {
      if (!isSMTPConfigured()) {
        throw new Error("SMTP chưa cấu hình.");
      }

      const employee = payroll.employee_id;
      if (!employee) {
        throw new Error("Không tìm thấy thông tin nhân viên.");
      }

      if (!employee.email) {
        throw new Error("Nhân viên không có email.");
      }

      const email = employee.email;
      const name = employee.fullname || "Nhân viên";

      // Lấy thông tin tháng/năm từ paydate
      const paydate = payroll.paydate ? new Date(payroll.paydate) : new Date();
      const month = paydate.getMonth() + 1;
      const year = paydate.getFullYear();

      // Format số tiền với dấu phẩy
      const formatCurrency = (amount) => {
        return amount ? amount.toLocaleString('vi-VN') : '0';
      };

      const html = `
        <h3>Bảng lương tháng ${month}/${year}</h3>
        <p>Xin chào <b>${name}</b>,</p>
        <p>Bảng lương của bạn đã được cập nhật. Dưới đây là thông tin chi tiết:</p>
        <ul>
          <li><strong>Lương cơ bản:</strong> ${formatCurrency(payroll.basic_salary)} VND</li>
          <li><strong>Thưởng:</strong> ${formatCurrency(payroll.bonus || 0)} VND</li>
          <li><strong>Khấu trừ:</strong> ${formatCurrency(payroll.deductions || 0)} VND</li>
          <li><strong>Lương thực nhận:</strong> <strong style="color: #2563eb;">${formatCurrency(payroll.net_salary)} VND</strong></li>
        </ul>
        <p>Ngày tạo: ${paydate.toLocaleDateString('vi-VN')}</p>
        <p>Trân trọng,<br/>Phòng Kế Toán</p>
      `;

      const transporter = createTransporter();
      const fromEmail = getEnvValue("FROM_EMAIL") || getEnvValue("SMTP_USER");

      await transporter.sendMail({
        from: fromEmail,
        to: email,
        subject: `Bảng lương tháng ${month}/${year}`,
        html,
      });

      // Cập nhật emailSent vào database cho payroll cụ thể
      await Payroll.findByIdAndUpdate(payroll._id, { emailSent: true });

      return { success: true, message: `Đã gửi email cho ${name}` };
    } catch (err) {
      console.error("❌ Lỗi _sendEmailForPayroll:", err);

      // Cải thiện error message
      const host = getEnvValue('SMTP_HOST');
      const port = getEnvValue('SMTP_PORT') || '587';

      if (err.code === "ECONNREFUSED") {
        throw new Error(
          `Không thể kết nối đến SMTP server tại ${host}:${port}. ` +
          `Vui lòng kiểm tra lại cấu hình SMTP hoặc đảm bảo SMTP server đang chạy.`
        );
      } else if (err.code === "EAUTH") {
        throw new Error(
          `Xác thực SMTP thất bại. Vui lòng kiểm tra lại SMTP_USER và SMTP_PASS trong file .env. ` +
          `Đảm bảo bạn đang dùng App Password nếu dùng Gmail.`
        );
      } else if (err.code === "ETIMEDOUT" || err.code === "ESOCKET") {
        throw new Error(
          `Timeout khi kết nối đến SMTP server ${host}:${port}. ` +
          `Vui lòng kiểm tra kết nối mạng hoặc firewall.`
        );
      }

      throw err;
    }
  }
  //

  // 4) Gửi hàng loạt theo employee_id
  async sendBulkMonthlyPayroll(employees = []) {
    const results = [];

    for (const employeeId of employees) {
      try {
        const result = await this.sendMonthlyPayrollEmail(employeeId);
        results.push({ employeeId, status: "success", message: result.message });
      } catch (err) {
        results.push({ employeeId, status: "failed", message: err.message });
      }
    }

    return results;
  }

  // 5) Gửi hàng loạt theo payroll_id
  async sendBulkPayrollByIds(payrollIds = []) {
    const results = [];

    for (const id of payrollIds) {
      try {
        const result = await this.sendPayrollByPayrollId(id);
        results.push({ payrollId: id, status: "success", message: result.message });
      } catch (err) {
        results.push({ payrollId: id, status: "failed", message: err.message });
      }
    }

    return results;
  }

  // Kế thừa
  // Gửi email cho payroll cụ thể (theo payroll_id)
  async sendPayrollEmailByPayrollId(payrollId) {
    try {
      if (!isSMTPConfigured()) {
        throw new Error("SMTP chưa cấu hình.");
      }

      // Lấy payroll với thông tin employee
      const payroll = await Payroll.findById(payrollId).populate("employee_id");

      if (!payroll) {
        throw new Error("Không tìm thấy bảng lương.");
      }

      const employee = payroll.employee_id;
      if (!employee) {
        throw new Error("Không tìm thấy thông tin nhân viên.");
      }

      if (!employee.email) {
        throw new Error("Nhân viên không có email.");
      }

      const email = employee.email;
      const name = employee.fullname || "Nhân viên";

      // Lấy thông tin tháng/năm từ paydate
      const paydate = payroll.paydate ? new Date(payroll.paydate) : new Date();
      const month = paydate.getMonth() + 1;
      const year = paydate.getFullYear();

      // Format số tiền với dấu phẩy
      const formatCurrency = (amount) => {
        return amount ? amount.toLocaleString('vi-VN') : '0';
      };

      const html = `
        <h3>Bảng lương tháng ${month}/${year}</h3>
        <p>Xin chào <b>${name}</b>,</p>
        <p>Bảng lương của bạn đã được cập nhật. Dưới đây là thông tin chi tiết:</p>
        <ul>
          <li><strong>Lương cơ bản:</strong> ${formatCurrency(payroll.basic_salary)} VND</li>
          <li><strong>Thưởng:</strong> ${formatCurrency(payroll.bonus || 0)} VND</li>
          <li><strong>Khấu trừ:</strong> ${formatCurrency(payroll.deductions || 0)} VND</li>
          <li><strong>Lương thực nhận:</strong> <strong style="color: #2563eb;">${formatCurrency(payroll.net_salary)} VND</strong></li>
        </ul>
        <p>Ngày thanh toán: ${paydate.toLocaleDateString('vi-VN')}</p>
        <p>Trân trọng,<br/>Phòng Kế Toán</p>
      `;

      const transporter = createTransporter();
      const fromEmail = getEnvValue('FROM_EMAIL') || getEnvValue('SMTP_USER');

      await transporter.sendMail({
        from: fromEmail,
        to: email,
        subject: `Bảng lương tháng ${month}/${year} - Đã cập nhật`,
        html,
      });

      // Cập nhật emailSent vào database
      await Payroll.findByIdAndUpdate(payrollId, { emailSent: true });

      return { success: true, message: `Đã gửi email cho ${name}` };
    } catch (err) {
      console.error("❌ Lỗi sendPayrollEmailByPayrollId:", err);

      // Cải thiện error message
      const host = getEnvValue('SMTP_HOST');
      const port = getEnvValue('SMTP_PORT') || '587';

      if (err.code === "ECONNREFUSED") {
        throw new Error(
          `Không thể kết nối đến SMTP server tại ${host}:${port}. ` +
          `Vui lòng kiểm tra lại cấu hình SMTP hoặc đảm bảo SMTP server đang chạy.`
        );
      } else if (err.code === "EAUTH") {
        throw new Error(
          `Xác thực SMTP thất bại. Vui lòng kiểm tra lại SMTP_USER và SMTP_PASS trong file .env. ` +
          `Đảm bảo bạn đang dùng App Password nếu dùng Gmail.`
        );
      } else if (err.code === "ETIMEDOUT" || err.code === "ESOCKET") {
        throw new Error(
          `Timeout khi kết nối đến SMTP server ${host}:${port}. ` +
          `Vui lòng kiểm tra kết nối mạng hoặc firewall.`
        );
      }

      throw err;
    }
  }
  //
}

export default new PayrollDAO();