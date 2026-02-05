package com.citc.editor.file.mapper;

import com.citc.editor.file.entity.FileEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface FileMapper {
    void insert(@Param("file") FileEntity fileMetadata);

    List<FileEntity> findByProjectId(@Param("projectId") Long projectId);

    FileEntity findById(@Param("id") Long id);

    void deleteById(@Param("id") Long id);

    void update(@Param("file") FileEntity fileMetadata);

    List<FileEntity> findByParentId(@Param("parentId") Long parentId);

    FileEntity findByNameAndProjectId(@Param("fileName") String fileName, @Param("projectId") Long projectId);

    FileEntity findByNameAndParentId(@Param("fileName") String fileName, @Param("parentId") Long parentId, @Param("projectId") Long projectId, @Param("isFolder") int isFolder);

    FileEntity findFileByNameAndParentId(@Param("fileName") String fileName, @Param("parentId") Long parentId, @Param("projectId") Long projectId, @Param("isFolder") int isFolder, @Param("fileType") int fileType);

    FileEntity findByNameAndProjectIdNewTime(@Param("fileName") String fileName, @Param("projectId") Long projectId);

    List<Long> selectFileIdsByProjectId(@Param("projectId") Long projectId);

    int getCountByProjectIdAndFileType(@Param("projectId") Long projectId, @Param("fileType") int fileType);

    List<FileEntity> getByProjectIdAndFileType(@Param("projectId") Long projectId, @Param("fileType") int fileType);

    void deleteByParentIdAndFileTypes(@Param("parentId") Long parentId, @Param("fileTypes") List<Integer> fileTypes);

    void insertList(@Param("fileEntityList") List<FileEntity> fileEntityList);

    int getCountByProjectIdAndFileName(@Param("projectId")Long projectId, @Param("fileName")String fileName);

    List<FileEntity> getByProjectIdAndFileTypeAndFileName(@Param("projectId") Long projectId, @Param("fileType") int fileType, @Param("fileName") String fileName);
}
