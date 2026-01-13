# Hướng dẫn tích hợp VNPay

## 1. Đăng ký tài khoản VNPay Sandbox

1. Truy cập: https://sandbox.vnpayment.vn/
2. Đăng ký tài khoản merchant
3. Sau khi đăng ký, bạn sẽ nhận được:
   - **TmnCode** (Terminal ID)
   - **HashSecret** (Secret key)

## 2. Cấu hình Environment Variables

Thêm các biến sau vào file `.env` của backend:

```env
# VNPay Configuration
VNPAY_TMN_CODE=your_tmn_code_here
VNPAY_HASH_SECRET=your_hash_secret_here
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3000/dashboard/invoices/[invoice_id]?payment=success
VNPAY_IPN_URL=http://localhost:5050/api/payments/vnpay-ipn

# Frontend URL (để redirect sau khi thanh toán)
FRONTEND_URL=http://localhost:3000
```

**Lưu ý:**
- `VNPAY_RETURN_URL`: URL mà VNPay sẽ redirect về sau khi thanh toán
- `VNPAY_IPN_URL`: URL webhook mà VNPay sẽ gọi để thông báo kết quả thanh toán
- Trong production, thay `localhost` bằng domain thực tế

## 3. Test VNPay

### Bước 1: Tạo invoice
- Tạo một invoice trong hệ thống

### Bước 2: Thanh toán VNPay
- Vào trang chi tiết invoice
- Click nút **"Thanh toán VNPay"**
- Hệ thống sẽ redirect đến trang thanh toán VNPay

### Bước 3: Test thanh toán
Trong môi trường sandbox, bạn có thể test với:
- **Thẻ test**: Sử dụng thẻ test từ VNPay
- **Tài khoản test**: Đăng nhập với tài khoản test

### Bước 4: Xác nhận thanh toán
- Sau khi thanh toán thành công, VNPay sẽ redirect về hệ thống
- Payment sẽ được tự động tạo trong database
- Invoice status sẽ được cập nhật tự động

## 4. Các Response Code của VNPay

- `00`: Giao dịch thành công
- `07`: Giao dịch bị nghi ngờ
- `09`: Thẻ/Tài khoản chưa đăng ký dịch vụ
- `10`: Xác thực thông tin không đúng quá 3 lần
- `11`: Đã hết hạn chờ thanh toán
- `12`: Thẻ/Tài khoản bị khóa
- `13`: Nhập sai mật khẩu OTP
- `51`: Tài khoản không đủ số dư
- `65`: Vượt quá hạn mức giao dịch trong ngày
- `75`: Ngân hàng đang bảo trì
- `79`: Nhập sai mật khẩu quá số lần quy định
- `99`: Lỗi không xác định

## 5. Lưu ý quan trọng

1. **IPN URL**: Phải là URL public (không thể dùng localhost trong production)
2. **Return URL**: Có thể dùng localhost để test
3. **Hash Secret**: Giữ bí mật, không commit vào git
4. **Amount**: VNPay yêu cầu amount tính bằng xu (x100), code đã tự động xử lý

## 6. Troubleshooting

### Lỗi "Invalid signature"
- Kiểm tra `VNPAY_HASH_SECRET` có đúng không
- Kiểm tra `VNPAY_TMN_CODE` có đúng không

### Không redirect về sau khi thanh toán
- Kiểm tra `VNPAY_RETURN_URL` có đúng không
- Kiểm tra firewall/network có chặn không

### Payment không được tạo
- Kiểm tra logs của backend
- Kiểm tra IPN URL có được VNPay gọi không
- Kiểm tra database connection

## 7. Tài liệu tham khảo

- VNPay Sandbox: https://sandbox.vnpayment.vn/
- VNPay Documentation: https://sandbox.vnpayment.vn/apis/

## 8. Thẻ test
- Ngân hàng: NCB
- Số thẻ: 9704198526191432198
- Tên chủ thẻ: NGUYEN VAN A
- Ngày phát hành: 07/15
- Mật khẩu OTP: 123456