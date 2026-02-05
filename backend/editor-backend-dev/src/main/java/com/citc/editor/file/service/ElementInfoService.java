package com.citc.editor.file.service;


import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.citc.editor.common.R;
import com.citc.editor.common.exceptions.BadRequestException;
import com.citc.editor.file.dto.ElementInfoDto;
import com.citc.editor.file.entity.ElementInfoEntity;
import com.citc.editor.file.mapper.ElementInfoMapper;
import com.citc.editor.file.vo.ElementInfoVo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.ObjectUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ElementInfoService {

    @Autowired
    private ElementInfoMapper elementInfoMapper;

    @Autowired
    private FileStorageService fileStorageService;

    /**
     * 创建图元
     * @param elementInfoDto
     * @return
     * @throws BadRequestException
     */
    public ElementInfoEntity createElement(ElementInfoDto elementInfoDto) throws BadRequestException {
        //校验参数
        validateElement(elementInfoDto);
        //判断图元类型是否存在
        if (checkElementTypeExists(elementInfoDto.getDeviceType(), null)) {
            throw new BadRequestException("设备类型已存在");
        }
        //判断设备型号是否存在
        if (checkElementModelExists(elementInfoDto.getDeviceModel(), null)) {
            throw new BadRequestException("设备型号已存在");
        }
        ElementInfoEntity elementInfoEntity = new ElementInfoEntity();
        BeanUtils.copyProperties(elementInfoDto, elementInfoEntity);
        elementInfoMapper.insert(elementInfoEntity);
        return elementInfoEntity;
    }

    /**
     * 删除图元
     * @param id
     * @throws BadRequestException
     */
    @Transactional(rollbackFor = Exception.class)
    public void deleteElement(Long id) throws BadRequestException {
        ElementInfoEntity elementInfoEntity = getElementInfoEntity(id);
        //逻辑删除
        elementInfoEntity.setDeleteFlag(1);
        elementInfoMapper.updateById(elementInfoEntity);
        /*//删除图元图片
        try {
            fileStorageService.deleteFile(elementInfoEntity.getPicturePath());
        } catch (IOException e) {
            log.error("删除图元图片失败", e);
        }
        // 删除图元
        elementInfoMapper.deleteById(id);*/
    }

    /**
     * 更新图元
     * @param elementInfoDto
     * @throws BadRequestException
     */
    public void updateElement(ElementInfoDto elementInfoDto) throws BadRequestException {
        //校验参数
        validateElement(elementInfoDto);
        if (ObjectUtils.isEmpty(elementInfoDto.getId())) {
            throw new BadRequestException("设备id不能为空");
        }
        //判断图元类型是否存在
        if (checkElementTypeExists(elementInfoDto.getDeviceType(), elementInfoDto.getId())) {
            throw new BadRequestException("设备类型已存在");
        }
        //判断设备型号是否存在
        if (checkElementModelExists(elementInfoDto.getDeviceModel(), elementInfoDto.getId())) {
            throw new BadRequestException("设备型号已存在");
        }
        ElementInfoEntity elementInfoEntity = new ElementInfoEntity();
        BeanUtils.copyProperties(elementInfoDto, elementInfoEntity);
        elementInfoMapper.updateById(elementInfoEntity);
    }

    /**
     * 获取图元详情
     * @param id
     * @return
     * @throws BadRequestException
     */
    public ElementInfoVo getElement(Long id) throws BadRequestException {
        ElementInfoEntity elementInfoEntity = getElementInfoEntity(id);
        ElementInfoVo elementInfoVo = new ElementInfoVo();
        BeanUtils.copyProperties(elementInfoEntity, elementInfoVo);
        return elementInfoVo;
    }

    /**
     * 获取图元列表
     * @param contains 是否包含已经删除的设备:0 不包含，1包含
     * @return
     */
    public List<ElementInfoVo> getElementList(String contains) {

        LambdaQueryWrapper<ElementInfoEntity> queryWrapper = new LambdaQueryWrapper<>();
        if ("0".equals(contains)) {
            queryWrapper.eq(ElementInfoEntity::getDeleteFlag, 0);
        }
        List<ElementInfoEntity> elementInfoEntityList = elementInfoMapper.selectList(queryWrapper);
        if (CollectionUtils.isEmpty(elementInfoEntityList)) {
            return new ArrayList<>();
        }
        return elementInfoEntityList.stream().map(elementInfoEntity -> {
            ElementInfoVo elementInfoVo = new ElementInfoVo();
            BeanUtils.copyProperties(elementInfoEntity, elementInfoVo);
            return elementInfoVo;
        }).collect(Collectors.toList());
    }

    /**
     * 上传图片
     * @param file
     * @return
     * @throws IOException
     */
    public R uploadPicture(MultipartFile file) throws IOException, BadRequestException {
        return R.ok(fileStorageService.savePicture(file));
    }

    /**
     * 根据设备型号获取图元信息
     * @param deviceType
     * @return
     * @throws BadRequestException
     */
    public ElementInfoVo getElementByDeviceType(String deviceType) throws BadRequestException {
        if (ObjectUtils.isEmpty(deviceType)) {
            throw new BadRequestException("设备类型不能为空");
        }
        LambdaQueryWrapper<ElementInfoEntity> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(ElementInfoEntity::getDeviceType, deviceType);
        ElementInfoEntity elementInfoEntity = elementInfoMapper.selectOne(queryWrapper);
        if (ObjectUtils.isEmpty(elementInfoEntity)) {
            throw new BadRequestException("设备不存在");
        }
        ElementInfoVo elementInfoVo = new ElementInfoVo();
        BeanUtils.copyProperties(elementInfoEntity, elementInfoVo);
        return elementInfoVo;
    }

    /**
     * 根据设备类型获取图元信息
     * @param deviceModel
     * @return
     * @throws BadRequestException
     */
    public ElementInfoVo getElementByDeviceModel(String deviceModel) throws BadRequestException {
        if (ObjectUtils.isEmpty(deviceModel)) {
            throw new BadRequestException("设备型号不能为空");
        }
        LambdaQueryWrapper<ElementInfoEntity> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(ElementInfoEntity::getDeviceModel, deviceModel);
        ElementInfoEntity elementInfoEntity = elementInfoMapper.selectOne(queryWrapper);
        if (ObjectUtils.isEmpty(elementInfoEntity)) {
            throw new BadRequestException("设备不存在");
        }
        ElementInfoVo elementInfoVo = new ElementInfoVo();
        BeanUtils.copyProperties(elementInfoEntity, elementInfoVo);
        return elementInfoVo;
    }

    /**
     * 获取图片并在浏览器中查看
     * @param elementId
     * @return
     * @throws BadRequestException
     */
    public ResponseEntity<Resource> viewImage(String elementId) throws BadRequestException {
        if (ObjectUtils.isEmpty(elementId)) {
            throw new BadRequestException("图元id不能为空");
        }
        ElementInfoEntity elementInfoEntity = getElementInfoEntity(Long.valueOf(elementId));
        if (ObjectUtils.isEmpty(elementInfoEntity.getPicturePath())) {
            throw new BadRequestException("图元图片路径不存在");
        }
        try {
            Path path = Paths.get(elementInfoEntity.getPicturePath());
            Resource resource = new UrlResource(path.toUri());

            if (resource.exists() && resource.isReadable()) {
                // 返回图片资源，浏览器可以直接显示
                return ResponseEntity.ok()
                        .header("Content-Type", Files.probeContentType(path)) // 自动识别图片类型
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(null);
        }
    }


    //校验参数
    private void validateElement(ElementInfoDto elementInfoDto) throws BadRequestException {
        if (ObjectUtils.isEmpty(elementInfoDto)) {
            throw new BadRequestException("图元信息不能为空");
        }
        if (ObjectUtils.isEmpty(elementInfoDto.getDeviceType())) {
            throw new BadRequestException("设备类型不能为空");
        }
        if (ObjectUtils.isEmpty(elementInfoDto.getDeviceModel())) {
            throw new BadRequestException("设备型号不能为空");
        }
        if (ObjectUtils.isEmpty(elementInfoDto.getPictureName())) {
            throw new BadRequestException("图元图片名称不能为空");
        }
        if (ObjectUtils.isEmpty(elementInfoDto.getPicturePath())) {
            throw new BadRequestException("图元图片路径不能为空");
        }
    }

    //校验图元类型是否存在
    public boolean checkElementTypeExists(String name, Long excludeId) {
        LambdaQueryWrapper<ElementInfoEntity> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(ElementInfoEntity::getDeviceType, name)
                .eq(ElementInfoEntity::getDeleteFlag, 0);
        if (excludeId != null) {
            queryWrapper.ne(ElementInfoEntity::getId, excludeId);
        }
        return elementInfoMapper.selectCount(queryWrapper) > 0;
    }

    //判断设备型号是否存在
    public boolean checkElementModelExists(String name, Long excludeId) {
        LambdaQueryWrapper<ElementInfoEntity> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(ElementInfoEntity::getDeviceModel, name)
                .eq(ElementInfoEntity::getDeleteFlag, 0);
        if (excludeId != null) {
            queryWrapper.ne(ElementInfoEntity::getId, excludeId);
        }
        return elementInfoMapper.selectCount(queryWrapper) > 0;
    }

    //获取图元
    private ElementInfoEntity getElementInfoEntity(Long id) throws BadRequestException {
        // 判断id是否存在
        if (id == null) {
            throw new BadRequestException("图元id不能为空");
        }
        ElementInfoEntity elementInfoEntity = elementInfoMapper.selectById(id);
        // 判断图元是否存在
        if (ObjectUtils.isEmpty(elementInfoEntity)) {
            throw new BadRequestException("图元不存在");
        }
        return elementInfoEntity;
    }
}
