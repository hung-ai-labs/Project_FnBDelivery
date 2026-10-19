package com.fnb.backend.service;

import com.fnb.backend.dto.Request.RomanticCardRequest;
import com.fnb.backend.repository.UsersRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class RomanticCardService {
    public static final String TEST_RECIPIENT="hungmk2005@gmail.com";
    private final UsersRepository users;
    private final RomanticCardTemplate template;
    private final DateInvitationMailer mailer;
    private final GmailCardMailer gmail;
    private final String provider;
    private final String recipient;
    private final String sender;
    public RomanticCardService(UsersRepository users, RomanticCardTemplate template, DateInvitationMailer mailer, GmailCardMailer gmail,
            @Value("${ROMANTIC_CARD_PROVIDER:gmail}") String provider,
            @Value("${app.romantic-card.recipient:Khanhchiinekk@gmail.com}") String recipient,
            @Value("${app.romantic-card.from:Tiệm bánh Chì và Hung <onboarding@resend.dev>}") String sender) {
        this.gmail=gmail;this.provider=provider;this.users=users;this.template=template;this.mailer=mailer;this.recipient=recipient;this.sender=sender;
    }
    public void requireOwner(Long userId) {
        if (userId==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Đăng nhập trước nhé.");
        var user=users.findById(userId).orElseThrow(()->new ResponseStatusException(HttpStatus.FORBIDDEN));
        if (!"Hung452005".equalsIgnoreCase(user.getUsername())) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Tính năng này dành riêng cho Hung452005.");
    }
    public boolean canSendLive() { return usesGmail()?gmail.connected():!sender.toLowerCase().contains("@resend.dev"); }
    private boolean usesGmail() { return "gmail".equalsIgnoreCase(provider); }
    public Map<String,Object> settings() { boolean ready=canSendLive();return Map.of("recipient",recipient,"testRecipient",TEST_RECIPIENT,"canSendLive",ready,"canSendTest",usesGmail()?ready:true,"provider",usesGmail()?"gmail":"resend","gmailConfigured",gmail.configured()); }
    public String preview(RomanticCardRequest request) { template.validate(request,false);return template.render(request,false); }
    public String send(RomanticCardRequest request, Long userId, boolean test) throws IOException,InterruptedException {
        requireOwner(userId);
        template.validate(request,true);
        if (usesGmail() && !canSendLive()) throw new IllegalArgumentException("Anh kết nối Gmail trước khi gửi thiệp nhé.");
        if (!usesGmail() && !test && !canSendLive()) throw new IllegalArgumentException("Cần cấu hình ROMANTIC_CARD_FROM bằng địa chỉ gửi thuộc tên miền đã xác minh trên Resend trước khi gửi cho Chi. Anh vẫn có thể gửi thử cho mình.");
        Map<String,Object> payload=new LinkedHashMap<>();
        payload.put("from",usesGmail()?"Tiệm bánh Chì và Hung <hungmk2005@gmail.com>":sender);payload.put("to",List.of(test?TEST_RECIPIENT:recipient));
        payload.put("subject",(test?"[THIỆP THỬ] ":"")+request.title());
        payload.put("text",(test?"BẢN KIỂM TRA GỬI EMAIL — KHÔNG PHẢI LỊCH HẸN ĐÃ CHỐT.\n\n":"")+template.plain(request));
        payload.put("html",template.render(request,true));
        var photo=template.photo(request.imageData());
        if(photo!=null) payload.put("attachments",List.of(Map.of("filename",photo.filename(),"content",photo.content(),"content_type",photo.mime(),"content_id","romantic-card-photo")));
        String key="romantic-card/"+userId+"/"+(test?"test/":"live/")+request.requestId();
        return usesGmail()?gmail.send(payload,key):mailer.sendPayload(payload,key);
    }
}
