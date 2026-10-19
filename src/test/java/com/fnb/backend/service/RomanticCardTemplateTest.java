package com.fnb.backend.service;
import com.fnb.backend.dto.Request.RomanticCardRequest;
import org.junit.jupiter.api.Test;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalTime;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class RomanticCardTemplateTest {
    private final RomanticCardTemplate template=new RomanticCardTemplate();
    @Test void senderNameSurvivesPropertiesEncoding() throws Exception {
        var properties = new java.util.Properties();
        try (var input = Files.newInputStream(Path.of("src/main/resources/application.properties"))) {
            properties.load(input);
        }
        assertEquals("${ROMANTIC_CARD_FROM:Tiệm bánh Chì và Hung <onboarding@resend.dev>}",
                properties.getProperty("app.romantic-card.from"));
    }
    @Test void createsPersonalizedEmailWithCompatibleTableLayoutAndEscapesText() throws Exception {
        var r=RomanticCardFixtures.card(null);
        template.validate(r,true);
        String html=template.render(r,true);
        assertTrue(html.contains("25.10.2099"));assertTrue(html.contains("18:30"));assertTrue(html.contains("Hùng của iem"));
        assertTrue(html.contains("<table"));assertTrue(html.contains("♥"));
        assertEquals("&lt;script&gt;&amp;&quot;&#39;",RomanticCardTemplate.escape("<script>&\"'"));
        assertThrows(IllegalArgumentException.class,()->template.palette("url(javascript:alert(1))"));
        Files.writeString(Path.of("/tmp/fnb-romantic-review.html"),template.render(r,false));
    }
    @Test void rejectsSvgInvalidImagesAndNonChronologicalPlans() {
        assertThrows(IllegalArgumentException.class,()->template.photo("data:image/svg+xml;base64,PHN2Zz4="));
        assertThrows(IllegalArgumentException.class,()->template.photo("data:image/png;base64,Zm9vYmFyYmF6"));
        var r=RomanticCardFixtures.card(null);
        var invalid=new RomanticCardRequest(r.requestId(),r.title(),r.greeting(),r.message(),r.date(),r.time(),r.restaurant(),r.outing(),List.of(new RomanticCardRequest.Plan(LocalTime.of(17,0),"Too early","")),r.closing(),r.signature(),r.theme(),null);
        assertThrows(IllegalArgumentException.class,()->template.validate(invalid,true));
    }
    @Test void embedsPhotoAsCidInEmailAndDataInPreview() throws Exception {
        String data="data:image/png;base64,"+java.util.Base64.getEncoder().encodeToString(Files.readAllBytes(Path.of("src/main/resources/static/assets/img/drinks/matcha-latte-photo.png")));
        var card=RomanticCardFixtures.card(data);template.validate(card,true);
        assertTrue(template.render(card,true).contains("src=\"cid:romantic-card-photo\""));
        assertFalse(template.render(card,true).contains("src=\"data:"));
        assertTrue(template.render(card,false).contains("src=\"data:image/png;base64,"));
    }
}
