// Tự code
import dao from '../dao/appointment.dao.js';
import notificationDao from '../dao/notification.dao.js';
import UserDAO from '../dao/user.dao.js';
import Patient from '../models/patient.model.js';
import AppointmentService from '../services/appointment.service.js';

class AppointmentController {
  async create(req, res) {
    try {
      const created = await dao.create(req.body);
      let result = created;
      try {
        result = await dao.model
          .findById(created._id)
          .populate("patient_id", "fullname")
          .populate("doctor_id", "fullname position")
          .exec();
      } catch (e) {
        console.warn("Could not populate appointment after create:", e.message || e);
      }

      // Kế thừa
      // Tạo thông báo cho Doctor khi có lịch hẹn mới
      if (result.doctor_id) {
        try {
          let doctorId = result.doctor_id;
          if (doctorId && typeof doctorId === 'object' && doctorId._id) {
            doctorId = doctorId._id;
          }
          if (doctorId && typeof doctorId === 'object' && doctorId.toString) {
            doctorId = doctorId.toString();
          }
          console.log('🔔 [Appointment] Creating notification for doctor_id:', doctorId);

          const doctorUser = await UserDAO.findEmployAcc(doctorId);
          console.log('🔔 [Appointment] Found doctor user:', doctorUser ? {
            _id: doctorUser._id,
            username: doctorUser.username,
            role: doctorUser.role,
            employee_id: doctorUser.employee_id
          } : 'NOT FOUND');

          if (doctorUser) {
            // patient may already be populated
            const patient = result.patient_id && result.patient_id.fullname
              ? result.patient_id
              : await Patient.findById(result.patient_id);
            const patientName = patient ? patient.fullname : 'Bệnh nhân';
            const appointmentDate = new Date(result.appointment_date);
            const formattedDate = appointmentDate.toLocaleString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            let doctorUserId = doctorUser._id;
            if (doctorUserId && typeof doctorUserId === 'object' && doctorUserId.toString) {
              doctorUserId = doctorUserId.toString();
            }

            const notificationData = {
              type: 'appointment_created',
              title: 'Lịch hẹn mới',
              message: `Bạn có lịch hẹn mới với ${patientName} vào ${formattedDate}`,
              related_id: result._id,
              related_type: 'appointment'
            };
            console.log('🔔 [Appointment] Creating notification with data:', {
              ...notificationData,
              recipient_user_id: doctorUserId
            });

            const notification = await notificationDao.createForUser(doctorUserId, notificationData);
            console.log('✅ [Appointment] Notification created successfully for doctor:', notification._id);
          } else {
            console.warn('⚠️ [Appointment] Doctor user not found for employee_id:', doctorId);
          }
        } catch (notifErr) {
          console.error('❌ [Appointment] Error creating notification for appointment:', notifErr);
          console.error('❌ [Appointment] Error details:', {
            message: notifErr.message,
            stack: notifErr.stack,
            doctor_id: result.doctor_id
          });
        }
      } else {
        console.log('ℹ️ [Appointment] No doctor_id in appointment, skipping notification');
      }

      (async () => {
        try {
          const patientName = (result.patient_id && result.patient_id.fullname) ? result.patient_id.fullname : (await Patient.findById(result.patient_id)).fullname || 'Bệnh nhân';
          const appointmentDate = new Date(result.appointment_date);
          const formattedDate = appointmentDate.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          await notificationDao.createForRole('Receptionist', {
            type: 'appointment_created',
            title: 'Lịch hẹn mới',
            message: `Có lịch hẹn mới của ${patientName} vào ${formattedDate}`,
            related_id: result._id,
            related_type: 'appointment'
          });

          console.log('✅ [Appointment] Notifications created for Receptionists');
        } catch (roleNotifErr) {
          console.error('❌ [Appointment] Error creating notifications for Receptionists:', roleNotifErr);
        }
      })();

      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    //
  };

  async findAll(req, res) {
    try {
      const filter = {};
      if (req.query.disabled !== undefined) {
        filter.disabled = req.query.disabled === 'true';
      }
      try {
        const result = await dao.model.find(filter)
          .populate('patient_id', 'fullname')
          .populate('doctor_id', 'fullname position')
          .exec();
        return res.json(result);
      } catch (e) {
        console.warn('Không thể lấy ra appointments trong findAll:', e.message || e);
        const result = await dao.findAll(filter);
        return res.json(result);
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async findById(req, res) {
    try {
      const result = await dao.findById(req.params.id);
      if (!result) return res.status(404).json({ message: 'Not found' });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async findByDocId(req, res) {
    try {
      const result = await dao.findDoctorAppoint(req.params.id);
      if (!result) return res.status(404).json({ message: 'Not found' });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async findByPatientId(req, res) {
    try {
      const result = await dao.findPatientAppoint(req.params.id);
      if (!result) return res.status(404).json({ message: 'Not found' });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async update(req, res) {
    try {
      const result = await dao.update(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  // Kế thừa
  async remove(req, res) {
    try {
      const hard = req.query && req.query.hard === 'true';

      const appointmentRaw = await dao.model.findById(req.params.id).exec();
      if (!appointmentRaw) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      if (hard) {
        await dao.hardDelete(req.params.id);
        return res.json({ message: 'Appointment hard deleted with cascade (permanent)' });
      }

      if (appointmentRaw.disabled) {
        return res.json({ message: 'Appointment already deleted' });
      }

      if (appointmentRaw.status === 'Completed') {
        return res.status(400).json({ error: 'Completed appointment cannot be deleted' });
      }

      await AppointmentService.deleteCascade(req.params.id);
      res.json({ message: 'Appointment deleted with cascade' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
  //

  async restore(req, res) {
    try {
      await AppointmentService.restoreCascade(req.params.id);
      res.json({ message: 'Appointment restore with cascade' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

}

export default new AppointmentController();