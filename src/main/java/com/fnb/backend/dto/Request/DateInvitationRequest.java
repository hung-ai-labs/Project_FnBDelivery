package com.fnb.backend.dto.Request;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record DateInvitationRequest(UUID requestId, String ticketId, Integer reward,
                                    LocalDate date, LocalTime time, String restaurant,
                                    String outing, String note) {}
