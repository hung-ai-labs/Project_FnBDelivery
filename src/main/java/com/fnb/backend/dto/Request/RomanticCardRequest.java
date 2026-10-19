package com.fnb.backend.dto.Request;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public record RomanticCardRequest(UUID requestId, String title, String greeting, String message,
                                  LocalDate date, LocalTime time, String restaurant, String outing,
                                  List<Plan> plans, String closing, String signature, String theme, String imageData) {
    public record Plan(LocalTime time, String activity, String place) {}
}
