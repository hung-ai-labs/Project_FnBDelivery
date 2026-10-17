package com.fnb.backend.service;

import com.fnb.backend.dto.Request.DateInvitationRequest;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DateInvitationServiceTest {
    private final DateInvitationMailer mailer = mock(DateInvitationMailer.class);
    private final DateInvitationService service = new DateInvitationService(mailer);

    private DateInvitationRequest request(LocalDate date, String restaurant, String outing, Integer reward) {
        return new DateInvitationRequest(UUID.fromString("a316835c-52eb-4844-9846-36b51442fab8"), "ticket-1", reward,
                date, LocalTime.of(18,30), restaurant, outing, "Ít đông người nhé");
    }

    @Test void sendsChosenDatePlacesRewardAndStableUserScopedKey() throws Exception {
        service.invite(7L, "Khánh Chi", request(LocalDate.of(2099,10,20), " Quán A ", "Rạp B", 2));
        ArgumentCaptor<String> text = ArgumentCaptor.forClass(String.class);
        verify(mailer).send(text.capture(), eq("date-invitation/7/a316835c-52eb-4844-9846-36b51442fab8"));
        assertTrue(text.getValue().contains("20/10/2099 lúc 18:30 (giờ Việt Nam)"));
        assertTrue(text.getValue().contains("Đi ăn: Quán A"));
        assertTrue(text.getValue().contains("Đi chơi: Rạp B"));
        assertTrue(text.getValue().contains("Một cái ôm thật lâu"));
        assertTrue(text.getValue().contains("Khánh Chi"));
    }

    @Test void rejectsPastDatesMissingPlacesAndInvalidRewardsBeforeSending() {
        assertThrows(IllegalArgumentException.class, () -> service.invite(7L,"Chi",request(LocalDate.of(2000,1,1),"A","B",0)));
        assertThrows(IllegalArgumentException.class, () -> service.invite(7L,"Chi",request(LocalDate.of(2099,1,1)," ","",0)));
        assertThrows(IllegalArgumentException.class, () -> service.invite(7L,"Chi",request(LocalDate.of(2099,1,1),"A","B",99)));
        assertThrows(IllegalArgumentException.class, () -> service.invite(7L,"Chi",request(LocalDate.of(2099,1,1),"x".repeat(201),"B",0)));
        verifyNoInteractions(mailer);
    }

    @Test void permitsAnOutingWithoutARestaurant() throws Exception {
        service.invite(7L,"Chi",request(LocalDate.of(2099,1,1),null,"Đi dạo",1));
        verify(mailer).send(contains("Đi ăn: Chưa chọn"),anyString());
    }
}
