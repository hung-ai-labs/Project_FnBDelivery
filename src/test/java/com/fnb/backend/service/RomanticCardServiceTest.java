package com.fnb.backend.service;
import com.fnb.backend.entity.Users;
import com.fnb.backend.repository.UsersRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RomanticCardServiceTest {
    private final UsersRepository users=mock(UsersRepository.class);
    private final DateInvitationMailer mailer=mock(DateInvitationMailer.class);
    private RomanticCardService service(String from){return new RomanticCardService(users,new RomanticCardTemplate(),mailer,"Khanhchiinekk@gmail.com",from);}
    private void user(String username,String role){var u=new Users();u.setUsername(username);u.setRole(role);when(users.findById(7L)).thenReturn(Optional.of(u));}
    @Test void limitsAccessToHungEvenWhenHisRoleIsUserAndRejectsOtherAdmins(){
        user("Hung452005","USER");service("x").requireOwner(7L);
        user("AnotherAdmin","ADMIN");assertThrows(ResponseStatusException.class,()->service("x").requireOwner(7L));
        assertThrows(ResponseStatusException.class,()->service("x").requireOwner(null));verifyNoInteractions(mailer);
    }
    @SuppressWarnings("unchecked") @Test void testGoesOnlyToHungAndLiveUsesConfiguredChiAddress() throws Exception {
        user("Hung452005","USER");var service=service("Chì và Hung <thiep@example.test>");
        when(mailer.sendPayload(anyMap(),anyString())).thenReturn("accepted");
        var card=RomanticCardFixtures.card(null);
        service.send(card,7L,true);service.send(card,7L,false);
        ArgumentCaptor<Map<String,Object>> payload=ArgumentCaptor.forClass(Map.class);
        verify(mailer,times(2)).sendPayload(payload.capture(),anyString());
        assertEquals(java.util.List.of("hungmk2005@gmail.com"),payload.getAllValues().get(0).get("to"));
        assertEquals(java.util.List.of("Khanhchiinekk@gmail.com"),payload.getAllValues().get(1).get("to"));
        assertTrue(payload.getValue().containsKey("html"));assertTrue(payload.getValue().containsKey("text"));
    }
    @Test void sandboxSenderCannotPretendToSendToChi() {
        user("Hung452005","USER");var service=service("Tiệm bánh <onboarding@resend.dev>");
        assertFalse(service.canSendLive());
        assertThrows(IllegalArgumentException.class,()->service.send(RomanticCardFixtures.card(null),7L,false));
        verifyNoInteractions(mailer);
    }
}
