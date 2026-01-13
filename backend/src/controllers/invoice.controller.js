import mongoose from 'mongoose';

import dao from '../dao/invoice.dao.js';
import medicalRecordDao from '../dao/medical-record.dao.js';
import notificationDao from '../dao/notification.dao.js';
import MedicineImport from '../models/medicine-import.model.js';
import InvoiceService from '../services/invoice.service.js';

// Kế thừa
/**
 * Trừ số lượng thuốc từ medicine-imports sử dụng thuật toán FEFO (First Expired First Out)
 * @param {Object} prescription - Prescription object với medicine_id và quantity
 * @returns {Promise<void>}
 */
async function deductMedicineFromInventory(prescription, session) {
  // Xử lý medicine_id có thể là object (khi populate) hoặc string/ObjectId
  let medicineId = prescription.medicine_id;
  if (medicineId && typeof medicineId === 'object') {
    medicineId = medicineId._id || medicineId.toString();
  }

  // Convert sang ObjectId để đảm bảo so sánh đúng
  try {
    medicineId = new mongoose.Types.ObjectId(medicineId);
  } catch (err) {
    console.error('❌ [deductMedicineFromInventory] Lỗi convert medicineId sang ObjectId:', {
      medicineId,
      error: err.message
    });
    return;
  }

  const requiredQuantity = Number(prescription.quantity) || 0;

  console.log('🔍 [deductMedicineFromInventory] Bắt đầu trừ thuốc:', {
    medicineId: medicineId.toString(),
    requiredQuantity,
    prescriptionType: typeof prescription.medicine_id
  });

  if (!medicineId || requiredQuantity <= 0) {
    console.warn('⚠️ [deductMedicineFromInventory] Bỏ qua - medicineId hoặc quantity không hợp lệ:', {
      medicineId: medicineId?.toString(),
      requiredQuantity
    });
    return;
  }

  // Lấy tất cả các lô thuốc còn lại, chưa hết hạn, sắp xếp theo hạn sử dụng (FEFO)
  const availableImports = await MedicineImport.find({
    medicine_id: medicineId,
    disabled: false,
    remaining: { $gt: 0 },
    expiry_date: { $gte: new Date() } // Chỉ lấy thuốc chưa hết hạn
  }).session(session)
    .sort({ expiry_date: 1, import_date: 1 }) // Sắp xếp theo hạn sử dụng (sớm nhất trước), sau đó theo ngày nhập
    .exec();

  console.log(`📦 [deductMedicineFromInventory] Tìm thấy ${availableImports.length} lô thuốc chưa hết hạn cho medicineId: ${medicineId}`);

  let remainingToDeduct = requiredQuantity;
  let totalDeducted = 0;

  // Trừ từng lô theo thứ tự FEFO
  for (const importItem of availableImports) {
    if (remainingToDeduct <= 0) {
      break;
    }

    const availableInThisBatch = importItem.remaining || 0;
    const deductFromThisBatch = Math.min(remainingToDeduct, availableInThisBatch);

    console.log(`📉 [deductMedicineFromInventory] Trừ từ lô ${importItem._id}:`, {
      batchCode: importItem.batchcode,
      availableBefore: availableInThisBatch,
      deducting: deductFromThisBatch,
      remainingAfter: availableInThisBatch - deductFromThisBatch
    });

    // Cập nhật remaining
    const newRemaining = availableInThisBatch - deductFromThisBatch;
    const updateResult = await MedicineImport.findByIdAndUpdate(importItem._id, {
      remaining: newRemaining,
      updated_at: new Date()
    }, { new: true });

    console.log(`✅ [deductMedicineFromInventory] Đã cập nhật lô ${importItem._id}, remaining mới: ${updateResult?.remaining}`);

    remainingToDeduct -= deductFromThisBatch;
    totalDeducted += deductFromThisBatch;
  }

  // Nếu vẫn còn thiếu, kiểm tra cả thuốc đã hết hạn (nhưng vẫn còn trong kho)
  if (remainingToDeduct > 0) {
    console.log(`⚠️ [deductMedicineFromInventory] Vẫn còn thiếu ${remainingToDeduct}, kiểm tra thuốc đã hết hạn...`);
    const expiredImports = await MedicineImport.find({
      medicine_id: medicineId,
      disabled: false,
      remaining: { $gt: 0 },
      expiry_date: { $lt: new Date() } // Thuốc đã hết hạn
    })
      .sort({ expiry_date: 1, import_date: 1 })
      .exec();

    console.log(`📦 [deductMedicineFromInventory] Tìm thấy ${expiredImports.length} lô thuốc đã hết hạn`);

    for (const importItem of expiredImports) {
      if (remainingToDeduct <= 0) {
        break;
      }

      const availableInThisBatch = importItem.remaining || 0;
      const deductFromThisBatch = Math.min(remainingToDeduct, availableInThisBatch);

      console.log(`📉 [deductMedicineFromInventory] Trừ từ lô đã hết hạn ${importItem._id}:`, {
        batchCode: importItem.batchcode,
        availableBefore: availableInThisBatch,
        deducting: deductFromThisBatch
      });

      const newRemaining = availableInThisBatch - deductFromThisBatch;
      await MedicineImport.findByIdAndUpdate(
        importItem._id,
        { remaining: newRemaining, updated_at: new Date() },
        { session }
      );

      remainingToDeduct -= deductFromThisBatch;
      totalDeducted += deductFromThisBatch;
    }
  }

  // Nếu vẫn còn thiếu sau khi trừ hết, ghi log cảnh báo (không throw error để không block việc tạo invoice)
  if (remainingToDeduct > 0) {
    console.warn(
      `⚠️ [deductMedicineFromInventory] Cảnh báo: Không đủ thuốc trong kho. Medicine ID: ${medicineId}, Yêu cầu: ${requiredQuantity}, Đã trừ: ${totalDeducted}, Thiếu: ${remainingToDeduct}`
    );
  } else {
    console.log(`✅ [deductMedicineFromInventory] Hoàn thành trừ thuốc. Medicine ID: ${medicineId}, Đã trừ: ${totalDeducted}/${requiredQuantity}`);
  }
}
//

