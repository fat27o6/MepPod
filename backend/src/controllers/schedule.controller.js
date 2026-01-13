import EmployeeDAO from "../dao/employee.dao.js";
import UserDAO from "../dao/user.dao.js";
import User from "../models/user.model.js";
import notificationDao from "../dao/notification.dao.js";

// Kế thừa
class ScheduleController {
    // Map role từ User sang position tiếng Việt
    mapRoleToPosition(role) {
        const roleMap = {
            "Receptionist": "Lễ tân",
            "Doctor": "Bác sĩ",
            "Nurse": "Y tá",
            "Accountant": "Kế toán",
            "Admin": "Admin"
        };
        return roleMap[role] || role || "N/A";
    }

    // Chuẩn hóa dữ liệu shift_schedule về dạng [{ date, start, end }]
    normalizeShiftSchedule(raw) {
        const DEFAULT_START = "08:00";
        const DEFAULT_END = "16:00";
        if (!raw) return [];

        // Nếu là mảng
        if (Array.isArray(raw)) {
            return raw
                .map((item) => {
                    // Nếu đã đúng format { date, start, end }, trả về luôn
                    if (item && typeof item === "object" && item.date && item.start && item.end) {
                        return {
                            date: item.date,
                            start: item.start,
                            end: item.end,
                        };
                    }
                    // Nếu là string (chỉ có date)
                    if (typeof item === "string") {
                        return { date: item, start: DEFAULT_START, end: DEFAULT_END };
                    }
                    // Nếu là object nhưng thiếu field
                    if (item && typeof item === "object") {
                        const date = item.date || item.day || item.dateStr;
                        if (!date) return null;
                        return {
                            date,
                            start: item.start || DEFAULT_START,
                            end: item.end || DEFAULT_END,
                        };
                    }
                    return null;
                })
                .filter(Boolean);
        }
        // Nếu là object key theo ngày: { "2025-10-23": { start, end } }
        if (typeof raw === "object" && !Array.isArray(raw)) {
            return Object.keys(raw).map((date) => {
                const val = raw[date];
                if (typeof val === "string") {
                    return { date, start: DEFAULT_START, end: DEFAULT_END };
                }
                return {
                    date,
                    start: val?.start || DEFAULT_START,
                    end: val?.end || DEFAULT_END,
                };
            });
        }
        return [];
    }
    // GET /api/schedules - Lấy tất cả lịch trực (Admin) hoặc lịch trực của chính mình (others)
    async findAll(req, res) {
        try {
            const userRole = req.user.role;
            const userId = req.user.sub; // user id từ token

            // Nếu là Admin, lấy tất cả employees với shift_schedule
            if (userRole === "Admin") {
                const employees = await EmployeeDAO.findAll();
                const employeesWithSchedule = employees.filter((emp) => emp.shift_schedule);

                // Lấy thông tin user chỉ cho các employees có schedule để tối ưu
                const employeeIds = employeesWithSchedule.map(emp => emp._id);
                const users = await User.find({ employee_id: { $in: employeeIds } }).select('employee_id role').exec();
                const userMap = new Map(users.map(u => [u.employee_id?.toString(), u.role]));

                const schedules = employeesWithSchedule.map((emp) => {
                    // Ưu tiên dùng position từ employee, fallback sang role từ user
                    let position = emp.position;
                    if (!position || (typeof position === 'string' && position.trim() === "")) {
                        const empUserRole = userMap.get(emp._id.toString());
                        position = this.mapRoleToPosition(empUserRole);
                    }
                    return {
                        employee_id: emp._id,
                        employee_name: emp.fullname,
                        employee_position: position || "N/A",
                        shift_schedule: emp.shift_schedule,
                    };
                });
                return res.json(schedules);
            }

            // Nếu không phải Admin, chỉ lấy lịch trực của chính mình
            const user = await UserDAO.findById(userId);
            if (!user || !user.employee_id) {
                return res
                    .status(404)
                    .json({ message: "Không tìm thấy thông tin nhân viên" });
            }

            const employee = await EmployeeDAO.findById(user.employee_id);
            if (!employee) {
                return res.status(404).json({ message: "Không tìm thấy nhân viên" });
            }

            // Ưu tiên dùng position từ employee, fallback sang role từ user
            let position = employee.position;
            if (!position || (typeof position === 'string' && position.trim() === "")) {
                position = this.mapRoleToPosition(user.role);
            }

            return res.json([
                {
                    employee_id: employee._id,
                    employee_name: employee.fullname,
                    employee_position: position || "N/A",
                    shift_schedule: employee.shift_schedule || null,
                },
            ]);
        } catch (err) {
            console.error("ScheduleController.findAll error:", err);
            return res.status(500).json({ error: err.message });
        }
    }

