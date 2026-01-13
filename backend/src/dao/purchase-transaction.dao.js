import PurchaseTransaction from '../models/purchase-transaction.model.js';
import BaseDAO from './base.dao.js';

class PurchaseTransactionDAO extends BaseDAO {
  async injectDB(conn) {
    return;
  }

  constructor() {
    super(PurchaseTransaction);
  }
}

export default new PurchaseTransactionDAO()