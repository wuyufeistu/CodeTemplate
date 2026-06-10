import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { getExtraBuiltinTemplates } from '../languages/registry';

export interface BuiltinTemplate {
  language: string;
  type: string;
  templateName: string;
  description: string;
  templateContent: string;
  namingRules: string;
  commonImports: string;
  fileExtension: string;
}

export function getConnection(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function getReadonlyConnection(dbPath: string): Database.Database {
  return new Database(dbPath, { readonly: true });
}

function migrateSchema(db: Database.Database): void {
  // Check if language column exists in file_templates
  const columns = db.prepare("PRAGMA table_info('file_templates')").all() as any[];
  const hasLanguage = columns.some((c: any) => c.name === 'language');
  if (!hasLanguage) {
    db.exec("ALTER TABLE file_templates ADD COLUMN language TEXT NOT NULL DEFAULT 'java'");
  }
}

function getBuiltinTemplatesData(): BuiltinTemplate[] {
  return [
    // ======== Java ========
    {
      language: 'java', type: 'controller', templateName: 'RestController',
      description: 'Spring Boot REST Controller CRUD 模板。包含 @RestController, @RequestMapping, @Tag, @Slf4j, @RequiredArgsConstructor 注解，以及分页查询、创建、更新、删除、详情查询方法骨架。',
      templateContent: `package com.ctff.module.{module}.controller.admin.{entity_lower};

import com.ctff.framework.common.pojo.CommonResult;
import com.ctff.framework.common.pojo.PageResult;
import com.ctff.module.{module}.controller.admin.{entity_lower}.vo.{Entity}PageReqVO;
import com.ctff.module.{module}.controller.admin.{entity_lower}.vo.{Entity}RespVO;
import com.ctff.module.{module}.controller.admin.{entity_lower}.vo.{Entity}SaveReqVO;
import com.ctff.module.{module}.controller.admin.{entity_lower}.vo.{Entity}UpdateReqVO;
import com.ctff.module.{module}.service.{entity_lower}.{Entity}Service;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@Tag(name = "管理后台 - {entity_comment}")
@RestController
@RequestMapping("/{module}/{entity_kebab}")
@RequiredArgsConstructor
@Slf4j
public class {Entity}Controller {

    private final {Entity}Service {entityCamel}Service;

    @PostMapping("/page")
    @Operation(summary = "分页查询{entity_comment}")
    public CommonResult<PageResult<{Entity}RespVO>> page{Entity}(@RequestBody {Entity}PageReqVO reqVO) {
        PageResult<{Entity}RespVO> pageResult = {entityCamel}Service.page{Entity}(reqVO);
        return CommonResult.success(pageResult);
    }

    @PostMapping("/create")
    @Operation(summary = "创建{entity_comment}")
    public CommonResult<Long> create{Entity}(@Valid @RequestBody {Entity}SaveReqVO reqVO) {
        Long id = {entityCamel}Service.create{Entity}(reqVO);
        return CommonResult.success(id);
    }

    @PutMapping("/update")
    @Operation(summary = "更新{entity_comment}")
    public CommonResult<Boolean> update{Entity}(@Valid @RequestBody {Entity}UpdateReqVO reqVO) {
        {entityCamel}Service.update{Entity}(reqVO);
        return CommonResult.success(true);
    }

    @DeleteMapping("/delete/{id}")
    @Operation(summary = "删除{entity_comment}")
    public CommonResult<Boolean> delete{Entity}(@PathVariable("id") Long id) {
        {entityCamel}Service.delete{Entity}(id);
        return CommonResult.success(true);
    }

    @GetMapping("/get/{id}")
    @Operation(summary = "获取{entity_comment}详情")
    public CommonResult<{Entity}RespVO> get{Entity}(@PathVariable("id") Long id) {
        {Entity}RespVO respVO = {entityCamel}Service.get{Entity}(id);
        return CommonResult.success(respVO);
    }
}`,
      namingRules: JSON.stringify({ className: '{Entity}Controller', entityName: 'PascalCase', urlPath: 'kebab-case' }),
      commonImports: JSON.stringify(['com.ctff.framework.common.pojo.CommonResult', 'com.ctff.framework.common.pojo.PageResult', 'io.swagger.v3.oas.annotations.*', 'jakarta.validation.*', 'lombok.*']),
      fileExtension: '.java'
    },
    {
      language: 'java', type: 'service_impl', templateName: 'ServiceImpl',
      description: 'Spring Boot Service 实现模板。包含 @Service, @RequiredArgsConstructor 注解，以及 CRUD 方法实现，使用 MyBatis Plus LambdaQueryWrapperX。',
      templateContent: `package com.ctff.module.{module}.service.{entity_lower}.impl;

import com.ctff.framework.common.pojo.PageResult;
import com.ctff.framework.mybatis.core.query.LambdaQueryWrapperX;
import com.ctff.module.{module}.controller.admin.{entity_lower}.vo.{Entity}PageReqVO;
import com.ctff.module.{module}.controller.admin.{entity_lower}.vo.{Entity}RespVO;
import com.ctff.module.{module}.controller.admin.{entity_lower}.vo.{Entity}SaveReqVO;
import com.ctff.module.{module}.controller.admin.{entity_lower}.vo.{Entity}UpdateReqVO;
import com.ctff.module.{module}.dal.dataobject.{entity_lower}.{Entity}DO;
import com.ctff.module.{module}.dal.mysql.{entity_lower}.{Entity}Mapper;
import com.ctff.module.{module}.service.{entity_lower}.{Entity}Service;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class {Entity}ServiceImpl implements {Entity}Service {

    private final {Entity}Mapper {entityCamel}Mapper;

    @Override
    public PageResult<{Entity}RespVO> page{Entity}({Entity}PageReqVO reqVO) {
        return {entityCamel}Mapper.selectPage(reqVO, new LambdaQueryWrapperX<{Entity}DO>()
                .eqIfPresent({Entity}DO::getField, reqVO.getField())
                .orderByDesc({Entity}DO::getId));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long create{Entity}({Entity}SaveReqVO reqVO) {
        {Entity}DO entity = BeanUtils.toBean(reqVO, {Entity}DO.class);
        {entityCamel}Mapper.insert(entity);
        return entity.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void update{Entity}({Entity}UpdateReqVO reqVO) {
        {Entity}DO entity = {entityCamel}Mapper.selectById(reqVO.getId());
        BeanUtils.copyProperties(reqVO, entity);
        {entityCamel}Mapper.updateById(entity);
    }

    @Override
    public void delete{Entity}(Long id) {
        {entityCamel}Mapper.deleteById(id);
    }

    @Override
    public {Entity}RespVO get{Entity}(Long id) {
        {Entity}DO entity = {entityCamel}Mapper.selectById(id);
        return BeanUtils.toBean(entity, {Entity}RespVO.class);
    }
}`,
      namingRules: JSON.stringify({ className: '{Entity}ServiceImpl' }),
      commonImports: JSON.stringify(['com.ctff.framework.mybatis.core.query.LambdaQueryWrapperX', 'org.springframework.transaction.annotation.Transactional', 'com.ctff.framework.common.pojo.PageResult']),
      fileExtension: '.java'
    },
    {
      language: 'java', type: 'mapper', templateName: 'Mapper',
      description: 'MyBatis Plus Mapper 接口模板。继承 BaseMapperX，使用 MyBatis Plus 提供的内置 CRUD 方法。',
      templateContent: `package com.ctff.module.{module}.dal.mysql.{entity_lower};

import com.ctff.framework.mybatis.core.mapper.BaseMapperX;
import com.ctff.module.{module}.dal.dataobject.{entity_lower}.{Entity}DO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface {Entity}Mapper extends BaseMapperX<{Entity}DO> {
}`,
      namingRules: JSON.stringify({ className: '{Entity}Mapper' }),
      commonImports: JSON.stringify(['com.ctff.framework.mybatis.core.mapper.BaseMapperX', 'org.apache.ibatis.annotations.Mapper']),
      fileExtension: '.java'
    },
    {
      language: 'java', type: 'do', templateName: 'DataObject',
      description: 'MyBatis Plus 数据对象模板。继承 BaseDO，使用 @TableName, @Data, @Builder, @NoArgsConstructor, @AllArgsConstructor 注解。',
      templateContent: `package com.ctff.module.{module}.dal.dataobject.{entity_lower};

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.ctff.framework.mybatis.core.dataobject.BaseDO;
import lombok.*;

@TableName("{TABLE_PREFIX}_{TABLE_NAME}")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class {Entity}DO extends BaseDO {

    @TableId(value = "ID")
    private Long id;

    @TableField("FIELD_NAME")
    private String fieldName;

    @TableField("STATUS")
    private Integer status;
}`,
      namingRules: JSON.stringify({ className: '{Entity}DO', tableName: '{MODULE_PREFIX}_{ENTITY_UPPER}' }),
      commonImports: JSON.stringify(['com.baomidou.mybatisplus.annotation.*', 'com.ctff.framework.mybatis.core.dataobject.BaseDO', 'lombok.*']),
      fileExtension: '.java'
    },

    // ======== Python ========
    {
      language: 'python', type: 'router', templateName: 'FastAPIRouter',
      description: 'FastAPI 路由 CRUD 模板。使用 APIRouter，支持异步 SQLAlchemy 和 Pydantic schemas，snake_case 命名风格。',
      templateContent: `from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database import get_db
from app.schemas.{entity_lower} import (
    {Entity}Create,
    {Entity}Update,
    {Entity}Response,
    {Entity}PageResponse,
)
from app.services.{entity_lower} import {Entity}Service

router = APIRouter(prefix="/{entity_lower}", tags=["{entity_lower}"])


@router.post("/", response_model={Entity}Response, status_code=201)
async def create_{entity_lower}(
    data: {Entity}Create,
    db: AsyncSession = Depends(get_db),
):
    """Create a new {entity_lower}"""
    service = {Entity}Service(db)
    return await service.create_{entity_lower}(data)


@router.get("/", response_model=List[{Entity}Response])
async def list_{entity_lower}s(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List {entity_lower}s with pagination"""
    service = {Entity}Service(db)
    return await service.list_{entity_lower}s(page=page, page_size=page_size)


@router.get("/{entity_lower}_id", response_model={Entity}Response)
async def get_{entity_lower}(
    {entity_lower}_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a {entity_lower} by ID"""
    service = {Entity}Service(db)
    result = await service.get_{entity_lower}({entity_lower}_id)
    if not result:
        raise HTTPException(status_code=404, detail="{Entity} not found")
    return result


@router.put("/{entity_lower}_id", response_model={Entity}Response)
async def update_{entity_lower}(
    {entity_lower}_id: int,
    data: {Entity}Update,
    db: AsyncSession = Depends(get_db),
):
    """Update a {entity_lower}"""
    service = {Entity}Service(db)
    result = await service.update_{entity_lower}({entity_lower}_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="{Entity} not found")
    return result


@router.delete("/{entity_lower}_id", status_code=204)
async def delete_{entity_lower}(
    {entity_lower}_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a {entity_lower}"""
    service = {Entity}Service(db)
    deleted = await service.delete_{entity_lower}({entity_lower}_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="{Entity} not found")
`,
      namingRules: JSON.stringify({ className: 'router', functionName: 'snake_case', urlPath: 'snake_case' }),
      commonImports: JSON.stringify(['fastapi', 'sqlalchemy.ext.asyncio', 'pydantic']),
      fileExtension: '.py'
    },
    {
      language: 'python', type: 'service', templateName: 'SQLAlchemyService',
      description: 'FastAPI 异步 Service 模板。使用 SQLAlchemy 2.0 async 风格，包含 CRUD 业务逻辑。',
      templateContent: `from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from app.models.{entity_lower} import {Entity}Model
from app.schemas.{entity_lower} import {Entity}Create, {Entity}Update


class {Entity}Service:
    """Service for {entity_lower} business logic"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_{entity_lower}(self, data: {Entity}Create) -> {Entity}Model:
        """Create a new {entity_lower}"""
        entity = {Entity}Model(**data.model_dump())
        self.db.add(entity)
        await self.db.commit()
        await self.db.refresh(entity)
        return entity

    async def get_{entity_lower}(self, {entity_lower}_id: int) -> Optional[{Entity}Model]:
        """Get {entity_lower} by ID"""
        result = await self.db.execute(
            select({Entity}Model).where({Entity}Model.id == {entity_lower}_id)
        )
        return result.scalar_one_or_none()

    async def list_{entity_lower}s(
        self, page: int = 1, page_size: int = 20
    ) -> List[{Entity}Model]:
        """List {entity_lower}s with pagination"""
        result = await self.db.execute(
            select({Entity}Model)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(result.scalars().all())

    async def update_{entity_lower}(
        self, {entity_lower}_id: int, data: {Entity}Update
    ) -> Optional[{Entity}Model]:
        """Update {entity_lower}"""
        entity = await self.get_{entity_lower}({entity_lower}_id)
        if not entity:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(entity, field, value)
        await self.db.commit()
        await self.db.refresh(entity)
        return entity

    async def delete_{entity_lower}(self, {entity_lower}_id: int) -> bool:
        """Delete {entity_lower}"""
        entity = await self.get_{entity_lower}({entity_lower}_id)
        if not entity:
            return False
        await self.db.delete(entity)
        await self.db.commit()
        return True
`,
      namingRules: JSON.stringify({ className: '{Entity}Service', functionName: 'snake_case' }),
      commonImports: JSON.stringify(['sqlalchemy', 'sqlalchemy.ext.asyncio', 'pydantic']),
      fileExtension: '.py'
    },
    {
      language: 'python', type: 'schema', templateName: 'PydanticSchema',
      description: 'Pydantic v2 Schema 模板。包含 Create, Update, Response 数据模型，使用 model_validator 进行数据验证。',
      templateContent: `from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, model_validator


class {Entity}Base(BaseModel):
    """Base schema for {entity_lower}"""
    name: str = Field(..., description="Name of the {entity_lower}")
    description: Optional[str] = Field(None, description="Description")
    status: int = Field(1, description="Status: 1=active, 0=inactive")


class {Entity}Create({Entity}Base):
    """Schema for creating a {entity_lower}"""
    pass


class {Entity}Update(BaseModel):
    """Schema for updating a {entity_lower}"""
    name: Optional[str] = Field(None, description="Name of the {entity_lower}")
    description: Optional[str] = Field(None, description="Description")
    status: Optional[int] = Field(None, description="Status")

    @model_validator(mode="after")
    def check_at_least_one_field(self):
        if not any([self.name, self.description, self.status is not None]):
            raise ValueError("At least one field must be provided for update")
        return self


class {Entity}Response({Entity}Base):
    """Schema for {entity_lower} response"""
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class {Entity}PageResponse(BaseModel):
    """Paginated response for {entity_lower}"""
    items: List[{Entity}Response]
    total: int
    page: int
    page_size: int
    total_pages: int
`,
      namingRules: JSON.stringify({ className: '{Entity}{Type}', fieldName: 'snake_case' }),
      commonImports: JSON.stringify(['pydantic', 'datetime', 'typing']),
      fileExtension: '.py'
    },
    {
      language: 'python', type: 'model', templateName: 'SQLAlchemyModel',
      description: 'SQLAlchemy 2.0 ORM Model 模板。使用 DeclarativeBase，支持 async 查询，包含通用字段和时间戳。',
      templateContent: `from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class {Entity}Model(Base):
    __tablename__ = "{entity_lower}s"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, comment="Name")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="Description")
    status: Mapped[int] = mapped_column(Integer, default=1, comment="Status: 1=active, 0=inactive")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), comment="Creation time"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), comment="Update time"
    )

    def __repr__(self) -> str:
        return f"<{Entity}Model(id={self.id}, name={self.name})>"
`,
      namingRules: JSON.stringify({ className: '{Entity}Model', tableName: 'snake_case_plural' }),
      commonImports: JSON.stringify(['sqlalchemy', 'sqlalchemy.orm', 'datetime']),
      fileExtension: '.py'
    },

    // ======== TypeScript ========
    {
      language: 'typescript', type: 'controller', templateName: 'NestJSController',
      description: 'NestJS Controller CRUD 模板。使用 @Controller, @Injectable 装饰器，支持 Swagger 文档，camelCase 命名风格。',
      templateContent: `import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { {Entity}Service } from './{entityKebab}.service';
import { Create{Entity}Dto } from './dto/create-{entityKebab}.dto';
import { Update{Entity}Dto } from './dto/update-{entityKebab}.dto';
import { {Entity}PageDto } from './dto/{entityKebab}-page.dto';
import { {Entity}ResponseDto } from './dto/{entityKebab}-response.dto';

@ApiTags('{entityKebab}')
@Controller('{entityKebab}')
export class {Entity}Controller {
  constructor(private readonly {entityCamel}Service: {Entity}Service) {}

  @Post()
  @ApiOperation({ summary: 'Create {entityLower}' })
  @ApiResponse({ status: 201, type: {Entity}ResponseDto })
  async create(@Body() dto: Create{Entity}Dto): Promise<{Entity}ResponseDto> {
    return this.{entityCamel}Service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List {entityLower}s' })
  async findAll(@Query() dto: {Entity}PageDto): Promise<{Entity}ResponseDto[]> {
    return this.{entityCamel}Service.findAll(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get {entityLower} by id' })
  async findOne(@Param('id') id: number): Promise<{Entity}ResponseDto> {
    return this.{entityCamel}Service.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update {entityLower}' })
  async update(
    @Param('id') id: number,
    @Body() dto: Update{Entity}Dto,
  ): Promise<{Entity}ResponseDto> {
    return this.{entityCamel}Service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete {entityLower}' })
  async remove(@Param('id') id: number): Promise<void> {
    return this.{entityCamel}Service.remove(id);
  }
}`,
      namingRules: JSON.stringify({ className: '{Entity}Controller', methodName: 'camelCase', urlPath: 'kebab-case' }),
      commonImports: JSON.stringify(['@nestjs/common', '@nestjs/swagger', '@nestjs/typeorm', 'class-validator', 'class-transformer']),
      fileExtension: '.ts'
    },
    {
      language: 'typescript', type: 'service', templateName: 'NestJSService',
      description: 'NestJS Service 模板。使用 @Injectable，包含 CRUD 业务逻辑，支持 TypeORM 或 Prisma。',
      templateContent: `import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { {Entity}Entity } from './entities/{entityKebab}.entity';
import { Create{Entity}Dto } from './dto/create-{entityKebab}.dto';
import { Update{Entity}Dto } from './dto/update-{entityKebab}.dto';
import { {Entity}PageDto } from './dto/{entityKebab}-page.dto';

@Injectable()
export class {Entity}Service {
  constructor(
    @InjectRepository({Entity}Entity)
    private readonly {entityCamel}Repository: Repository<{Entity}Entity>,
  ) {}

  async create(dto: Create{Entity}Dto): Promise<{Entity}Entity> {
    const entity = this.{entityCamel}Repository.create(dto);
    return this.{entityCamel}Repository.save(entity);
  }

  async findAll(dto: {Entity}PageDto): Promise<{Entity}Entity[]> {
    const { page = 1, pageSize = 20 } = dto;
    return this.{entityCamel}Repository.find({
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async findOne(id: number): Promise<{Entity}Entity> {
    const entity = await this.{entityCamel}Repository.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('{Entity} not found');
    return entity;
  }

  async update(id: number, dto: Update{Entity}Dto): Promise<{Entity}Entity> {
    const entity = await this.findOne(id);
    Object.assign(entity, dto);
    return this.{entityCamel}Repository.save(entity);
  }

  async remove(id: number): Promise<void> {
    const entity = await this.findOne(id);
    await this.{entityCamel}Repository.remove(entity);
  }
}`,
      namingRules: JSON.stringify({ className: '{Entity}Service', methodName: 'camelCase' }),
      commonImports: JSON.stringify(['@nestjs/common', '@nestjs/typeorm', 'typeorm']),
      fileExtension: '.ts'
    },
    {
      language: 'typescript', type: 'dto', templateName: 'NestJSDto',
      description: 'NestJS DTO 模板。使用 class-validator 和 class-transformer 装饰器进行数据验证和转换。',
      templateContent: `import { IsString, IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class Create{Entity}Dto {
  @ApiProperty({ description: 'Name of the {entityLower}' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class Update{Entity}Dto {
  @ApiPropertyOptional({ description: 'Name of the {entityLower}' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class {Entity}PageDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class {Entity}ResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}`,
      namingRules: JSON.stringify({ className: '{Entity}{Type}Dto', propertyName: 'camelCase' }),
      commonImports: JSON.stringify(['class-validator', 'class-transformer', '@nestjs/swagger']),
      fileExtension: '.ts'
    },
    {
      language: 'typescript', type: 'entity', templateName: 'TypeORMEntity',
      description: 'TypeORM Entity 模板。使用 @Entity, @PrimaryGeneratedColumn, @Column 装饰器，包含通用字段。',
      templateContent: `import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('{entity_lower}s')
export class {Entity}Entity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, comment: 'Name' })
  name: string;

  @Column({ type: 'text', nullable: true, comment: 'Description' })
  description: string;

  @Column({ type: 'int', default: 1, comment: 'Status: 1=active, 0=inactive' })
  status: number;

  @CreateDateColumn({ name: 'created_at', comment: 'Creation time' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: 'Update time' })
  updatedAt: Date;
}`,
      namingRules: JSON.stringify({ className: '{Entity}Entity', tableName: 'snake_case_plural', columnName: 'camelCase' }),
      commonImports: JSON.stringify(['typeorm']),
      fileExtension: '.ts'
    },

    // ======== Go ========
    {
      language: 'go', type: 'handler', templateName: 'GinHandler',
      description: 'Gin HTTP Handler CRUD 模板。PascalCase 导出命名，包含 CRUD 路由处理函数，使用结构体注入 Service。',
      templateContent: `package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"your-project/internal/dto"
	"your-project/internal/service"
)

type {Entity}Handler struct {
	svc *service.{Entity}Service
}

func New{Entity}Handler(svc *service.{Entity}Service) *{Entity}Handler {
	return &{Entity}Handler{svc: svc}
}

// Create handles POST /{entity_lower}
func (h *{Entity}Handler) Create(c *gin.Context) {
	var req dto.Create{Entity}Request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	resp, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, resp)
}

// List handles GET /{entity_lower}
func (h *{Entity}Handler) List(c *gin.Context) {
	var req dto.PageRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	resp, err := h.svc.List(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// GetByID handles GET /{entity_lower}/:id
func (h *{Entity}Handler) GetByID(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	resp, err := h.svc.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// Update handles PUT /{entity_lower}/:id
func (h *{Entity}Handler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var req dto.Update{Entity}Request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	resp, err := h.svc.Update(c.Request.Context(), id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// Delete handles DELETE /{entity_lower}/:id
func (h *{Entity}Handler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
`,
      namingRules: JSON.stringify({ structName: '{Entity}Handler', functionName: 'PascalCase', urlPath: 'snake_case' }),
      commonImports: JSON.stringify(['github.com/gin-gonic/gin', 'net/http', 'strconv']),
      fileExtension: '.go'
    },
    {
      language: 'go', type: 'service', templateName: 'GoService',
      description: 'Go Service 模板。PascalCase 导出命名，包含 CRUD 业务逻辑，使用依赖注入。',
      templateContent: `package service

import (
	"context"
	"fmt"

	"your-project/internal/dto"
	"your-project/internal/model"
	"your-project/internal/repository"
)

type {Entity}Service struct {
	repo *repository.{Entity}Repository
}

func New{Entity}Service(repo *repository.{Entity}Repository) *{Entity}Service {
	return &{Entity}Service{repo: repo}
}

func (s *{Entity}Service) Create(ctx context.Context, req *dto.Create{Entity}Request) (*dto.{Entity}Response, error) {
	entity := &model.{Entity}{
		Name:   req.Name,
		Status: 1,
	}
	if err := s.repo.Create(ctx, entity); err != nil {
		return nil, fmt.Errorf("create {entity_lower}: %w", err)
	}
	return dto.To{Entity}Response(entity), nil
}

func (s *{Entity}Service) List(ctx context.Context, req *dto.PageRequest) (*dto.PageResponse[dto.{Entity}Response], error) {
	entities, total, err := s.repo.List(ctx, req.Page, req.PageSize)
	if err != nil {
		return nil, fmt.Errorf("list {entity_lower}s: %w", err)
	}
	items := make([]dto.{Entity}Response, len(entities))
	for i, e := range entities {
		items[i] = *dto.To{Entity}Response(&e)
	}
	return &dto.PageResponse[dto.{Entity}Response]{
		Items:    items,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
	}, nil
}

func (s *{Entity}Service) GetByID(ctx context.Context, id int64) (*dto.{Entity}Response, error) {
	entity, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get {entity_lower} %d: %w", id, err)
	}
	return dto.To{Entity}Response(entity), nil
}

func (s *{Entity}Service) Update(ctx context.Context, id int64, req *dto.Update{Entity}Request) (*dto.{Entity}Response, error) {
	entity, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("{entity_lower} %d not found: %w", id, err)
	}
	if req.Name != nil {
		entity.Name = *req.Name
	}
	if req.Status != nil {
		entity.Status = *req.Status
	}
	if err := s.repo.Update(ctx, entity); err != nil {
		return nil, fmt.Errorf("update {entity_lower} %d: %w", id, err)
	}
	return dto.To{Entity}Response(entity), nil
}

func (s *{Entity}Service) Delete(ctx context.Context, id int64) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("delete {entity_lower} %d: %w", id, err)
	}
	return nil
}
`,
      namingRules: JSON.stringify({ structName: '{Entity}Service', functionName: 'PascalCase' }),
      commonImports: JSON.stringify(['context', 'fmt', 'your-project/internal/repository', 'your-project/internal/model']),
      fileExtension: '.go'
    },
    {
      language: 'go', type: 'dto', templateName: 'GoDTO',
      description: 'Go Request/Response DTO 模板。包含 Create, Update 请求结构和 Page 响应结构，使用 json 标签。',
      templateContent: `package dto

import "your-project/internal/model"

// Create{Entity}Request represents the request to create a {entity_lower}
type Create{Entity}Request struct {
	Name        string  \`json:"name" binding:"required"\`
	Description *string \`json:"description"\`
}

// Update{Entity}Request represents the request to update a {entity_lower}
type Update{Entity}Request struct {
	Name        *string \`json:"name"\`
	Description *string \`json:"description"\`
	Status      *int    \`json:"status"\`
}

// {Entity}Response represents the response for a {entity_lower}
type {Entity}Response struct {
	ID          int64  \`json:"id"\`
	Name        string \`json:"name"\`
	Description string \`json:"description"\`
	Status      int    \`json:"status"\`
	CreatedAt   string \`json:"created_at"\`
	UpdatedAt   string \`json:"updated_at"\`
}

// To{Entity}Response converts a model to a response DTO
func To{Entity}Response(m *model.{Entity}) *{Entity}Response {
	return &{Entity}Response{
		ID:          m.ID,
		Name:        m.Name,
		Description: m.Description,
		Status:      m.Status,
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt,
	}
}

// PageRequest represents pagination parameters
type PageRequest struct {
	Page     int \`json:"page" form:"page" binding:"required,min=1"\`
	PageSize int \`json:"page_size" form:"page_size" binding:"required,min=1,max=100"\`
}

// PageResponse is a generic paginated response
type PageResponse[T any] struct {
	Items    []T   \`json:"items"\`
	Total    int64 \`json:"total"\`
	Page     int   \`json:"page"\`
	PageSize int   \`json:"page_size"\`
}
`,
      namingRules: JSON.stringify({ structName: '{Entity}{Type}', fieldName: 'PascalCase', jsonTag: 'snake_case' }),
      commonImports: JSON.stringify(['time']),
      fileExtension: '.go'
    },
    {
      language: 'go', type: 'model', templateName: 'GORMModel',
      description: 'GORM Model 模板。包含通用字段 ID, Name, Status, CreatedAt, UpdatedAt，使用 GORM 标签。',
      templateContent: `package model

import "time"

// {Entity} represents the {entity_lower} model
type {Entity} struct {
	ID          int64     \`gorm:"primaryKey;autoIncrement" json:"id"\`
	Name        string    \`gorm:"type:varchar(255);not null;comment:Name" json:"name"\`
	Description string    \`gorm:"type:text;comment:Description" json:"description"\`
	Status      int       \`gorm:"default:1;comment:Status 1=active 0=inactive" json:"status"\`
	CreatedAt   time.Time \`gorm:"autoCreateTime" json:"created_at"\`
	UpdatedAt   time.Time \`gorm:"autoUpdateTime" json:"updated_at"\`
}

// TableName specifies the table name for {Entity}
func ({Entity}) TableName() string {
	return "{entity_lower}s"
}
`,
      namingRules: JSON.stringify({ structName: '{Entity}', tableName: '{entity_lower}s' }),
      commonImports: JSON.stringify(['time', 'gorm.io/gorm']),
      fileExtension: '.go'
    },

    // ======== R ========
    {
      language: 'r', type: 'api', templateName: 'PlumberAPI',
      description: 'R Plumber API 端点模板。使用 plumber 注释声明 RESTful API，包含 CRUD 端点，snake_case 命名风格。',
      templateContent: `# {entity_comment} API
#'
#' This module provides CRUD operations for {entity_lower}
#'
#' @apiTitle {Entity} API
#' @apiDescription CRUD operations for {entity_lower}

library(plumber)
library(dplyr)

#* Create a new {entity_lower}
#* @param data:object Request body
#* @post /{entity_lower}
#* @serializer unboxedJSON
function(data) {
  tryCatch({
    service <- {Entity}Service$new()
    result <- service$create(data)
    list(success = TRUE, data = result)
  }, error = function(e) {
    list(success = FALSE, error = e$message)
  })
}

#* List {entity_lower}s
#* @param page:int Page number
#* @param page_size:int Items per page
#* @get /{entity_lower}
#* @serializer unboxedJSON
function(page = 1, page_size = 20) {
  tryCatch({
    service <- {Entity}Service$new()
    result <- service$list(page = page, page_size = page_size)
    list(success = TRUE, data = result$items, total = result$total)
  }, error = function(e) {
    list(success = FALSE, error = e$message)
  })
}

#* Get a {entity_lower} by ID
#* @param id:int {Entity} ID
#* @get /{entity_lower}/<id>
#* @serializer unboxedJSON
function(id) {
  tryCatch({
    service <- {Entity}Service$new()
    result <- service$get(id)
    if (is.null(result)) {
      list(success = FALSE, error = "{Entity} not found")
    } else {
      list(success = TRUE, data = result)
    }
  }, error = function(e) {
    list(success = FALSE, error = e$message)
  })
}

#* Update a {entity_lower}
#* @param id:int {Entity} ID
#* @param data:object Request body
#* @put /{entity_lower}/<id>
#* @serializer unboxedJSON
function(id, data) {
  tryCatch({
    service <- {Entity}Service$new()
    result <- service$update(id, data)
    list(success = TRUE, data = result)
  }, error = function(e) {
    list(success = FALSE, error = e$message)
  })
}

#* Delete a {entity_lower}
#* @param id:int {Entity} ID
#* @delete /{entity_lower}/<id>
#* @serializer unboxedJSON
function(id) {
  tryCatch({
    service <- {Entity}Service$new()
    service$delete(id)
    list(success = TRUE, message = "{Entity} deleted")
  }, error = function(e) {
    list(success = FALSE, error = e$message)
  })
}
`,
      namingRules: JSON.stringify({ functionName: 'snake_case', urlPath: '{entity_lower}' }),
      commonImports: JSON.stringify(['plumber', 'dplyr', 'R6']),
      fileExtension: '.R'
    },
    {
      language: 'r', type: 'service', templateName: 'R6Service',
      description: 'R R6 类 Service 模板。使用 R6 面向对象编程，包含 CRUD 业务逻辑方法。',
      templateContent: `# {Entity} Service
#'
#' R6 class for {entity_lower} business logic
#'
#' @export
{Entity}Service <- R6::R6Class(
  "{Entity}Service",
  public = list(
    #' Initialize the service
    initialize = function() {
      # Initialize database connection or dependencies
      private$conn <- DBI::dbConnect(RSQLite::SQLite(), "database.sqlite")
    },

    #' Create a new {entity_lower}
    #' @param data List with fields: name, description
    create = function(data) {
      id <- uuid::UUIDgenerate()
      DBI::dbExecute(private$conn,
        "INSERT INTO {entity_lower}s (id, name, description, status) VALUES (?, ?, ?, 1)",
        params = list(id, data$name, data$description coalesce NA)
      )
      self$get(id)
    },

    #' List {entity_lower}s with pagination
    #' @param page Page number
    #' @param page_size Items per page
    list = function(page = 1, page_size = 20) {
      offset <- (page - 1) * page_size
      items <- DBI::dbGetQuery(private$conn,
        "SELECT * FROM {entity_lower}s ORDER BY created_at DESC LIMIT ? OFFSET ?",
        params = list(page_size, offset)
      )
      total <- DBI::dbGetQuery(private$conn,
        "SELECT COUNT(*) as n FROM {entity_lower}s"
      )$n
      list(items = items, total = total, page = page, page_size = page_size)
    },

    #' Get a {entity_lower} by ID
    #' @param id {Entity} ID
    get = function(id) {
      result <- DBI::dbGetQuery(private$conn,
        "SELECT * FROM {entity_lower}s WHERE id = ?",
        params = list(id)
      )
      if (nrow(result) == 0) NULL else result[1, ]
    },

    #' Update a {entity_lower}
    #' @param id {Entity} ID
    #' @param data List with fields to update
    update = function(id, data) {
      fields <- c()
      values <- list()
      if (!is.null(data$name)) {
        fields <- c(fields, "name = ?")
        values <- c(values, data$name)
      }
      if (!is.null(data$description)) {
        fields <- c(fields, "description = ?")
        values <- c(values, data$description)
      }
      if (length(fields) > 0) {
        sql <- sprintf("UPDATE {entity_lower}s SET %s WHERE id = ?",
          paste(fields, collapse = ", "))
        DBI::dbExecute(private$conn, sql, params = c(values, list(id)))
      }
      self$get(id)
    },

    #' Delete a {entity_lower}
    #' @param id {Entity} ID
    delete = function(id) {
      DBI::dbExecute(private$conn,
        "DELETE FROM {entity_lower}s WHERE id = ?",
        params = list(id)
      )
      invisible(TRUE)
    },

    #' Clean up resources
    finalize = function() {
      DBI::dbDisconnect(private$conn)
    }
  ),
  private = list(
    conn = NULL
  )
)
`,
      namingRules: JSON.stringify({ className: '{Entity}Service', methodName: 'snake_case' }),
      commonImports: JSON.stringify(['R6', 'DBI', 'RSQLite', 'uuid']),
      fileExtension: '.R'
    },
    {
      language: 'r', type: 'model', templateName: 'RDataModel',
      description: 'R 数据模型模板。定义数据处理函数，包含 validate 和 transform 辅助方法。',
      templateContent: `# {Entity} Data Model
#'
#' Data model functions for {entity_lower}
#'

# Validate {entity_lower} data
#' @param data List to validate
validate_{entity_lower} <- function(data) {
  errors <- character()

  if (is.null(data$name) || nchar(trimws(data$name)) == 0) {
    errors <- c(errors, "name is required")
  }

  if (!is.null(data$status) && !(data$status %in% c(0, 1))) {
    errors <- c(errors, "status must be 0 or 1")
  }

  if (length(errors) > 0) {
    stop(paste(errors, collapse = "; "))
  }

  invisible(TRUE)
}

# Transform {entity_lower} data for storage
#' @param data Raw input data
transform_{entity_lower} <- function(data) {
  list(
    id = data$id coalesce uuid::UUIDgenerate(),
    name = trimws(data$name),
    description = data$description coalesce NA,
    status = data$status coalesce 1,
    created_at = data$created_at coalesce format(Sys.time(), "%Y-%m-%d %H:%M:%S"),
    updated_at = format(Sys.time(), "%Y-%m-%d %H:%M:%S")
  )
}

# Format {entity_lower} for API response
#' @param row Database row
format_{entity_lower}_response <- function(row) {
  list(
    id = row$id,
    name = row$name,
    description = if (is.na(row$description)) NULL else row$description,
    status = row$status,
    created_at = row$created_at,
    updated_at = row$updated_at
  )
}

# List of required fields for {entity_lower}
{ENTITY}_REQUIRED_FIELDS <- c("name")
`,
      namingRules: JSON.stringify({ functionName: 'snake_case', constantName: 'SCREAMING_SNAKE' }),
      commonImports: JSON.stringify(['stats', 'utils']),
      fileExtension: '.R'
    },
    {
      language: 'r', type: 'constant', templateName: 'RConfig',
      description: 'R 配置常量模板。定义项目相关的配置变量、默认值和错误码。',
      templateContent: `# {Entity} Configuration
#'
#' Configuration constants and helpers for the {entity_lower} module
#'

# Default values
DEFAULT_PAGE_SIZE <- 20
MAX_PAGE_SIZE <- 100

# Status constants
STATUS_ACTIVE <- 1
STATUS_INACTIVE <- 0

# Error codes
ERR_NOT_FOUND <- "{ENTITY}_NOT_FOUND"
ERR_VALIDATION <- "{ENTITY}_VALIDATION_ERROR"
ERR_DUPLICATE <- "{ENTITY}_DUPLICATE"

# Table name
TABLE_{ENTITY} <- "{entity_lower}s"

#' Create a standard response
#' @param success Whether the operation was successful
#' @param data Response data
#' @param error Error message (if applicable)
response <- function(success = TRUE, data = NULL, error = NULL) {
  result <- list(success = success)
  if (!is.null(data)) result$data <- data
  if (!is.null(error)) result$error <- error
  result
}

#' Null-coalescing operator
coalesce <- function(a, b) {
  if (is.null(a)) b else a
}
`,
      namingRules: JSON.stringify({ constantName: 'SCREAMING_SNAKE', functionName: 'snake_case' }),
      commonImports: JSON.stringify([]),
      fileExtension: '.R'
    },
    // Append extra languages from registry (javascript, rust, csharp, php, kotlin, c, cpp, scala, vue)
    ...getExtraBuiltinTemplates(),
  ];
}

export function initBuiltinTemplates(db: Database.Database): void {
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM builtin_templates').get() as any;
  if (existing.cnt > 0) return; // Already seeded

  const insert = db.prepare(
    `INSERT INTO builtin_templates (language, type, template_name, description, template_content, naming_rules, common_imports, file_extension)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const templates = getBuiltinTemplatesData();
  const insertMany = db.transaction(() => {
    for (const t of templates) {
      insert.run(t.language, t.type, t.templateName, t.description, t.templateContent, t.namingRules, t.commonImports, t.fileExtension);
    }
  });
  insertMany();
}

export function getBuiltinTemplate(db: Database.Database, language: string, type: string): BuiltinTemplate | null {
  const row = db.prepare(
    'SELECT * FROM builtin_templates WHERE language = ? AND type = ? LIMIT 1'
  ).get(language, type) as any;
  if (!row) return null;
  return {
    language: row.language,
    type: row.type,
    templateName: row.template_name,
    description: row.description,
    templateContent: row.template_content,
    namingRules: row.naming_rules,
    commonImports: row.common_imports,
    fileExtension: row.file_extension,
  };
}

export function getLanguageDistribution(db: Database.Database): Record<string, number> {
  const rows = db.prepare(
    'SELECT language, COUNT(*) as cnt FROM file_templates GROUP BY language ORDER BY cnt DESC'
  ).all() as any[];
  const result: Record<string, number> = {};
  for (const row of rows) result[row.language] = row.cnt;

  // Also count builtin templates
  const builtin = db.prepare(
    'SELECT language, COUNT(*) as cnt FROM builtin_templates GROUP BY language ORDER BY language'
  ).all() as any[];
  for (const row of builtin) {
    const key = row.language + ' (builtin)';
    result[key] = row.cnt;
  }
  return result;
}

export function initDb(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = getConnection(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS module_structures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_name TEXT NOT NULL, structure_json TEXT NOT NULL,
      file_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS file_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      module TEXT NOT NULL, file_path TEXT NOT NULL, class_name TEXT NOT NULL,
      package_path TEXT NOT NULL, annotations TEXT NOT NULL, extends_class TEXT,
      implements_interface TEXT, import_list TEXT NOT NULL, source_content TEXT NOT NULL,
      representativeness INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS component_usages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      component_name TEXT NOT NULL, usage_pattern TEXT NOT NULL,
      file_path TEXT NOT NULL, usage_count INTEGER DEFAULT 1,
      related_components TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS naming_conventions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      pattern TEXT NOT NULL, examples TEXT NOT NULL, source_files TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS annotation_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_type TEXT NOT NULL,
      annotations TEXT NOT NULL, optional_annotations TEXT,
      required_imports TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS project_conventions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE, value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS builtin_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      language TEXT NOT NULL,
      type TEXT NOT NULL,
      template_name TEXT NOT NULL,
      description TEXT NOT NULL,
      template_content TEXT NOT NULL,
      naming_rules TEXT,
      common_imports TEXT,
      file_extension TEXT NOT NULL DEFAULT '.java',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  migrateSchema(db);
  initBuiltinTemplates(db);
  return db;
}

export function dropAllTables(db: Database.Database): void {
  db.exec(`DROP TABLE IF EXISTS module_structures; DROP TABLE IF EXISTS file_templates;
    DROP TABLE IF EXISTS component_usages; DROP TABLE IF EXISTS naming_conventions;
    DROP TABLE IF EXISTS annotation_patterns; DROP TABLE IF EXISTS project_conventions;
    DROP TABLE IF EXISTS builtin_templates;`);
}
