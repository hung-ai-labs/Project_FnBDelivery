package com.fnb.backend.service;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.io.IOException;
import static org.junit.jupiter.api.Assertions.*;
class HanoiDiscoveryServiceTest {
    final ObjectMapper json=new ObjectMapper();
    @Test void hasBroadUniqueCatalogAndValidatesBeforeNetwork()throws Exception{
        var s=new HanoiDiscoveryService(json,"","gemini-2.5-flash");
        assertTrue(s.choices().stream().filter(x->x.mode().equals("eat")).count()>=150);
        assertTrue(s.choices().stream().filter(x->x.mode().equals("play")).count()>=100);
        assertEquals(s.choices().size(),s.choices().stream().map(HanoiDiscoveryService.Choice::id).distinct().count());
        assertThrows(IllegalArgumentException.class,()->s.recommend(new HanoiDiscoveryService.Query("invented","Toàn Hà Nội","Linh hoạt")));
        assertThrows(IllegalArgumentException.class,()->s.recommend(new HanoiDiscoveryService.Query("eat-1","injected","Linh hoạt")));
        assertThrows(IOException.class,()->s.recommend(new HanoiDiscoveryService.Query("eat-1","Toàn Hà Nội","Linh hoạt")));
    }
    @Test void refusesUngroundedAdviceAndFiltersUnsafeSourceUrls()throws Exception{
        assertThrows(IOException.class,()->HanoiDiscoveryService.parse(json.readTree("{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Unverified\"}]}}]}"),"Phở"));
        var root=json.readTree("""
            {"candidates":[{"content":{"parts":[{"text":"Gợi ý có nguồn"}]},"groundingMetadata":{"groundingChunks":[{"web":{"uri":"javascript:alert(1)","title":"bad"}},{"web":{"uri":"https://example.com/place","title":"Địa điểm"}}]}}]}
            """);
        var result=HanoiDiscoveryService.parse(root,"Phở");assertEquals(1,result.sources().size());assertEquals(2,result.sources().get(0).number());
        assertFalse(HanoiDiscoveryService.safeUrl("https://user:pass@example.com"));
    }
}
