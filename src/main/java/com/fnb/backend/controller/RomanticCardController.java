package com.fnb.backend.controller;

import com.fnb.backend.dto.Request.RomanticCardRequest;
import com.fnb.backend.dto.Response.ApiResponse;
import com.fnb.backend.service.RomanticCardService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/romantic-cards")
public class RomanticCardController {
    private final RomanticCardService service;
    public RomanticCardController(RomanticCardService service) { this.service=service; }
    private Long owner(HttpServletRequest request) {
        var session=request.getSession(false);
        Long id=session==null?null:(Long)session.getAttribute("UserID");
        service.requireOwner(id);return id;
    }
    @GetMapping("/settings") public Map<String,Object> settings(HttpServletRequest request) { owner(request);return service.settings(); }
    @PostMapping(value="/preview",produces=MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> preview(@RequestBody RomanticCardRequest card,HttpServletRequest request) {
        owner(request);return ResponseEntity.ok().header("Cache-Control","no-store").body(service.preview(card));
    }
    @PostMapping("/test") public ResponseEntity<ApiResponse> test(@RequestBody RomanticCardRequest card,HttpServletRequest request) { return send(card,request,true); }
    @PostMapping("/send") public ResponseEntity<ApiResponse> live(@RequestBody RomanticCardRequest card,HttpServletRequest request) { return send(card,request,false); }
    private ResponseEntity<ApiResponse> send(RomanticCardRequest card,HttpServletRequest request,boolean test) {
        Long id=owner(request);
        try {
            service.send(card,id,test);
            return ResponseEntity.ok(new ApiResponse(true,test?"Đã gửi thiệp thử tới hungmk2005@gmail.com.":"Đã gửi thiệp hẹn hò cho Chi. ♡"));
        } catch(IllegalArgumentException e) {return ResponseEntity.badRequest().body(new ApiResponse(false,e.getMessage()));}
        catch(InterruptedException e) {Thread.currentThread().interrupt();return failed();}
        catch(IOException e) {return failed();}
    }
    private ResponseEntity<ApiResponse> failed() {return ResponseEntity.status(503).body(new ApiResponse(false,"Chưa xác nhận gửi được email. Với Gmail, kiểm tra thư Đã gửi và kết nối Gmail trước khi thử lại để tránh gửi trùng."));}
    @ExceptionHandler(IllegalArgumentException.class) public ResponseEntity<ApiResponse> invalid(IllegalArgumentException e) { return ResponseEntity.badRequest().body(new ApiResponse(false,e.getMessage())); }
}
