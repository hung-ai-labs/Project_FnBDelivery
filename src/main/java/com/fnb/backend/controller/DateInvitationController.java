package com.fnb.backend.controller;

import com.fnb.backend.dto.Request.DateInvitationRequest;
import com.fnb.backend.dto.Response.ApiResponse;
import com.fnb.backend.dto.UserSessionDTO;
import com.fnb.backend.service.DateInvitationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/date-invitations")
public class DateInvitationController {
    private final DateInvitationService service;
    public DateInvitationController(DateInvitationService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<ApiResponse> invite(@RequestBody DateInvitationRequest invitation, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        Long userId = session == null ? null : (Long) session.getAttribute("UserID");
        if (userId == null) return result(401, false, "Em đăng nhập rồi gửi lời hẹn nhé. Thông tin em nhập vẫn ở đây.");
        UserSessionDTO user = (UserSessionDTO) session.getAttribute("user");
        try {
            service.invite(userId, user == null ? "Công chúa" : user.getUser_name(), invitation);
            return result(200, true, "Lời hẹn đã được gửi tới email của anh. Mình cùng chờ buổi hẹn nhé! ♡");
        } catch (IllegalArgumentException e) {
            return result(400, false, e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return result(503, false, "Chưa gửi được email. Em giữ thông tin và thử lại nhé.");
        } catch (IOException e) {
            return result(503, false, "Chưa gửi được email. Em giữ thông tin và thử lại nhé.");
        }
    }

    private ResponseEntity<ApiResponse> result(int status, boolean success, String message) {
        return ResponseEntity.status(status).body(new ApiResponse(success, message));
    }
}
