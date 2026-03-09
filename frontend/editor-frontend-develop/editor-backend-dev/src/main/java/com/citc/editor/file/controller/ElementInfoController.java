package com.citc.editor.file.controller;

import com.citc.editor.common.R;
import com.citc.editor.common.exceptions.BadRequestException;
import com.citc.editor.file.dto.ElementInfoDto;
import com.citc.editor.file.service.ElementInfoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.AllArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;


/**
 * 图元信息表 接口
 *
 * @author yjd
 * @date 2025-04-07 16:02:58
 */
@AllArgsConstructor
@RestController
@RequestMapping("/Element")
public class ElementInfoController {

    @Autowired
    private ElementInfoService elementInfoService;

    /**
     * 创建图元
     * @param elementInfoDto 图元信息
     * @return 图元实体
     */
    @PostMapping("/createElement")
    public R createElement(@RequestBody ElementInfoDto elementInfoDto) throws BadRequestException {
        return R.ok(elementInfoService.createElement(elementInfoDto));
    }

    /**
     * 删除图元
     * @param id 图元ID
     */
    @GetMapping("/deleteElement/{id}")
    public R deleteElement(@PathVariable Long id) throws BadRequestException, IOException {
        elementInfoService.deleteElement(id);
        return R.ok();
    }

    /**
     * 更新图元
     * @param elementInfoDto 图元信息
     */
    @PostMapping("/updateElement")
    public R updateElement(@RequestBody ElementInfoDto elementInfoDto) throws BadRequestException {
        elementInfoService.updateElement(elementInfoDto);
        return R.ok();
    }

    /**
     * 获取图元详情
     * @param id 图元ID
     * @return 图元信息
     */
    @GetMapping("/getElement/{id}")
    public R getElement(@PathVariable Long id) throws BadRequestException {
        return R.ok(elementInfoService.getElement(id));
    }

    /**
     * 获取图元列表
     * @param contains 是否包含已经删除的设备:0 不包含，1包含
     * @return 图元列表
     */
    @GetMapping("/elementList")
    public R getElementList(@RequestParam("contains") String contains) throws BadRequestException {
        return R.ok(elementInfoService.getElementList(contains));
    }

    /**
     * 上传图片
     * @param file
     * @return
     * @throws IOException
     */
    @PostMapping("/uploadPicture")
    public R uploadPicture(@RequestParam("file") MultipartFile file) throws IOException, BadRequestException {
        return elementInfoService.uploadPicture(file);
    }

    /**
     * 获取设备类型获取图元信息
     * @param deviceType 图元类型
     * @return 图元信息
     */
    @GetMapping("/getElementByDeviceType")
    public R getElementByDeviceType(@RequestParam("deviceType") String deviceType) throws BadRequestException {
        return R.ok(elementInfoService.getElementByDeviceType(deviceType));
    }

    /**
     * 根据设备型号获取图元信息
     * @param deviceModel 设备型号
     * @return 图元信息
     */
    @GetMapping("/getElementByDeviceModel")
    public R getElementByDeviceModel(@RequestParam("deviceModel") String deviceModel) throws BadRequestException {
        return R.ok(elementInfoService.getElementByDeviceModel(deviceModel));
    }

    /**
     * 获取图片并在浏览器中查看
     * @param elementId
     * @return
     */
    @GetMapping("/images/{elementId}")
    public ResponseEntity<Resource> viewImage(@PathVariable ("elementId") String elementId) throws BadRequestException {
        return elementInfoService.viewImage(elementId);

    }

}