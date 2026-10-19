package com.fnb.backend.service;
import com.fnb.backend.dto.Request.RomanticCardRequest;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

final class RomanticCardFixtures {
    static RomanticCardRequest card(String image) {
        return new RomanticCardRequest(UUID.fromString("a15782be-5342-4f8a-bf63-8be7760fe8cc"),
                "Anh muốn hẹn hò cùng em", "Khánh Chi ơi,",
                "Anh muốn dành một buổi thật trọn vẹn cho hai đứa. Mình cùng ăn một món ngon, đi dạo và kể nhau nghe những chuyện nhỏ trong ngày nhé.",
                LocalDate.of(2099,10,25),LocalTime.of(18,0),"Một quán nhỏ hai đứa cùng chọn","Một con đường mình cùng đi dạo",
                List.of(new RomanticCardRequest.Plan(LocalTime.of(18,30),"Mình cùng ăn tối","Quán ăn yêu thích"),new RomanticCardRequest.Plan(LocalTime.of(20,0),"Đi dạo và trò chuyện","Một góc bình yên")),
                "Không cần một dịp đặc biệt, chỉ cần là cùng em. Anh mong đến buổi hẹn của hai đứa.","Hùng của iem","rose",image);
    }
}
