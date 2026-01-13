import Payment from '../models/payment.model.js';
import BaseDAO from './base.dao.js';

class PaymentDAO extends BaseDAO {
  async injectDB(conn) {
    return;
  }

  constructor() {
    super(Payment);
  }
}

export default new PaymentDAO()