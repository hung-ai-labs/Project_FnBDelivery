package com.fnb.backend.controller;

import com.fnb.backend.service.GmailCardMailer;
import com.fnb.backend.service.RomanticCardService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;

@RestController
@RequestMapping("/api/romantic-cards/gmail")
public class GmailCardConnectionController {
    private final GmailCardMailer gmail;
    private final RomanticCardService cards;
    public GmailCardConnectionController(GmailCardMailer gmail,RomanticCardService cards){this.gmail=gmail;this.cards=cards;}
    private HttpSession owner(HttpServletRequest request){var session=request.getSession(false);cards.requireOwner(session==null?null:(Long)session.getAttribute("UserID"));return session;}
    record Pending(String state,String verifier,Instant expires){}
    @GetMapping("/connect") public ResponseEntity<?> connect(HttpServletRequest request){
        var session=owner(request);
        try {
            String state=random(),verifier=random();String url=gmail.authorizationUrl(state,verifier);
            session.setAttribute("GmailCardOAuth",new Pending(state,verifier,Instant.now().plusSeconds(600)));
            return ResponseEntity.status(302).location(URI.create(url)).header("Cache-Control","no-store").build();
        }catch(IllegalArgumentException e){return page(false,"Chưa cấu hình Google OAuth. Làm theo docs/gmail-api.md rồi thử lại.");}
    }
    @GetMapping("/callback") public ResponseEntity<String> callback(HttpServletRequest request,
            @RequestParam(required=false) String state,@RequestParam(required=false) String code,@RequestParam(required=false) String error){
        var session=owner(request);Pending pending;
        synchronized(session){pending=(Pending)session.getAttribute("GmailCardOAuth");session.removeAttribute("GmailCardOAuth");}
        if(pending==null||state==null||!MessageDigest.isEqual(pending.state().getBytes(java.nio.charset.StandardCharsets.UTF_8),state.getBytes(java.nio.charset.StandardCharsets.UTF_8))||Instant.now().isAfter(pending.expires()))return page(false,"Phiên kết nối đã hết hạn hoặc không hợp lệ. Quay về trang thiệp để kết nối lại.");
        if(error!=null||code==null||code.isBlank())return page(false,"Chưa cấp quyền Gmail. Anh có thể quay lại và kết nối khi sẵn sàng.");
        try {gmail.connect(code,pending.verifier());return page(true,"Đã kết nối Gmail hungmk2005@gmail.com. Quay lại tab viết thiệp để gửi thử trước nhé.");}
        catch(InterruptedException e){Thread.currentThread().interrupt();return page(false,"Kết nối bị gián đoạn. Anh thử kết nối lại nhé.");}
        catch(Exception e){return page(false,"Chưa kết nối được. Chọn đúng hungmk2005@gmail.com, cấp quyền gửi Gmail và kiểm tra cấu hình Google OAuth.");}
    }
    private static String random(){byte[] bytes=new byte[32];new SecureRandom().nextBytes(bytes);return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);}
    private static ResponseEntity<String> page(boolean success,String message){return ResponseEntity.status(success?200:400).contentType(MediaType.TEXT_HTML).header("Cache-Control","no-store").header("Referrer-Policy","no-referrer").body("<!doctype html><html lang=\"vi\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Kết nối Gmail</title><body style=\"background:#fff7f3;color:#74334c;font:18px/1.7 system-ui;max-width:600px;margin:80px auto;padding:24px\"><h1>♡ Kết nối Gmail</h1><p>"+message+"</p><p><a href=\"/anh-muon-hen-ho.html\">Mở trang viết thiệp</a></p><p>Nếu tab viết thiệp vẫn mở, quay lại tab đó để giữ nguyên nội dung.</p></body></html>");}
}
