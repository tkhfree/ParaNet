package com.citc.editor.file.controller;

import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;

@Slf4j
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @Order(2)
    void list() throws Exception {
        ResultActions resultActions = mockMvc.perform(MockMvcRequestBuilders.get("/api/assets/assets"))
                .andExpect(MockMvcResultMatchers.status().isOk());
        log.info("{}", resultActions.andReturn().getResponse().getContentAsString());

    }

    @Test
    void createOne() {
        log.info("createOne");
    }

    @Test
    void delete() {
        log.info("delete");
    }

    @Test
    void detail() {
        log.info("detail");
    }

    @Test
    void update() {
        log.info("update");
    }
}
