package com.fnb.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.activation.DataHandler;
import jakarta.mail.Message;
import jakarta.mail.Session;
import jakarta.mail.internet.*;
import jakarta.mail.util.ByteArrayDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

/** Gmail's HTTPS API; credentials and raw messages never go to the browser or logs. */
@Service
public class GmailCardMailer {
    public static final String SEND_SCOPE="https://www.googleapis.com/auth/gmail.send";
    private final ObjectMapper json;
    private final JdbcTemplate db;
    private final HttpClient http;
    private final String clientId,clientSecret,redirectUri,tokenKey;
    private volatile boolean schemaReady;
    private static final String ACCOUNT="hungmk2005@gmail.com";
    @org.springframework.beans.factory.annotation.Autowired
    public GmailCardMailer(ObjectMapper json,JdbcTemplate db,
            @Value("${GMAIL_CLIENT_ID:}") String clientId,
            @Value("${GMAIL_CLIENT_SECRET:}") String clientSecret,
            @Value("${GMAIL_REDIRECT_URI:http://localhost:8080/api/romantic-cards/gmail/callback}") String redirectUri,
            @Value("${GMAIL_TOKEN_KEY:}") String tokenKey) {
        this(json,db,clientId,clientSecret,redirectUri,tokenKey,HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build());
    }
    GmailCardMailer(ObjectMapper json,JdbcTemplate db,String clientId,String clientSecret,String redirectUri,String tokenKey,HttpClient http){
        this.json=json;this.db=db;this.clientId=clientId;this.clientSecret=clientSecret;this.redirectUri=redirectUri;this.tokenKey=tokenKey;this.http=http;
    }
    public boolean configured(){
        try{return !clientId.isBlank()&&!clientSecret.isBlank()&&Base64.getDecoder().decode(tokenKey).length==32;}
        catch(IllegalArgumentException e){return false;}
    }
    private synchronized void schema(){
        if(schemaReady)return;
        db.execute("CREATE TABLE IF NOT EXISTS romantic_gmail_connection (id INTEGER PRIMARY KEY, encrypted_token TEXT NOT NULL)");
        db.execute("CREATE TABLE IF NOT EXISTS romantic_gmail_delivery (request_key VARCHAR(200) PRIMARY KEY, fingerprint VARCHAR(64) NOT NULL, receipt TEXT)");
        schemaReady=true;
    }
    public boolean connected(){if(!configured())return false;schema();return !db.queryForList("SELECT id FROM romantic_gmail_connection WHERE id=1").isEmpty();}
    public String authorizationUrl(String state,String verifier){
        if(!configured())throw new IllegalArgumentException("Cần cấu hình Google OAuth trước khi kết nối Gmail. Xem docs/gmail-api.md.");
        return "https://accounts.google.com/o/oauth2/v2/auth?"+form(Map.of(
                "client_id",clientId,"redirect_uri",redirectUri,"response_type","code",
                "scope","openid email "+SEND_SCOPE,"state",state,"access_type","offline","prompt","consent",
                "code_challenge",Base64.getUrlEncoder().withoutPadding().encodeToString(digest(verifier)),"code_challenge_method","S256"));
    }
    public void connect(String code,String verifier) throws IOException,InterruptedException {
        if(!configured())throw new IllegalArgumentException("Google OAuth chưa được cấu hình.");
        JsonNode tokens=token(Map.of("code",code,"code_verifier",verifier,"grant_type","authorization_code","redirect_uri",redirectUri));
        String access=tokens.path("access_token").asText(),refresh=tokens.path("refresh_token").asText();
        if(access.isBlank()||refresh.isBlank()||!Arrays.asList(tokens.path("scope").asText().split(" ")).contains(SEND_SCOPE))throw new IOException("Google chưa cấp đủ quyền gửi thư. Kết nối lại và chọn quyền gửi Gmail.");
        var response=http.send(HttpRequest.newBuilder(URI.create("https://openidconnect.googleapis.com/v1/userinfo"))
                .timeout(Duration.ofSeconds(20)).header("Authorization","Bearer "+access).GET().build(),HttpResponse.BodyHandlers.ofString());
        if(response.statusCode()!=200)throw new IOException("Chưa xác minh được tài khoản Google.");
        var user=json.readTree(response.body());
        if(!user.path("email_verified").asBoolean()||!ACCOUNT.equalsIgnoreCase(user.path("email").asText()))throw new IllegalArgumentException("Hãy kết nối đúng Gmail hungmk2005@gmail.com.");
        schema();
        db.update("INSERT INTO romantic_gmail_connection(id,encrypted_token) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET encrypted_token=EXCLUDED.encrypted_token",encrypt(refresh));
    }
    private JsonNode token(Map<String,String> values) throws IOException,InterruptedException {
        Map<String,String> data=new HashMap<>(values);data.put("client_id",clientId);data.put("client_secret",clientSecret);
        var result=http.send(HttpRequest.newBuilder(URI.create("https://oauth2.googleapis.com/token")).timeout(Duration.ofSeconds(20))
                .header("Content-Type","application/x-www-form-urlencoded").POST(HttpRequest.BodyPublishers.ofString(form(data))).build(),HttpResponse.BodyHandlers.ofString());
        if(result.statusCode()!=200)throw new IOException("Không làm mới được quyền Gmail. Anh kết nối Gmail lại nhé.");
        return json.readTree(result.body());
    }
    public String send(Map<String,Object> payload,String requestKey) throws IOException,InterruptedException {
        if(!connected())throw new IllegalArgumentException("Anh kết nối Gmail trước khi gửi thiệp nhé.");
        String fingerprint=HexFormat.of().formatHex(digest(json.writer().with(com.fasterxml.jackson.databind.SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS).writeValueAsString(payload)));
        var previous=db.queryForList("SELECT fingerprint,receipt FROM romantic_gmail_delivery WHERE request_key=?",requestKey);
        if(!previous.isEmpty())return previous(previous.get(0),fingerprint);
        String encrypted=db.queryForObject("SELECT encrypted_token FROM romantic_gmail_connection WHERE id=1",String.class);
        String access=token(Map.of("grant_type","refresh_token","refresh_token",decrypt(encrypted))).path("access_token").asText();
        if(access.isBlank())throw new IOException("Google không cấp quyền gửi. Anh kết nối Gmail lại nhé.");
        String raw=encodeMessage(payload);
        int claimed=db.update("INSERT INTO romantic_gmail_delivery(request_key,fingerprint) VALUES(?,?) ON CONFLICT(request_key) DO NOTHING",requestKey,fingerprint);
        if(claimed==0)return previous(db.queryForMap("SELECT fingerprint,receipt FROM romantic_gmail_delivery WHERE request_key=?",requestKey),fingerprint);
        // Gmail has no idempotency header. Keep uncertain attempts in the ledger rather than sending twice.
        var response=http.send(HttpRequest.newBuilder(URI.create("https://gmail.googleapis.com/gmail/v1/users/me/messages/send"))
                .timeout(Duration.ofSeconds(20)).header("Authorization","Bearer "+access).header("Content-Type","application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(Map.of("raw",raw)))).build(),HttpResponse.BodyHandlers.ofString());
        if(response.statusCode()<200||response.statusCode()>=300){
            if(response.statusCode()>=400&&response.statusCode()<500)db.update("DELETE FROM romantic_gmail_delivery WHERE request_key=?",requestKey);
            throw new IOException("Gmail chưa xác nhận gửi được thiệp. Kiểm tra kết nối Gmail và thư Đã gửi trước khi thử lại.");
        }
        String receipt=json.readTree(response.body()).path("id").asText();
        if(receipt.isBlank())throw new IOException("Chưa có xác nhận từ Gmail. Kiểm tra thư Đã gửi trước khi tạo lần gửi mới.");
        db.update("UPDATE romantic_gmail_delivery SET receipt=? WHERE request_key=?",receipt,requestKey);return receipt;
    }
    private String previous(Map<String,Object> row,String fingerprint) throws IOException {
        if(!fingerprint.equals(row.get("fingerprint")))throw new IllegalArgumentException("Mã gửi này đã dùng cho nội dung khác. Tải lại trang rồi thử lại.");
        if(row.get("receipt") instanceof String receipt&&!receipt.isBlank())return receipt;
        throw new IOException("Lần gửi này đang chờ xác nhận. Kiểm tra thư Đã gửi trong Gmail để tránh gửi trùng.");
    }
    @SuppressWarnings("unchecked") static String encodeMessage(Map<String,Object> payload) throws IOException {
        try {
            MimeMessage message=new MimeMessage(Session.getInstance(new Properties()));
            message.setFrom(new InternetAddress(ACCOUNT,"Tiệm bánh Chì và Hung","UTF-8"));
            for(String recipient:(List<String>)payload.get("to"))message.addRecipient(Message.RecipientType.TO,new InternetAddress(recipient,true));
            message.setSubject((String)payload.get("subject"),"UTF-8");
            MimeMultipart alternative=new MimeMultipart("alternative");
            MimeBodyPart text=new MimeBodyPart();text.setText((String)payload.get("text"),"UTF-8");alternative.addBodyPart(text);
            MimeBodyPart html=new MimeBodyPart();html.setContent(payload.get("html"),"text/html; charset=UTF-8");alternative.addBodyPart(html);
            MimeBodyPart content=new MimeBodyPart();content.setContent(alternative);
            MimeMultipart related=new MimeMultipart("related");related.addBodyPart(content);
            for(var attachment:(List<Map<String,String>>)payload.getOrDefault("attachments",List.of())){
                MimeBodyPart image=new MimeBodyPart();image.setDataHandler(new DataHandler(new ByteArrayDataSource(Base64.getDecoder().decode(attachment.get("content")),attachment.get("content_type"))));
                image.setDisposition("inline");image.setFileName(attachment.get("filename"));image.setHeader("Content-ID","<"+attachment.get("content_id")+">");related.addBodyPart(image);
            }
            message.setContent(related);message.setSentDate(new Date());message.saveChanges();
            var bytes=new ByteArrayOutputStream();message.writeTo(bytes);return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes.toByteArray());
        } catch(jakarta.mail.MessagingException e){throw new IOException("Không tạo được thiệp email.",e);}
    }
    private String encrypt(String token) throws IOException {
        try{byte[] iv=new byte[12];new SecureRandom().nextBytes(iv);Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,new SecretKeySpec(Base64.getDecoder().decode(tokenKey),"AES"),new GCMParameterSpec(128,iv));byte[] data=cipher.doFinal(token.getBytes(StandardCharsets.UTF_8));var bytes=new ByteArrayOutputStream();bytes.write(iv);bytes.write(data);return Base64.getEncoder().encodeToString(bytes.toByteArray());}
        catch(GeneralSecurityException|IllegalArgumentException e){throw new IOException("Không lưu được kết nối Gmail.");}
    }
    private String decrypt(String encrypted) throws IOException {
        try{byte[] data=Base64.getDecoder().decode(encrypted);Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,new SecretKeySpec(Base64.getDecoder().decode(tokenKey),"AES"),new GCMParameterSpec(128,Arrays.copyOfRange(data,0,12)));return new String(cipher.doFinal(Arrays.copyOfRange(data,12,data.length)),StandardCharsets.UTF_8);}
        catch(GeneralSecurityException|IllegalArgumentException e){throw new IOException("Không đọc được kết nối Gmail. Kiểm tra GMAIL_TOKEN_KEY hoặc kết nối lại.");}
    }
    static byte[] digest(String text){try{return MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8));}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
    static String form(Map<String,String> values){return values.entrySet().stream().map(e->URLEncoder.encode(e.getKey(),StandardCharsets.UTF_8)+"="+URLEncoder.encode(e.getValue(),StandardCharsets.UTF_8)).collect(Collectors.joining("&"));}
}
