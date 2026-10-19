package com.fnb.backend.service;

import com.fnb.backend.dto.Request.RomanticCardRequest;
import com.fnb.backend.repository.UsersRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.Base64;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

/** Explicit opt-in only. Never sends to Chi; the server's test destination is fixed to Hung. */
@SpringBootTest
@EnabledIfEnvironmentVariable(named="RUN_ROMANTIC_MAIL_TEST",matches="true")
class RomanticCardLiveMailTest {
    @Autowired RomanticCardService service;
    @Autowired RomanticCardTemplate template;
    @Autowired UsersRepository users;
    @Test void sendsOneRealTestCardOnlyToHung() throws Exception {
        var user=users.findByUsername("Hung452005");assertNotNull(user);
        String customPhoto=System.getenv("ROMANTIC_TEST_PHOTO");
        Path photo=Path.of(customPhoto==null?"src/main/resources/static/assets/img/drinks/matcha-latte-photo.png":customPhoto);
        String mime=photo.toString().toLowerCase().endsWith(".png")?"image/png":"image/jpeg";
        String image="data:"+mime+";base64,"+Base64.getEncoder().encodeToString(Files.readAllBytes(photo));
        var sample=RomanticCardFixtures.card(image);
        var test=new RomanticCardRequest(UUID.fromString(System.getenv().getOrDefault("ROMANTIC_TEST_REQUEST_ID","cfbb0d25-c193-46fa-872b-65c8d3268004")),sample.title(),sample.greeting(),
                "Đây là bản kiểm tra giao diện và gửi thiệp email dành cho Hùng. Ngày giờ, kế hoạch và ảnh bên dưới chỉ là ví dụ kiểm thử, không phải lịch hẹn thật.\n\n"+sample.message(),
                LocalDate.of(2026,10,25),sample.time(),sample.restaurant(),sample.outing(),sample.plans(),sample.closing(),sample.signature(),sample.theme(),sample.imageData());
        Files.writeString(Path.of("/tmp/fnb-romantic-live-test-preview.html"),template.render(test,false));
        String receipt=service.send(test,user.getUserId(),true);assertFalse(receipt.isBlank());
        Files.writeString(Path.of("/tmp/fnb-romantic-test-receipt.txt"),receipt);
        System.out.println("Real test card accepted for hungmk2005@gmail.com; no email sent to Chi.");
    }
}
