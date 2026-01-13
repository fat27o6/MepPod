import jwt from 'jsonwebtoken';
import TokenBlacklist from '../src/models/token-blacklist.model.js';

const authMiddleware = (roles = []) => {
  if (typeof roles === 'string') roles = [roles];
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ message: 'No token' });

      const parts = authHeader.split(' ');
      if (parts.length !== 2) return res.status(401).json({ message: 'Format token không hợp lệ' });

      const token = authHeader.split(' ')[1];
      const blacklisted = await TokenBlacklist.findOne({ token });
      if (blacklisted) return res.status(401).json({ message: 'Token đã bị thu hồi' });

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload;
      if (roles.length && !roles.includes(payload.role)) {
        console.log('❌ Access denied:', {
          userRole: payload.role,
          requiredRoles: roles,
          userId: payload.userId || payload._id
        });
        return res.status(403).json({
          message: 'Không có quyền truy cập',
          userRole: payload.role,
          requiredRoles: roles
        });
      }
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }
  };
};

export default authMiddleware;
