package com.fnb.backend.service;

import com.fnb.backend.dto.Request.RomanticCardRequest;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;

@Component
public class RomanticCardTemplate {
    public record Photo(String content, String mime, String filename) {}
    public record Palette(String accent, String soft, String canvas) {}
    public Palette palette(String theme) {
        return switch (theme == null ? "rose" : theme) {
            case "rose" -> new Palette("#9c3657", "#f8e4eb", "#fff7f3");
            case "lavender" -> new Palette("#70568d", "#ece4f5", "#fcf9ff");
            case "peach" -> new Palette("#b45c48", "#fbe3d6", "#fff9f2");
            default -> throw new IllegalArgumentException("Màu thiệp không hợp lệ.");
        };
    }
    public void validate(RomanticCardRequest r, boolean sending) {
        if (r == null) throw new IllegalArgumentException("Chưa có nội dung thiệp.");
        palette(r.theme());
        text(r.title(),100); text(r.greeting(),100); text(r.message(),2500);
        text(r.restaurant(),200); text(r.outing(),200); text(r.closing(),1000); text(r.signature(),100);
        List<RomanticCardRequest.Plan> plans = r.plans() == null ? List.of() : r.plans();
        if (plans.size()>8) throw new IllegalArgumentException("Một thiệp có tối đa 8 mốc lịch trình.");
        var previous = r.time();
        for (var plan : plans) {
            if (plan == null) throw new IllegalArgumentException("Mốc lịch trình không hợp lệ.");
            text(plan.activity(),200); text(plan.place(),200);
            if (sending && (plan.time()==null || text(plan.activity(),200).isBlank()))
                throw new IllegalArgumentException("Mỗi mốc cần có giờ và hoạt động.");
            if (sending && previous!=null && plan.time().isBefore(previous))
                throw new IllegalArgumentException("Sắp xếp các mốc sau giờ gặp, theo thứ tự thời gian trong ngày nhé.");
            if (plan.time()!=null) previous=plan.time();
        }
        photo(r.imageData());
        if (sending) {
            if (r.requestId()==null || r.date()==null || r.time()==null || text(r.title(),100).isBlank()
                    || text(r.message(),2500).isBlank() || plans.isEmpty())
                throw new IllegalArgumentException("Điền tiêu đề, lời mời, ngày giờ và ít nhất một mốc lịch trình nhé.");
            if (LocalDateTime.of(r.date(),r.time()).isBefore(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).withSecond(0).withNano(0)))
                throw new IllegalArgumentException("Chọn ngày giờ từ hiện tại trở đi nhé.");
            if (text(r.restaurant(),200).isBlank() && text(r.outing(),200).isBlank())
                throw new IllegalArgumentException("Chọn ít nhất một địa điểm đi ăn hoặc đi chơi nhé.");
        }
    }
    public Photo photo(String data) {
        if (data == null || data.isBlank()) return null;
        if (data.length()>4_200_000) throw new IllegalArgumentException("Ảnh tối đa 3 MB.");
        String mime;
        if (data.startsWith("data:image/jpeg;base64,")) mime="image/jpeg";
        else if (data.startsWith("data:image/png;base64,")) mime="image/png";
        else throw new IllegalArgumentException("Chọn ảnh JPG hoặc PNG nhé.");
        String encoded=data.substring(data.indexOf(',')+1);
        byte[] bytes;
        try { bytes=Base64.getDecoder().decode(encoded); }
        catch (IllegalArgumentException e) { throw new IllegalArgumentException("Dữ liệu ảnh không hợp lệ."); }
        if (bytes.length>3*1024*1024 || bytes.length<8) throw new IllegalArgumentException("Ảnh không hợp lệ hoặc lớn hơn 3 MB.");
        boolean png=bytes[0]==(byte)137 && bytes[1]==80 && bytes[2]==78 && bytes[3]==71 && bytes[4]==13 && bytes[5]==10 && bytes[6]==26 && bytes[7]==10;
        boolean jpg=bytes[0]==(byte)255 && bytes[1]==(byte)216 && bytes[2]==(byte)255;
        if ((mime.equals("image/png") && !png) || (mime.equals("image/jpeg") && !jpg))
            throw new IllegalArgumentException("Nội dung ảnh không khớp định dạng JPG/PNG.");
        return new Photo(encoded,mime,"hen-ho."+(png?"png":"jpg"));
    }
    public String text(String value, int max) {
        String text=value==null?"":value.strip();
        if (text.length()>max) throw new IllegalArgumentException("Nội dung thiệp vượt quá giới hạn cho phép.");
        return text;
    }
    public static String escape(String value) {
        return (value==null?"":value).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;").replace("'","&#39;");
    }
    private String prose(String value) { return escape(value).replace("\n","<br>"); }
    public String render(RomanticCardRequest r, boolean email) {
        var p=palette(r.theme());
        String date=r.date()==null?"Một ngày thật đẹp":r.date().format(DateTimeFormatter.ofPattern("dd.MM.yyyy"));
        String time=r.time()==null?"Giờ của hai đứa":r.time().format(DateTimeFormatter.ofPattern("HH:mm"))+" · giờ Việt Nam";
        StringBuilder h=new StringBuilder("<!doctype html><html lang=\"vi\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Thiệp hẹn hò</title></head>");
        h.append("<body style=\"margin:0;padding:0;background:").append(p.canvas()).append(";color:#482b38;font-family:Arial,sans-serif\"><table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\"><tr><td align=\"center\" style=\"padding:32px 12px\"><table role=\"presentation\" width=\"600\" cellspacing=\"0\" cellpadding=\"0\" style=\"width:100%;max-width:600px;background:#ffffff;border:1px solid ").append(p.soft()).append(";border-radius:24px;overflow:hidden\">");
        h.append("<tr><td align=\"center\" style=\"padding:38px 28px 30px;background:").append(p.soft()).append(";border-radius:24px 24px 0 0;color:").append(p.accent()).append("\"><div style=\"font-size:42px;line-height:1.2\">♡ &nbsp; ♥ &nbsp; ♡</div><p style=\"font-size:10px;letter-spacing:3px;font-weight:bold;margin:20px 0 12px\">MỘT LỜI MỜI · DÀNH RIÊNG CHO EM</p><h1 style=\"font:normal 34px/1.25 Georgia,serif;margin:0\">").append(escape(r.title()==null||r.title().isBlank()?"Anh muốn hẹn hò cùng em":r.title())).append("</h1></td></tr>");
        if (photo(r.imageData())!=null) h.append("<tr><td style=\"padding:24px 28px 0\"><img alt=\"Kỷ niệm của hai đứa\" width=\"544\" src=\"").append(email?"cid:romantic-card-photo":r.imageData()).append("\" style=\"display:block;width:100%;max-width:544px;height:auto;border-radius:16px\"></td></tr>");
        h.append("<tr><td style=\"padding:28px\"><p style=\"font:normal 24px/1.4 Georgia,serif;color:").append(p.accent()).append(";margin:0 0 14px\">").append(escape(r.greeting())).append("</p><div style=\"font-size:15px;line-height:1.9\">").append(prose(r.message())).append("</div>");
        h.append("<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"margin:26px 0;background:").append(p.canvas()).append(";border-radius:16px\"><tr><td align=\"center\" style=\"padding:22px\"><p style=\"font-size:10px;letter-spacing:2px;color:").append(p.accent()).append(";margin:0 0 8px\">GIỮ CHO ANH MỘT KHOẢNG THỜI GIAN</p><p style=\"font:normal 30px Georgia,serif;margin:0 0 8px\">").append(date).append("</p><p style=\"margin:0;font-size:14px\">").append(time).append("</p></td></tr></table>");
        if (r.restaurant()!=null&&!r.restaurant().isBlank()) h.append("<p style=\"line-height:1.8;font-size:14px\"><strong style=\"color:").append(p.accent()).append("\">Mình đi ăn</strong><br>").append(escape(r.restaurant())).append("</p>");
        if (r.outing()!=null&&!r.outing().isBlank()) h.append("<p style=\"line-height:1.8;font-size:14px\"><strong style=\"color:").append(p.accent()).append("\">Rồi mình đi chơi</strong><br>").append(escape(r.outing())).append("</p>");
        var plans=r.plans()==null?List.<RomanticCardRequest.Plan>of():r.plans();
        if (!plans.isEmpty()) {
            h.append("<h2 style=\"font:normal 25px Georgia,serif;color:").append(p.accent()).append(";margin:28px 0 18px\">Một chút kế hoạch của anh</h2><table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\">");
            for (var plan:plans) h.append("<tr><td valign=\"top\" width=\"70\" style=\"padding:12px 12px 12px 0;color:").append(p.accent()).append(";font-size:14px;font-weight:bold;border-top:1px solid ").append(p.soft()).append("\">").append(plan.time()==null?"♡":plan.time().format(DateTimeFormatter.ofPattern("HH:mm"))).append("</td><td style=\"padding:12px 0;line-height:1.7;font-size:14px;border-top:1px solid ").append(p.soft()).append("\"><strong>").append(escape(plan.activity())).append("</strong><br><span style=\"color:#8c7580\">").append(escape(plan.place())).append("</span></td></tr>");
            h.append("</table>");
        }
        h.append("<p style=\"font-size:15px;line-height:1.9;margin:28px 0 18px\">").append(prose(r.closing())).append("</p><p style=\"font:italic 24px Georgia,serif;color:").append(p.accent()).append(";margin:0\">").append(escape(r.signature())).append(" ♡</p></td></tr><tr><td align=\"center\" style=\"padding:22px;background:").append(p.soft()).append(";border-radius:0 0 24px 24px;font-size:11px;letter-spacing:1px;color:").append(p.accent()).append("\">CHÌ &amp; HUNG &nbsp; ♥ &nbsp; TỪ 22.07.2024</td></tr></table></td></tr></table></body></html>");
        return h.toString();
    }
    public String plain(RomanticCardRequest r) {
        StringBuilder b=new StringBuilder().append(r.title()).append("\n\n").append(r.greeting()).append("\n").append(r.message()).append("\n\nNgày: ").append(r.date()).append(" lúc ").append(r.time()).append(" (giờ Việt Nam)\nĐi ăn: ").append(r.restaurant()).append("\nĐi chơi: ").append(r.outing()).append("\n");
        for(var plan:r.plans()) b.append(plan.time()).append(" — ").append(plan.activity()).append(" — ").append(plan.place()).append("\n");
        return b.append("\n").append(r.closing()).append("\n").append(r.signature()).toString();
    }
}
