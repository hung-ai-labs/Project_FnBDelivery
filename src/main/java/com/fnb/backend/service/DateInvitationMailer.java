package com.fnb.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
public class DateInvitationMailer {
    private final ObjectMapper json;
    private final HttpClient client;
    private final URI endpoint;
    private final String apiKey;
    private final String recipient;

    @org.springframework.beans.factory.annotation.Autowired
    public DateInvitationMailer(ObjectMapper json, @Value("${RESEND_API_KEY}") String apiKey,
                                @Value("${USERNAME_EMAIL}") String recipient) {
        this(json, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build(),
                URI.create("https://api.resend.com/emails"), apiKey, recipient);
    }

    DateInvitationMailer(ObjectMapper json, HttpClient client, URI endpoint, String apiKey, String recipient) {
        this.json = json;
        this.client = client;
        this.endpoint = endpoint;
        this.apiKey = apiKey;
        this.recipient = recipient;
    }

    public void send(String text, String idempotencyKey) throws IOException, InterruptedException {
        String body = json.writeValueAsString(Map.of(
                "from", "Tiệm bánh của Chì và Hung <onboarding@resend.dev>",
                "to", List.of(recipient), "subject", "Công chúa gửi anh một lời hẹn hò ♡", "text", text));
        HttpRequest request = HttpRequest.newBuilder(endpoint).timeout(Duration.ofSeconds(20))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .header("Idempotency-Key", idempotencyKey)
                .POST(HttpRequest.BodyPublishers.ofString(body)).build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IOException("Email provider did not accept the invitation");
        }
        var receipt = json.readTree(response.body());
        if (receipt == null || receipt.path("id").asText().isBlank()) {
            // Never expose provider responses or credentials to the browser.
            throw new IOException("Email provider did not accept the invitation");
        }
    }
}