    // GET /api/schedules/:employee_id - Lấy lịch trực của một nhân viên cụ thể
    async findByEmployeeId(req, res) {
        try {
            const userRole = req.user.role;
            const userId = req.user.sub;
            const { employee_id } = req.params;

            // Nếu không phải Admin, kiểm tra xem có phải lịch trực của chính mình không
            if (userRole !== "Admin") {
                const user = await UserDAO.findById(userId);
                if (
                    !user ||
                    !user.employee_id ||
                    user.employee_id.toString() !== employee_id
                ) {
                    return res.status(403).json({
                        message: "Không có quyền xem lịch trực của nhân viên này",
                    });
                }
            }

            const employee = await EmployeeDAO.findById(employee_id);
            if (!employee) {
                return res.status(404).json({ message: "Không tìm thấy nhân viên" });
            }

            // Lấy user để map role sang position nếu cần
            const user = await UserDAO.findEmployAcc(employee_id);
            let position = employee.position;
            if ((!position || (typeof position === 'string' && position.trim() === "")) && user) {
                position = this.mapRoleToPosition(user.role);
            }

            return res.json({
                employee_id: employee._id,
                employee_name: employee.fullname,
                employee_position: position || "N/A",
                shift_schedule: employee.shift_schedule || null,
            });
        } catch (err) {
            console.error("ScheduleController.findByEmployeeId error:", err);
            return res.status(500).json({ error: err.message });
        }
    }

    // POST /api/schedules - Tạo/cập nhật lịch trực (chỉ Admin)
    async create(req, res) {
        try {
            const { employee_id, shift_schedule } = req.body;

            if (!employee_id) {
                return res.status(400).json({ message: "Cần cung cấp employee_id" });
            }

            const employee = await EmployeeDAO.findById(employee_id);
            if (!employee) {
                return res.status(404).json({ message: "Không tìm thấy nhân viên" });
            }

            // Validate và chuẩn hóa shift_schedule
            let normalizedSchedule = [];
            if (Array.isArray(shift_schedule)) {
                normalizedSchedule = shift_schedule.map((item) => {
                    if (item && typeof item === "object" && item.date) {
                        return {
                            date: item.date,
                            start: item.start || "08:00",
                            end: item.end || "16:00",
                        };
                    }
                    return null;
                }).filter(Boolean);
            }

            // Cập nhật shift_schedule
            const updated = await EmployeeDAO.update(employee_id, {
                shift_schedule: normalizedSchedule,
                updated_at: new Date(),
            });

            // Lấy user để map role sang position nếu cần
            const user = await UserDAO.findEmployAcc(employee_id);
            let position = updated.position;
            if ((!position || (typeof position === 'string' && position.trim() === "")) && user) {
                position = this.mapRoleToPosition(user.role);
            }
            // Tạo thông báo cho các role liên quan
            // Nếu client truyền `notify_roles` thì dùng các role đó,
            // ngược lại chỉ gửi cho role của employee (nếu biết).
            (async () => {
                try {
                    const allowedRoles = ["Admin", "Doctor", "Nurse", "Receptionist", "Accountant", "Pharmacist"];
                    let rolesToNotify = null;

                    if (Array.isArray(req.body?.notify_roles) && req.body.notify_roles.length > 0) {
                        rolesToNotify = req.body.notify_roles.filter(r => typeof r === 'string' && allowedRoles.includes(r));
                    }

                    if (!rolesToNotify || rolesToNotify.length === 0) {
                        if (user && user.role && allowedRoles.includes(user.role)) {
                            rolesToNotify = [user.role];
                        } else {
                            rolesToNotify = [];
                        }
                    }

                    if (rolesToNotify.length > 0) {
                        const employeeName = updated.fullname || "nhân viên";
                        const title = "Lịch trực được cập nhật";
                        const message = `Admin đã cập nhật lịch trực của ${employeeName}.`;

                        await Promise.all(
                            rolesToNotify.map((r) =>
                                notificationDao.createForRole(r, {
                                    type: "schedule_updated",
                                    title,
                                    message,
                                    related_id: updated._id,
                                    related_type: "schedule",
                                })
                            )
                        );
                    }
                } catch (notifErr) {
                    console.error("❌ [Schedule] Error creating notifications for roles:", notifErr);
                }
            })();

            return res.status(201).json({
                employee_id: updated._id,
                employee_name: updated.fullname,
                employee_position: position || "N/A",
                shift_schedule: updated.shift_schedule,
            });
        } catch (err) {
            console.error("ScheduleController.create error:", err);
            return res.status(500).json({ error: err.message });
        }
    }

