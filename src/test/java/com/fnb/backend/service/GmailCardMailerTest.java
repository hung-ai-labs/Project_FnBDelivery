package com.fnb.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.Session;
import jakarta.mail.internet.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import java.io.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GmailCardMailerTest {
    final ObjectMapper json=new ObjectMapper();
    final JdbcTemplate db=mock(JdbcTemplate.class);
    final HttpClient http=mock(HttpClient.class);
    GmailCardMailer service(){return new GmailCardMailer(json,db,"client","secret","http://localhost:8080/api/romantic-cards/gmail/callback",Base64.getEncoder().encodeToString(new byte[32]),http);}
    HttpResponse<String> response(int status,String body){return new HttpResponse<>() {
        public int statusCode(){return status;} public String body(){return body;}
        public HttpRequest request(){return null;} public Optional<HttpResponse<String>> previousResponse(){return Optional.empty();}
        public HttpHeaders headers(){return HttpHeaders.of(Map.of(),(a,b)->true);} public URI uri(){return URI.create("https://example.test");}
        public HttpClient.Version version(){return HttpClient.Version.HTTP_1_1;}
        public Optional<javax.net.ssl.SSLSession> sslSession(){return Optional.empty();}
    };}
    Map<String,Object> payload(){return new LinkedHashMap<>(Map.of("to",List.of("Khanhchiinekk@gmail.com"),"subject","Hẹn em ♥","text","Hùng của iem","html","<p>Hùng của iem<img src=\"cid:photo\"></p>","attachments",List.of(Map.of("filename","photo.png","content",Base64.getEncoder().encodeToString(new byte[]{1,2,3}),"content_type","image/png","content_id","photo"))));}
    @Test void mimePreservesVietnameseAndInlineImage() throws Exception {
        String raw=GmailCardMailer.encodeMessage(payload());assertFalse(raw.contains("+"));
        var message=new MimeMessage(Session.getInstance(new Properties()),new ByteArrayInputStream(Base64.getUrlDecoder().decode(raw)));
        assertEquals("Hẹn em ♥",message.getSubject());assertEquals("Tiệm bánh Chì và Hung",((InternetAddress)message.getFrom()[0]).getPersonal());
        assertEquals("hungmk2005@gmail.com",((InternetAddress)message.getFrom()[0]).getAddress());
        assertEquals("Khanhchiinekk@gmail.com",message.getAllRecipients()[0].toString());
        var related=(MimeMultipart)message.getContent();assertEquals(2,related.getCount());
        assertEquals("<photo>",related.getBodyPart(1).getHeader("Content-ID")[0]);
        var alternative=(MimeMultipart)related.getBodyPart(0).getContent();assertEquals("Hùng của iem",alternative.getBodyPart(0).getContent());
        assertTrue(alternative.getBodyPart(1).getContent().toString().contains("cid:photo"));
    }
    @Test void authorizationUsesOfflinePkceAndOnlySendAndIdentityScopes(){
        var service=service();assertTrue(service.configured());String url=URLDecoder.decode(service.authorizationUrl("state","verifier"),StandardCharsets.UTF_8);
        assertTrue(url.contains("code_challenge_method=S256"));assertTrue(url.contains("access_type=offline"));assertTrue(url.contains(GmailCardMailer.SEND_SCOPE));assertFalse(url.contains("gmail.readonly"));assertFalse(url.contains("secret"));
    }
    @Test void cannotConnectAnotherGmailAndDoesNotStoreItsToken() throws Exception {
        when(http.send(any(HttpRequest.class),org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<String>>any()))
            .thenReturn(response(200,"{\"access_token\":\"access\",\"refresh_token\":\"private-refresh\",\"scope\":\""+GmailCardMailer.SEND_SCOPE+"\"}"),response(200,"{\"email\":\"other@gmail.com\",\"email_verified\":true}"));
        assertThrows(IllegalArgumentException.class,()->service().connect("code","verifier"));verifyNoInteractions(db);
    }
    @Test void ambiguousPreviousSendDoesNotSendAgain() throws Exception {
        when(db.queryForList("SELECT id FROM romantic_gmail_connection WHERE id=1")).thenReturn(List.of(Map.of("id",1)));
        var previous=new HashMap<String,Object>();
        previous.put("fingerprint",HexFormat.of().formatHex(GmailCardMailer.digest(json.writer().with(com.fasterxml.jackson.databind.SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS).writeValueAsString(payload()))));
        previous.put("receipt",null);
        when(db.queryForList("SELECT fingerprint,receipt FROM romantic_gmail_delivery WHERE request_key=?","uncertain")).thenReturn(List.of(previous));
        assertThrows(IOException.class,()->service().send(payload(),"uncertain"));verifyNoInteractions(http);
    }
    @Test void storesOnlyEncryptedRefreshTokenAndDeduplicatesSends() throws Exception {
        var service=service();
        when(http.send(any(HttpRequest.class),org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<String>>any()))
            .thenReturn(response(200,"{\"access_token\":\"access\",\"refresh_token\":\"private-refresh\",\"scope\":\""+GmailCardMailer.SEND_SCOPE+"\"}"),response(200,"{\"email\":\"hungmk2005@gmail.com\",\"email_verified\":true}"),response(200,"{\"access_token\":\"renewed-access\"}"),response(200,"{\"id\":\"gmail-receipt\"}"));
        var saved=org.mockito.ArgumentCaptor.forClass(String.class);
        service.connect("code","verifier");
        verify(db).update(startsWith("INSERT INTO romantic_gmail_connection"),saved.capture());assertFalse(saved.getValue().contains("private-refresh"));
        when(db.queryForList("SELECT id FROM romantic_gmail_connection WHERE id=1")).thenReturn(List.of(Map.of("id",1)));
        when(db.queryForObject("SELECT encrypted_token FROM romantic_gmail_connection WHERE id=1",String.class)).thenReturn(saved.getValue());
        when(db.queryForList("SELECT fingerprint,receipt FROM romantic_gmail_delivery WHERE request_key=?","request"))
            .thenReturn(List.of(),List.of(Map.of("fingerprint",HexFormat.of().formatHex(GmailCardMailer.digest(json.writer().with(com.fasterxml.jackson.databind.SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS).writeValueAsString(payload()))),"receipt","gmail-receipt")));
        when(db.update(startsWith("INSERT INTO romantic_gmail_delivery"),eq("request"),anyString())).thenReturn(1);
        assertEquals("gmail-receipt",service.send(payload(),"request"));assertEquals("gmail-receipt",service.send(payload(),"request"));
        verify(http,times(4)).send(any(HttpRequest.class),org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<String>>any());
    }
}