class InvoiceController {

  async create(req, res) {
    try {
      const result = await dao.create(req.body);
      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  // Kế thừa
  async createFromMedicalRecord(req, res) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const { medicalRecordId } = req.params;

      // Lấy medical record với đầy đủ thông tin
      const medicalRecord = await medicalRecordDao.model
        .findOne({ _id: medicalRecordId, disabled: false })
        .session(session)
        .populate('patient_id')
        .populate('appointment_id')
        .populate('prescriptions.medicine_id', 'name unit price')
        .exec();

      if (!medicalRecord) {
        return res.status(404).json({ error: 'Hồ sơ y tế không tồn tại' });
      }
      if (!medicalRecord.appointment_id) {
        return res.status(400).json({
          error: 'Hồ sơ y tế phải có lịch hẹn để tạo hóa đơn. Vui lòng liên kết hồ sơ với lịch hẹn trước.'
        });
      }
      if (!medicalRecord.prescriptions || medicalRecord.prescriptions.length === 0) {
        return res.status(400).json({
          error: 'Hồ sơ y tế phải có toa thuốc để tạo hóa đơn'
        });
      }

      // Tính tổng tiền từ prescriptions
      let totalAmount = 0;
      for (const prescription of medicalRecord.prescriptions) {
        const medicine = prescription.medicine_id;
        if (medicine && medicine.price && prescription.quantity) {
          totalAmount += Number(medicine.price) * Number(prescription.quantity);
        }
      }

      if (totalAmount === 0) {
        return res.status(400).json({
          error: 'Tổng tiền bằng 0. Vui lòng kiểm tra giá thuốc và số lượng.'
        });
      }

      // Kiểm tra xem đã có invoice cho appointment này chưa
      const appointmentId = medicalRecord.appointment_id._id || medicalRecord.appointment_id;
      const existingInvoice = await dao.model.findOne({
        appointment_id: appointmentId,
        disabled: false
      });

      if (existingInvoice) {
        return res.status(400).json({
          error: 'Hóa đơn đã tồn tại cho lịch hẹn này',
          invoice_id: existingInvoice._id
        });
      }

      console.log(`💊 [createFromMedicalRecord] Bắt đầu trừ thuốc cho ${medicalRecord.prescriptions.length} loại thuốc`);

      for (const prescription of medicalRecord.prescriptions) {
        try {
          console.log(`💊 [createFromMedicalRecord] Đang trừ thuốc:`, {
            medicine: prescription.medicine_id,
            quantity: prescription.quantity
          });

          await deductMedicineFromInventory(prescription, session);
        } catch (err) {
          console.error('❌ [createFromMedicalRecord] Lỗi khi trừ thuốc từ kho:', err);
          console.error('❌ [createFromMedicalRecord] Chi tiết lỗi:', {
            prescription,
            error: err.message,
            stack: err.stack
          });
        }
      }
      console.log(`✅ [createFromMedicalRecord] Hoàn thành trừ thuốc, bắt đầu tạo invoice`);

      const patientId = medicalRecord.patient_id._id || medicalRecord.patient_id;

      const invoiceData = {
        patient_id: patientId,
        appointment_id: appointmentId,
        total_amount: totalAmount,
        status: 'Unpaid'
      };

      const result = await dao.create(invoiceData, session);

      await session.commitTransaction();

      const populatedInvoice = await dao.model
        .findById(result._id)
        .populate('patient_id')
        .populate('appointment_id')
        .exec();

      try {
        const patientName = populatedInvoice.patient_id?.fullname || 'Bệnh nhân';
        const amount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(populatedInvoice.total_amount);

        await notificationDao.createForRole('Accountant', {
          type: 'invoice_created',
          title: 'Hóa đơn mới',
          message: `Hóa đơn mới cho ${patientName} với tổng tiền ${amount}. Vui lòng xử lý thanh toán.`,
          related_id: populatedInvoice._id,
          related_type: 'invoice'
        });

        // Thông báo cho Admin
        await notificationDao.createForRole('Admin', {
          type: 'invoice_created',
          title: 'Hóa đơn mới',
          message: `Hóa đơn mới cho ${patientName} với tổng tiền ${amount}.`,
          related_id: populatedInvoice._id,
          related_type: 'invoice'
        });
      } catch (notifErr) {
        console.error('Error creating notification for invoice:', notifErr);
      }

      res.status(201).json(populatedInvoice);
    } catch (err) {
        await session.abortTransaction();
        return res.status(500).json({ error: err.message });

      } finally {
        session.endSession();
      }
  };
  //

  async findAll(req, res) {
    try {
      const filter = {};
      if (req.query.disabled !== undefined) {
        if (!req.user || req.user.role !== 'Admin') {
          return res.status(403).json({ error: 'Không có quyền xem mục Thùng rác' });
        }
        filter.disabled = req.query.disabled === 'true';
      }
      const result = await dao.findAll(filter);
      res.json(result);
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

  async update(req, res) {
    try {
      const result = await dao.update(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async remove(req, res) {
    try {
      await InvoiceService.deleteCascade(req.params.id);
      res.json({ message: 'Deleted with cascade' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async restore(req, res) {
    try {
      await InvoiceService.restoreCascade(req.params.id);
      res.json({ message: 'Invoice restore with cascade' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  async findByPatientId(req, res) {
    try {
      const result = await dao.findByPatientId(req.params.id);
      res.json(Array.isArray(result) ? result : []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

export default new InvoiceController();