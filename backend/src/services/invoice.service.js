import mongoose from 'mongoose';

import InvoiceDAO from '../dao/invoice.dao.js';
import PaymentDAO from '../dao/payment.dao.js';

class InvoiceService {
  async deleteCascade(invoiceId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await PaymentDAO.model.updateMany(
        { invoice_id: invoiceId, disabled: false },
        { disabled: true },
        { session }
      );

      const result = await InvoiceDAO.delete(invoiceId, session);

      await session.commitTransaction();
      return result;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  async restoreCascade(invoiceId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await PaymentDAO.model.updateMany(
        { invoice_id: invoiceId, disabled: true },
        { disabled: false },
        { session }
      );

      const result = await InvoiceDAO.restore(invoiceId, session);

      await session.commitTransaction();
      return result;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}

export default new InvoiceService();