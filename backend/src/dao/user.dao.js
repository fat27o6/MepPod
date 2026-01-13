import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

import User from "../models/user.model.js";
import TokenBlacklist from "../models/token-blacklist.model.js";
import BaseDAO from './base.dao.js';

let usersModel = null;

// Kế thừa
function getEnvValue(key, defaultValue = null) {
  const value = process.env[key];
  if (!value) return defaultValue;
  // Loại bỏ dấu ngoặc kép ở đầu và cuối nếu có, sau đó trim
  return value.replace(/^["']|["']$/g, '').trim();
}
// Hàm kiểm tra cấu hình SMTP có đầy đủ không
function isSMTPConfigured() {
  const host = getEnvValue('SMTP_HOST');
  const user = getEnvValue('SMTP_USER');
  const pass = getEnvValue('SMTP_PASS');
  return !!(host && user && pass);
}
// Hàm tạo transporter nodemailer (lazy creation)
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

  console.log(`📧 Đang cấu hình SMTP: ${host}:${port} (secure: ${secure})`);

  return nodemailer.createTransport({
    host: host,
    port: port,
    secure: secure, // true nếu port 465
    auth: {
      user: user,
      pass: pass,
    },
    // Thêm timeout và retry options
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000,
    // Thêm tls options để tránh lỗi certificate
    tls: {
      rejectUnauthorized: false, // Chấp nhận self-signed certificates (cho testing)
    },
  });
}
//

class UserDAO extends BaseDAO {
  constructor() {
    super(User);
  }

  async injectDB(conn) {
    if (usersModel) return;
    usersModel = User;
    return;
  }

  generateRandomString(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  getPrefixByRole(role) {
    switch (role) {
      case "Doctor":
        return "Dr.";
      case "Accountant":
        return "Ac.";
      case "Nurse":
        return "Nu.";
      case "Receptionist":
        return "Re.";
      case "Pharmacist":
        return "Ph."
      default:
        return "Us.";
    }
  }

  // Hàm gửi email cấp tài khoản
  async sendCredentialsEmail(toEmail, username, password, employeeName = "") {
    if (!toEmail) throw new Error("No recipient email provided");

    // Kiểm tra cấu hình SMTP trước khi gửi
    if (!isSMTPConfigured()) {
      throw new Error(
        "SMTP chưa được cấu hình. Vui lòng kiểm tra file .env và đảm bảo có đủ: SMTP_HOST, SMTP_USER, SMTP_PASS"
      );
    }

    const subject = "Thông tin tài khoản mới";
    const text = `Xin chào ${employeeName || ""},

  Tài khoản của bạn đã được tạo:
  Username: ${username}
  Password tạm thời: ${password}

  Vui lòng đổi mật khẩu sau khi đăng nhập lần đầu để bảo mật.

  Trân trọng,
  Phòng IT`;
    const html = `
      <p>Xin chào ${employeeName || ""},</p>
      <p>Tài khoản nhân viên của bạn là:</p>
      <ul>
        <li><strong>Username:</strong> ${username}</li>
        <li><strong>Password tạm thời:</strong> ${password}</li>
      </ul>
      <p><em>Vui lòng đổi mật khẩu sau khi đăng nhập lần đầu để bảo mật.</em></p>
      <p>Trân trọng,<br/>Phòng IT</p>
    `;

    try {
      const transporter = createTransporter();
      const fromEmail = getEnvValue('FROM_EMAIL') || getEnvValue('SMTP_USER');

      const info = await transporter.sendMail({
        from: fromEmail,
        to: toEmail,
        subject,
        text,
        html,
      });

      return info;
    } catch (err) {
      // Cải thiện error message
      const host = getEnvValue('SMTP_HOST');
      const port = getEnvValue('SMTP_PORT') || '587';

      if (err.code === "ECONNREFUSED") {
        throw new Error(
          `Không thể kết nối đến SMTP server tại ${host}:${port}. ` +
          `Vui lòng kiểm tra lại cấu hình SMTP hoặc đảm bảo SMTP server đang chạy. ` +
          `Lỗi chi tiết: ${err.message}`
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

  // Hàm gửi email reset mật khẩu
  async sendRePassEmail(toEmail, username, password, employeeName = "") {
    if (!toEmail) throw new Error("No recipient email provided");

    const subject = "Thông tin tài khoản mới";
    const text = `Xin chào ${employeeName || ""},

  Mật khẩu của bạn đã được cấp lại:
  Username: ${username}
  Password đã cấp lại: ${password}

  Vui lòng đổi mật khẩu sau khi đăng nhập lần đầu để bảo mật.

  Trân trọng,
  Phòng IT`;
    const html = `
      <p>Xin chào ${employeeName || ""},</p>
      <p>Mật khẩu của bạn đã được cấp lại:</p>
      <ul>
        <li><strong>Username:</strong> ${username}</li>
        <li><strong>Password đã cấp lại:</strong> ${password}</li>
      </ul>
      <p><em>Vui lòng đổi mật khẩu sau khi đăng nhập lần đầu để bảo mật.</em></p>
      <p>Trân trọng,<br/>Phòng IT</p>
    `;

    try {
      const transporter = createTransporter();
      const fromEmail = getEnvValue('FROM_EMAIL') || getEnvValue('SMTP_USER');

      console.log(`📧 Sending reset password email to: ${toEmail}`);
      const info = await transporter.sendMail({
        from: fromEmail,
        to: toEmail,
        subject,
        text,
        html,
      });

      console.log(`✅ Reset password email sent successfully. MessageId: ${info.messageId}`);
      return info;
    } catch (err) {
      // Cải thiện error message
      const host = getEnvValue('SMTP_HOST');
      const port = getEnvValue('SMTP_PORT') || '587';

      console.error(`❌ Error sending reset password email to ${toEmail}:`, err);

      if (err.code === "ECONNREFUSED") {
        throw new Error(
          `Không thể kết nối đến SMTP server tại ${host}:${port}. ` +
          `Vui lòng kiểm tra lại cấu hình SMTP hoặc đảm bảo SMTP server đang chạy. ` +
          `Lỗi chi tiết: ${err.message}`
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

  async register(role, employee) {
    try {
      if (!usersModel)
        throw new Error("Users DAO has not been initialized. Call injectDB(conn) first.");

      // --- Tạo username và password tự động ---
      const prefix = this.getPrefixByRole(role);
      let newUsername;
      let existing;

      // Tạo username cho đến khi không trùng
      do {
        const randomPart = this.generateRandomString(5);
        newUsername = prefix + randomPart;
        existing = await usersModel.findOne({ username: newUsername }).exec();
      } while (existing);

      const newPassword = this.generateRandomString(9);


      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const userDoc = await usersModel.create({
        username: newUsername,
        password_hash: hashedPassword,
        role,
        employee_id: employee._id,
      });

      // Lấy email employee tương ứng
      let employeeEmail = null;
      let employeeName = "";
      if (employee._id) {
        try {
          employeeEmail = employee.email;
          employeeName = employee.fullname || "";
        } catch (err) {
          console.warn("Không lấy được employee info:", err.message);
        }
      }

      // Gửi email nếu có email
      if (employeeEmail) {
        try {
          await this.sendCredentialsEmail(employeeEmail, newUsername, newPassword, employeeName);
          console.info(`✅ Credentials email sent successfully to ${employeeEmail}`);
        } catch (err) {
          // Không throw lỗi để không block luồng tạo user; ghi log để admin check
          console.error("❌ Lỗi khi gửi tài khoản về email nhân viên:", err.message || err);
          console.error("   Chi tiết:", err);
          console.warn(`⚠️  Tài khoản đã được tạo nhưng không gửi được email. Username: ${newUsername}, Password: ${newPassword}`);
        }
      } else {
        console.warn("⚠️  Nhân viên không có email, không gửi được tài khoản nhân viên.");
      }

      const user = userDoc.toObject();
      delete user.password_hash;
      user.generated_password = newPassword;

      console.log(newUsername);
      console.log(newPassword);

      return user;
    } catch (e) {
      console.error(`UserDAO.register error: ${e}`);
      throw e;
    }
  }

  async login(username, password) {
    try {
      if (!usersModel) throw new Error('Users DAO has not been initialized. Call injectDB(conn) first.');
      const user = await usersModel.findOne({ username }).exec();
      if (!user) throw new Error('Username hoặc password không đúng');
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) throw new Error('Username hoặc password không đúng');

      // Tạo Token
      const payload = { sub: user._id.toString(), username: user.username, role: user.role };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.TOKEN_EXPIRE });

      const userObj = user.toObject();
      delete userObj.password_hash;
      return { user: userObj, token };
    } catch (e) {
      console.error(`UserDAO.login error: ${e}`);
      throw e;
    }
  }

  async logout(token) {
    try {
      if (!token) throw new Error('Token không hợp lệ');

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      await TokenBlacklist.create({
        token,
        expiresAt: new Date(decoded.exp * 1000),
      });

      return { message: 'Đăng xuất thành công' };
    } catch (err) {
      console.error('UserDAO.logout error:', err);
      throw err;
    }
  }

  async findById(id) {
    if (!usersModel) throw new Error('Users DAO has not been initialized. Call injectDB(conn) first.');
    return usersModel.findById(id).select('-password_hash').exec();
  }

  async findEmployAcc(employee_id) {
    if (!usersModel) throw new Error('Users DAO has not been initialized. Call injectDB(conn) first.');
    return usersModel.findOne({ employee_id }).select('-password_hash').exec();
  }

  async changePassword(userId, oldPassword, newPassword) {
    if (!usersModel) throw new Error("Users DAO has not been initialized. Call injectDB(conn) first.");

    const user = await usersModel.findById(userId).exec();
    if (!user) throw new Error("User không tồn tại");
    // Kiểm tra mật khẩu cũ
    const match = await bcrypt.compare(oldPassword, user.password_hash);
    if (!match) throw new Error("Mật khẩu cũ không đúng");
    // Hash mật khẩu mới
    const hashedNew = await bcrypt.hash(newPassword, 10);

    await usersModel.findByIdAndUpdate(
      userId,
      { password_hash: hashedNew },
      { new: true }
    );
    return { message: "Đổi mật khẩu thành công" };
  }

  async resetPassword(userId) {
    if (!usersModel) throw new Error("Users DAO has not been initialized. Call injectDB(conn) first.");

    const user = await usersModel.findById(userId).populate("employee_id").exec();
    if (!user) throw new Error("User không tồn tại");

    // Tạo mật khẩu mới
    const newPassword = this.generateRandomString(9);
    const hashedNew = await bcrypt.hash(newPassword, 10);
    await usersModel.findByIdAndUpdate(
      userId,
      { password_hash: hashedNew },
      { new: true }
    );

    // Lấy email và fullname nhân viên
    let email = null;
    let fullname = "";
    if (user.employee_id) {
      email = user.employee_id.email;
      fullname = user.employee_id.fullname || "";
    }

    if (!email) {
      // console.warn("⚠️ Không tìm thấy email nhân viên để gửi mật khẩu reset.");
      return {
        message: "Reset mật khẩu thành công. Lưu ý: Không tìm thấy email nhân viên để gửi mật khẩu mới.",
        password: newPassword, // Trả về password để admin có thể thông báo thủ công
      };
    } else {
      try {
        // console.log(`📧 Đang gửi email reset password cho ${fullname} (${email})`);
        await this.sendRePassEmail(email, user.username, newPassword, fullname);
        console.info("✅ Password reset email đã được gửi thành công");
        return {
          message: "Reset mật khẩu thành công. Mật khẩu mới đã được gửi qua email.",
        };
      } catch (err) {
        // console.error("❌ Lỗi gửi email reset mật khẩu:", err);
        return {
          message: `Reset mật khẩu thành công. Tuy nhiên, không thể gửi email: ${err.message}`,
          password: newPassword, // Trả về password để admin có thể thông báo thủ công
          emailError: err.message,
        };
      }
    }
  }

  async forgotPassword(username, email) {
    if (!usersModel) throw new Error("Users DAO has not been initialized. Call injectDB(conn) first.");

    // Tìm user theo username và populate employee info
    const user = await usersModel.findOne({ username }).populate("employee_id").exec();
    if (!user) throw new Error("Username không tồn tại");

    // Kiểm tra email
    if (!user.employee_id || !user.employee_id.email) {
      throw new Error("Tài khoản này không có thông tin email");
    }
    if (user.employee_id.email !== email) {
      throw new Error("Email không khớp với username");
    }

    // Reset password và gửi email
    return await this.resetPassword(user._id);
  }
}

export default new UserDAO();