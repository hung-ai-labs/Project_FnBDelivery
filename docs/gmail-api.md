# Gửi thiệp bằng Gmail API

Không cần tên miền riêng. Chỉ Hung452005 được kết nối/gửi, tài khoản Gmail được chấp nhận là hungmk2005@gmail.com. Người nhận thật vẫn là Khanhchiinekk@gmail.com. Gmail API dùng HTTPS; không phụ thuộc cổng SMTP của Render. Chức năng phiếu hẹn từ phía Chi hiện vẫn dùng Resend như trước.

## Thiết lập Google một lần

1. Trong https://console.cloud.google.com/ tạo/chọn project, vào APIs & Services → Library → bật **Gmail API**.
2. Vào Google Auth Platform: thiết lập Branding (tên ứng dụng và email hỗ trợ), Audience **External**. Nếu ở chế độ Testing, thêm **hungmk2005@gmail.com** vào Test users (người cấp quyền, không phải email Chi).
3. Data Access: thêm scope `https://www.googleapis.com/auth/gmail.send` và `openid`, email. App chỉ xin gửi thư và xác nhận email tài khoản, không xin đọc hộp thư.
4. Clients → Create client → **Web application**. Authorized redirect URIs phải khớp tuyệt đối:
   - `http://localhost:8080/api/romantic-cards/gmail/callback`
   - `https://tiem-banh-chi-va-hung-vi5p.onrender.com/api/romantic-cards/gmail/callback`
5. Lưu Client ID/Client Secret trực tiếp vào `.env` tại máy và Environment của dịch vụ Render; không gửi chúng vào chat hoặc commit Git.

```dotenv
ROMANTIC_CARD_PROVIDER=gmail
GMAIL_CLIENT_ID=<client ID do Google cấp>
GMAIL_CLIENT_SECRET=<client secret do Google cấp>
GMAIL_REDIRECT_URI=http://localhost:8080/api/romantic-cards/gmail/callback
GMAIL_TOKEN_KEY=<khóa AES 32 byte dạng base64>
```

Tạo khóa với `openssl rand -base64 32`, tự lưu kết quả vào `.env` / Render Environment. Trên Render đặt `GMAIL_REDIRECT_URI` thành URL HTTPS đầy đủ ở trên. Giữ nguyên khóa qua các lần deploy. Nếu local và Render dùng chung database, phải dùng cùng `GMAIL_TOKEN_KEY` và OAuth client; nếu không, kết nối sẽ không đọc được.

## Kết nối và gửi

Khởi động lại app/deploy. Đăng nhập Hung452005 → Góc của hai đứa → Anh muốn hẹn hò → **Kết nối Gmail của anh**. Google mở ở tab riêng: tự đăng nhập hungmk2005@gmail.com và cấp quyền gửi email. Khi báo thành công, quay lại tab viết thiệp (nội dung đang viết vẫn còn); các nút gửi tự cập nhật. Gửi thử cho anh trước rồi mới bấm gửi cho Chi.

Refresh token được mã hóa AES-GCM trong database; khóa chỉ ở môi trường server. Không lộ token qua API/HTML/log. OAuth kiểm tra state, PKCE, thời hạn và email đã xác minh. Khi thu hồi quyền tại Google Account, cần kết nối lại. Với OAuth External ở **Testing**, Google thường hết hạn refresh token sau 7 ngày đối với Gmail scope: kết nối lại khi cần, hoặc hoàn tất quy trình đưa ứng dụng sang Production theo yêu cầu Google. Production có thể yêu cầu xác minh ứng dụng/quyền nhạy cảm, không phải chỉ đổi một cờ là xong.

Gmail không có idempotency key cho API gửi: app lưu mã gửi trong database và không tự gửi lại các lần chưa rõ kết quả. Nếu mất kết nối trong khi gửi, kiểm tra thư **Đã gửi** trong Gmail trước khi tạo một lần gửi mới. Chỉ báo thành công khi Gmail trả về ID thư.

## Tài liệu chính thức

- https://developers.google.com/workspace/gmail/api/guides/sending
- https://developers.google.com/workspace/gmail/api/auth/scopes
- https://developers.google.com/identity/protocols/oauth2/web-server
