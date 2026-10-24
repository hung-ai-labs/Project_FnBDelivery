package com.fnb.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.support.PropertySourcesPlaceholderConfigurer;
import java.io.IOException;
import static org.junit.jupiter.api.Assertions.*;

class OptionalLegacyMailConfigTest {
    @Test void missingLegacyCredentialsDoNotPreventMailBeansStarting() {
        try(var context=new AnnotationConfigApplicationContext()) {
            // No .env, system environment or system properties: model a Gmail-only deployment.
            context.getEnvironment().getPropertySources().remove("systemEnvironment");
            context.getEnvironment().getPropertySources().remove("systemProperties");
            context.registerBean(PropertySourcesPlaceholderConfigurer.class,() -> new PropertySourcesPlaceholderConfigurer());
            context.registerBean(ObjectMapper.class,() -> new ObjectMapper());
            context.register(MailService.class,DateInvitationMailer.class);
            assertDoesNotThrow(context::refresh);
            assertNotNull(context.getBean(MailService.class));
            var mailer=context.getBean(DateInvitationMailer.class);
            assertThrows(IOException.class,()->mailer.send("Must not send over the network","missing-config-test"));
        }
    }
}
