package com.fnb.backend.controller;
import com.fnb.backend.service.HanoiDiscoveryService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/hanoi-wheel")
public class HanoiDiscoveryController {
    private final HanoiDiscoveryService service;
    public HanoiDiscoveryController(HanoiDiscoveryService service){this.service=service;}
    @GetMapping("/choices") public Object choices(){return service.choices();}
    @PostMapping("/recommend") public ResponseEntity<?> recommend(@RequestBody HanoiDiscoveryService.Query query,HttpServletRequest request){
        var session=request.getSession();
        synchronized(session){Object last=session.getAttribute("hanoiSearchAt");long now=Instant.now().getEpochSecond();if(last instanceof Long time&&now-time<8)return ResponseEntity.status(429).body(Map.of("message","Chờ 8 giây giữa hai lần tìm nhé."));session.setAttribute("hanoiSearchAt",now);}
        try{return ResponseEntity.ok(service.recommend(query));}
        catch(IllegalArgumentException e){return ResponseEntity.badRequest().body(Map.of("message",e.getMessage()));}
        catch(InterruptedException e){Thread.currentThread().interrupt();return failed();}
        catch(IOException e){return failed();}
    }
    private ResponseEntity<?> failed(){return ResponseEntity.status(503).body(Map.of("message","Chưa tìm được gợi ý có nguồn từ Gemini. Có thể Google Search chưa khả dụng hoặc Gemini hết hạn mức. Em thử lại hoặc mở tìm kiếm Google bên dưới nhé."));}
}
