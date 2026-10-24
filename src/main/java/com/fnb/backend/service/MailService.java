package com.fnb.backend.service;

import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.model.CreateEmailOptions;
import com.resend.services.emails.model.CreateEmailResponse;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
@NoArgsConstructor
public class MailService {
    @Value("${RESEND_API_KEY:}")
    private String resendApiKey;

    @Value("${USERNAME_EMAIL:hungmk2005@gmail.com}")
    private String myEmail;

    public void sendEmail(String text) {
        if (resendApiKey == null || resendApiKey.isBlank()) {
            org.slf4j.LoggerFactory.getLogger(MailService.class).warn("Không gửi được thông báo đơn hàng: chưa cấu hình RESEND_API_KEY.");
            return;
        }
        // Cho vào luồng ngầm để web không bị đơ
        new Thread(() -> {
            try {
                Resend resend = new Resend(resendApiKey);

                // Dùng CreateEmailOptions thay vì SendEmailRequest
                CreateEmailOptions params = CreateEmailOptions.builder()
                                                              .from("Tiệm Bánh Báo Đơn <onboarding@resend.dev>")
                                                              .to(myEmail)
                                                              .text(text)
                                                              .subject("Đơn hàng mới từ công chúa iu")
                                                              .html(null)
                                                              .build();

                // Dùng CreateEmailResponse thay vì SendEmailResponse
                CreateEmailResponse data = resend.emails().send(params);
                System.out.println("Đã gửi email thành công! ID: " + data.getId());

            } catch (ResendException e) {
                System.err.println("Lỗi gửi mail qua Resend: " + e.getMessage());
            }
        }).start();
    }
}