    // PUT /api/schedules/:employee_id - Cập nhật lịch trực (chỉ Admin)
    async update(req, res) {
        try {
            const { employee_id } = req.params;
            const { shift_schedule } = req.body;

            const employee = await EmployeeDAO.findById(employee_id);
            if (!employee) {
                return res.status(404).json({ message: "Không tìm thấy nhân viên" });
            }

            // Validate và chuẩn hóa shift_schedule
            let normalizedSchedule = [];
            if (Array.isArray(shift_schedule)) {
                normalizedSchedule = shift_schedule.map((item) => {
                    if (item && typeof item === "object" && item.date) {
                        return {
                            date: item.date,
                            start: item.start || "08:00",
                            end: item.end || "16:00",
                        };
                    }
                    return null;
                }).filter(Boolean);
            }

            // Cập nhật shift_schedule
            const updated = await EmployeeDAO.update(employee_id, {
                shift_schedule: normalizedSchedule,
                updated_at: new Date(),
            });

            // Lấy user để map role sang position nếu cần
            const user = await UserDAO.findEmployAcc(employee_id);
            let position = updated.position;
            if ((!position || (typeof position === 'string' && position.trim() === "")) && user) {
                position = this.mapRoleToPosition(user.role);
            }

            // Tạo thông báo cho các role liên quan
            // Nếu client truyền `notify_roles` thì dùng các role đó,
            // ngược lại chỉ gửi cho role của employee (nếu biết).
            (async () => {
                try {
                    const allowedRoles = ["Admin", "Doctor", "Nurse", "Receptionist", "Accountant", "Pharmacist"];
                    let rolesToNotify = null;

                    if (Array.isArray(req.body?.notify_roles) && req.body.notify_roles.length > 0) {
                        rolesToNotify = req.body.notify_roles.filter(r => typeof r === 'string' && allowedRoles.includes(r));
                    }

                    if (!rolesToNotify || rolesToNotify.length === 0) {
                        if (user && user.role && allowedRoles.includes(user.role)) {
                            rolesToNotify = [user.role];
                        } else {
                            rolesToNotify = [];
                        }
                    }

                    if (rolesToNotify.length > 0) {
                        const employeeName = updated.fullname || "nhân viên";
                        const title = "Lịch trực được cập nhật";
                        const message = `Admin đã cập nhật lịch trực của ${employeeName}.`;

                        await Promise.all(
                            rolesToNotify.map((r) =>
                                notificationDao.createForRole(r, {
                                    type: "schedule_updated",
                                    title,
                                    message,
                                    related_id: updated._id,
                                    related_type: "schedule",
                                })
                            )
                        );
                    }
                } catch (notifErr) {
                    console.error("❌ [Schedule] Error creating notifications for roles:", notifErr);
                }
            })();

            return res.json({
                employee_id: updated._id,
                employee_name: updated.fullname,
                employee_position: position || "N/A",
                shift_schedule: updated.shift_schedule,
            });
        } catch (err) {
            console.error("ScheduleController.update error:", err);
            return res.status(500).json({ error: err.message });
        }
    }

    // DELETE /api/schedules/:employee_id - Xóa lịch trực (chỉ Admin)
    async remove(req, res) {
        try {
            const { employee_id } = req.params;

            const employee = await EmployeeDAO.findById(employee_id);
            if (!employee) {
                return res.status(404).json({ message: "Không tìm thấy nhân viên" });
            }

            // Xóa shift_schedule (set về mảng rỗng)
            await EmployeeDAO.update(employee_id, {
                shift_schedule: [],
                updated_at: new Date(),
            });

            return res.json({ message: "Đã xóa lịch trực thành công" });
        } catch (err) {
            console.error("ScheduleController.remove error:", err);
            return res.status(500).json({ error: err.message });
        }
    }
}
//
export default new ScheduleController();