package com.fnb.backend.service;

import com.fnb.backend.dto.Request.DateInvitationRequest;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Service
public class DateInvitationService {
    private static final String[] REWARDS = {"Một bữa anh nấu", "Hẹn hò món em thích", "Một cái ôm thật lâu"};
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private final DateInvitationMailer mailer;

    public DateInvitationService(DateInvitationMailer mailer) { this.mailer = mailer; }

    public void invite(Long userId, String name, DateInvitationRequest request) throws IOException, InterruptedException {
        if (request == null || request.requestId() == null || request.reward() == null
                || request.reward() < 0 || request.reward() >= REWARDS.length
                || request.date() == null || request.time() == null) {
            throw new IllegalArgumentException("Em chọn đầy đủ ngày, giờ và phiếu hẹn nhé.");
        }
        String ticket = field(request.ticketId(), 100);
        if (ticket.isBlank()) throw new IllegalArgumentException("Không tìm thấy mã phiếu hẹn.");
        LocalDateTime date = LocalDateTime.of(request.date(), request.time().withSecond(0).withNano(0));
        if (date.isBefore(LocalDateTime.now(VIETNAM).withSecond(0).withNano(0))) {
            throw new IllegalArgumentException("Em chọn ngày giờ từ hiện tại trở đi nhé.");
        }
        String restaurant = field(request.restaurant(), 200);
        String outing = field(request.outing(), 200);
        String note = field(request.note(), 1000);
        if (restaurant.isBlank() && outing.isBlank()) {
            throw new IllegalArgumentException("Em chọn ít nhất một nơi đi ăn hoặc đi chơi nhé.");
        }
        String text = "Công chúa muốn hẹn hò! ♡\n\n"
                + "Người gửi: " + name + "\n"
                + "Phiếu: " + REWARDS[request.reward()] + "\n"
                + "Mã phiếu: " + ticket + "\n"
                + "Ngày giờ: " + date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy 'lúc' HH:mm")) + " (giờ Việt Nam)\n"
                + "Đi ăn: " + (restaurant.isBlank() ? "Chưa chọn" : restaurant) + "\n"
                + "Đi chơi: " + (outing.isBlank() ? "Chưa chọn" : outing) + "\n"
                + "Lời nhắn: " + (note.isBlank() ? "Không có" : note) + "\n\n"
                + "Anh xem rồi cùng em chốt buổi hẹn nhé.";
        mailer.send(text, "date-invitation/" + userId + "/" + request.requestId());
    }

    private String field(String value, int maxLength) {
        String text = value == null ? "" : value.strip();
        if (text.length() > maxLength) throw new IllegalArgumentException("Nội dung hơi dài, em viết ngắn lại một chút nhé.");
        return text;
    }
}
