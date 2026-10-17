package com.fnb.backend.controller;

import com.fnb.backend.dto.Request.DateInvitationRequest;
import com.fnb.backend.service.DateInvitationService;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.io.IOException;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class DateInvitationControllerTest {
    private final DateInvitationService service = mock(DateInvitationService.class);
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new DateInvitationController(service)).build();
    private final String body = """
            {"requestId":"a316835c-52eb-4844-9846-36b51442fab8","ticketId":"ticket-1","reward":1,
             "date":"2099-10-20","time":"18:30","restaurant":"Quán A","outing":"Đi dạo","note":""}
            """;

    @Test void requiresLoginWithoutSendingEmail() throws Exception {
        mvc.perform(post("/api/date-invitations").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.success").value(false));
        verifyNoInteractions(service);
    }
    @Test void successRequiresMailServiceToFinishSuccessfully() throws Exception {
        mvc.perform(post("/api/date-invitations").sessionAttr("UserID",7L)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
        doThrow(new IOException("provider failed")).when(service).invite(eq(7L),anyString(),any(DateInvitationRequest.class));
        mvc.perform(post("/api/date-invitations").sessionAttr("UserID",7L)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.success").value(false));
    }
}
