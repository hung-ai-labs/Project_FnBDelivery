package com.fnb.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DateInvitationMailerTest {
    @SuppressWarnings("unchecked")
    @Test void sendsWithIdempotencyAndRejectsProviderErrors() throws Exception {
        HttpClient client = mock(HttpClient.class);
        HttpResponse<String> response = mock(HttpResponse.class);
        doReturn(response).when(client).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn("{\"id\":\"email-accepted\"}");
        DateInvitationMailer mailer = new DateInvitationMailer(new ObjectMapper(),client,
                URI.create("https://api.resend.com/emails"),"fake-test-key","owner@example.test");
        mailer.send("Một lời hẹn", "date/7/test");
        ArgumentCaptor<HttpRequest> request = ArgumentCaptor.forClass(HttpRequest.class);
        verify(client).send(request.capture(),any(HttpResponse.BodyHandler.class));
        assertEquals("date/7/test",request.getValue().headers().firstValue("Idempotency-Key").orElseThrow());
        assertEquals("POST",request.getValue().method());
        when(response.statusCode()).thenReturn(503);
        assertThrows(IOException.class, () -> mailer.send("Một lời hẹn","date/7/test"));
        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn("{}");
        assertThrows(IOException.class, () -> mailer.send("Một lời hẹn","date/7/test"));
    }
}
