import Notification from '../models/notification.model.js';
import BaseDAO from './base.dao.js';
import { broadcastNotification } from '../utils/notification-broadcaster.js';

class NotificationDAO extends BaseDAO {
  constructor() {
    super(Notification);
  }

  async findByRecipient(recipientId, filter = {}) {
    const query = { recipient_id: recipientId, disabled: false, ...filter };
    return await this.model.find(query).sort({ created_at: -1 });
  }

  async findByRole(role, filter = {}) {
    const query = { recipient_role: role, disabled: false, ...filter };
    return await this.model.find(query).sort({ created_at: -1 });
  }

  async getUnreadCount(recipientId, filter = {}) {
    const query = {
      recipient_id: recipientId,
      read: false,
      disabled: false,
      ...filter
    };
    return await this.model.countDocuments(query);
  }

  async markAsRead(notificationId, recipientId) {
    return await this.model.findOneAndUpdate(
      { _id: notificationId, recipient_id: recipientId },
      { read: true, updated_at: new Date() },
      { new: true }
    );
  }

  async markAllAsRead(recipientId) {
    return await this.model.updateMany(
      { recipient_id: recipientId, read: false, disabled: false },
      { read: true, updated_at: new Date() }
    );
  }

  async createForRole(role, notificationData) {
    // Tạo thông báo cho tất cả user có role này
    const User = (await import('../models/user.model.js')).default;
    const users = await User.find({ role, disabled: false }).exec();
    console.log(`🔔 [NotificationDAO] createForRole: role=${role}, usersFound=${users.length}`);

    const notifications = users.map(user => ({
      ...notificationData,
      recipient_id: user._id,
      recipient_role: role,
    }));

    if (notifications.length > 0) {
      try {
        const created = await this.model.insertMany(notifications);
        console.log(`🔔 [NotificationDAO] createForRole: created=${created.length} notifications for role=${role}`);
        try {
          created.forEach(c => broadcastNotification(c));
        } catch (e) {
          console.warn('Notification broadcast error (role):', e.message || e);
        }
        return created;
      } catch (insertErr) {
        console.error('❌ [NotificationDAO] insertMany error for role:', role, insertErr);
        throw insertErr;
      }
    }
    return [];
  }

  async createForUser(userId, notificationData) {
    // Tạo thông báo cho một user cụ thể
    const User = (await import('../models/user.model.js')).default;
    const mongoose = await import('mongoose');

    // Convert userId sang ObjectId nếu cần
    let userIdObj = userId;
    if (typeof userId === 'string') {
      try {
        userIdObj = new mongoose.default.Types.ObjectId(userId);
      } catch (err) {
        throw new Error(`Invalid user ID format: ${userId}`);
      }
    }

    const user = await User.findById(userIdObj).exec();

    if (!user) {
      throw new Error(`User not found with ID: ${userId}`);
    }

    console.log('🔔 [NotificationDAO] Creating notification for user:', {
      userId: userIdObj.toString(),
      username: user.username,
      role: user.role
    });

    const notification = await this.model.create({
      ...notificationData,
      recipient_id: userIdObj,
      recipient_role: user.role,
    });

    console.log('✅ [NotificationDAO] Notification created:', notification._id);
    try {
      broadcastNotification(notification);
    } catch (e) {
      console.warn('Notification broadcast error (user):', e.message || e);
    }
    return notification;
  }
}

export default new NotificationDAO();