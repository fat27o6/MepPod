import mongoose from 'mongoose';

import Payment from '../models/payment.model.js';
import paymentDao from '../dao/payment.dao.js';
import invoiceDao from '../dao/invoice.dao.js';

class PaymentService {
  // Kế thừa
  async create(data) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { invoice_id, amount } = data;

      const invoice = await invoiceDao.findById(invoice_id, session);
      if (!invoice) throw new Error('Hóa đơn không tồn tại');

      const payments = await Payment.find({
        invoice_id,
        disabled: false
      }).session(session);

      const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
      const remaining = invoice.total_amount - totalPaid;

      if (amount > remaining) {
        throw new Error(`Số tiền thanh toán vượt quá số tiền còn lại`);
      }

      const payment = await paymentDao.create(data, session);

      await this.#updateInvoiceStatus(invoice, totalPaid + amount, session);

      await session.commitTransaction();
      return payment;

    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  async update(id, data) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const current = await paymentDao.findById(id, session);
      if (!current) throw new Error('Thanh toán không tồn tại');

      if (data.amount !== undefined && data.amount !== current.amount) {
        const invoice = await invoiceDao.findById(current.invoice_id, session);
        if (!invoice) throw new Error('Hóa đơn không tồn tại');

        const payments = await Payment.find({
          invoice_id: invoice._id,
          disabled: false,
          _id: { $ne: id }
        }).session(session);

        const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);

        if (data.amount > invoice.total_amount - totalPaid) {
          throw new Error('Số tiền thanh toán vượt quá số tiền còn lại');
        }

        const updated = await paymentDao.update(id, data, session);
        await this.#updateInvoiceStatus(invoice, totalPaid + data.amount, session);

        await session.commitTransaction();
        return updated;
      }

      const updated = await paymentDao.update(id, data, session);
      await session.commitTransaction();
      return updated;

    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  async remove(id) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const payment = await paymentDao.findById(id, session);
      if (!payment) throw new Error('Thanh toán không tồn tại');

      await paymentDao.delete(id, session);

      const invoice = await invoiceDao.findById(payment.invoice_id, session);
      if (invoice) {
        const payments = await Payment.find({
          invoice_id: invoice._id,
          disabled: false
        }).session(session);

        const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
        await this.#updateInvoiceStatus(invoice, totalPaid, session);
      }

      await session.commitTransaction();

    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  async restore(id) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const payment = await paymentDao.findById(id, session);
      if (!payment) throw new Error('Thanh toán không tồn tại');

      await paymentDao.restore(id, session);

      const invoice = await invoiceDao.findById(payment.invoice_id, session);
      if (!invoice) throw new Error('Hóa đơn không tồn tại');

      const payments = await Payment.find({
        invoice_id: invoice._id,
        disabled: false
      }).session(session);

      const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
      await this.#updateInvoiceStatus(invoice, totalPaid, session);

      await session.commitTransaction();

    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  async #updateInvoiceStatus(invoice, totalPaid, session) {
    let status = 'Unpaid';
    if (totalPaid >= invoice.total_amount) status = 'Paid';
    else if (totalPaid > 0) status = 'Partial';

    await invoiceDao.update(invoice._id, { status }, session);
  }
  //
}

export default new PaymentService();