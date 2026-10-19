package com.fnb.backend.controller;

import com.fnb.backend.service.GmailCardMailer;
import com.fnb.backend.service.RomanticCardService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class GmailCardConnectionControllerTest {
    final GmailCardMailer gmail=mock(GmailCardMailer.class);
    final RomanticCardService cards=mock(RomanticCardService.class);
    final org.springframework.test.web.servlet.MockMvc mvc=MockMvcBuilders.standaloneSetup(new GmailCardConnectionController(gmail,cards)).build();
    @Test void rejectsNonOwnerBeforeStartingOauth() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED)).when(cards).requireOwner(null);
        mvc.perform(get("/api/romantic-cards/gmail/connect")).andExpect(status().isUnauthorized());verifyNoInteractions(gmail);
    }
    @Test void callbackRequiresMatchingSingleUseState() throws Exception {
        var session=new MockHttpSession();session.setAttribute("UserID",7L);
        when(gmail.authorizationUrl(anyString(),anyString())).thenReturn("https://accounts.google.com/oauth");
        mvc.perform(get("/api/romantic-cards/gmail/connect").session(session)).andExpect(status().isFound());
        var pending=(GmailCardConnectionController.Pending)session.getAttribute("GmailCardOAuth");
        mvc.perform(get("/api/romantic-cards/gmail/callback").session(session).param("state",pending.state()).param("code","code"))
            .andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"));
        verify(gmail).connect("code",pending.verifier());
        mvc.perform(get("/api/romantic-cards/gmail/callback").session(session).param("state",pending.state()).param("code","code"))
            .andExpect(status().isBadRequest());
        verify(gmail,times(1)).connect(anyString(),anyString());
    }
    @Test void invalidStateNeverExchangesCode() throws Exception {
        var session=new MockHttpSession();session.setAttribute("UserID",7L);
        when(gmail.authorizationUrl(anyString(),anyString())).thenReturn("https://accounts.google.com/oauth");
        mvc.perform(get("/api/romantic-cards/gmail/connect").session(session));
        mvc.perform(get("/api/romantic-cards/gmail/callback").session(session).param("state","wrong").param("code","sensitive-code"))
            .andExpect(status().isBadRequest());verify(gmail,never()).connect(anyString(),anyString());
    }
}
