// Language registry — add new languages here
// Each entry defines: extensions, file types, naming conventions, and template stubs

export interface LanguageFileType {
  type: string;           // e.g. 'controller', 'handler', 'component'
  className: string;      // e.g. '{Entity}Controller', '{Entity}Handler'
  description: string;    // e.g. 'REST Controller — handles HTTP requests'
  template: string;       // compact template with {Entity} placeholders
  entityType: string;     // for naming_conventions table
}

export interface LanguageDef {
  name: string;           // e.g. 'java', 'python'
  label: string;          // e.g. 'Java', 'Python'
  extensions: string[];   // e.g. ['.java'], ['.py']
  subDir: string;         // typical source subdirectory, e.g. 'src/main/java'
  fileTypes: LanguageFileType[];
  // Additional naming conventions (beyond file types)
  extraNaming: { entityType: string; pattern: string }[];
  // Common component patterns to search for
  componentPatterns: { name: string; regex: string }[];
}

// Shared naming convention placeholders:
//   {Entity} = PascalCase (VptModel)
//   {entity_lower} = snake_case (vpt_model)
//   {entityCamel} = camelCase (vptModel)
//   {entityKebab} = kebab-case (vpt-model)
//   {module} = module name

export const LANGUAGES: LanguageDef[] = [
  // ======== Java / Spring Boot ========
  {
    name: 'java', label: 'Java', extensions: ['.java'], subDir: 'src/main/java',
    fileTypes: [
      {
        type: 'controller', className: '{Entity}Controller',
        description: 'REST Controller — HTTP 请求处理入口，@RestController 注解',
        entityType: 'controller',
        template: `@Tag(name = "{entity_comment}")
@RestController
@RequestMapping("/{module}/{entityKebab}")
@RequiredArgsConstructor
@Slf4j
public class {Entity}Controller {
    private final {Entity}Service {entityCamel}Service;

    @PostMapping("/page")
    @Operation(summary = "分页查询{entity_comment}")
    public CommonResult<PageResult<{Entity}RespVO>> page{Entity}(@RequestBody {Entity}PageReqVO reqVO) {
        return CommonResult.success({entityCamel}Service.page{Entity}(reqVO));
    }

    @PostMapping("/create")
    @Operation(summary = "创建{entity_comment}")
    public CommonResult<Long> create{Entity}(@Valid @RequestBody {Entity}SaveReqVO reqVO) {
        return CommonResult.success({entityCamel}Service.create{Entity}(reqVO));
    }

    @GetMapping("/get/{id}")
    @Operation(summary = "获取{entity_comment}")
    public CommonResult<{Entity}RespVO> get{Entity}(@PathVariable("id") Long id) {
        return CommonResult.success({entityCamel}Service.get{Entity}(id));
    }

    @DeleteMapping("/delete/{id}")
    @Operation(summary = "删除{entity_comment}")
    public CommonResult<Boolean> delete{Entity}(@PathVariable("id") Long id) {
        {entityCamel}Service.delete{Entity}(id);
        return CommonResult.success(true);
    }
}`
      },
      {
        type: 'service_impl', className: '{Entity}ServiceImpl',
        description: 'Service 实现 — @Service 注解，包含 CRUD 业务逻辑',
        entityType: 'service_impl',
        template: `@Service
@RequiredArgsConstructor
@Slf4j
public class {Entity}ServiceImpl implements {Entity}Service {
    private final {Entity}Mapper {entityCamel}Mapper;

    public PageResult<{Entity}RespVO> page{Entity}({Entity}PageReqVO reqVO) {
        Page<{Entity}DO> page = {entityCamel}Mapper.selectPage(
            new LambdaQueryWrapperX<{Entity}DO>()
                .orderByDesc({Entity}DO::getId)
        );
        return PageResult.of(page, {Entity}RespVO.class);
    }

    @Transactional
    public Long create{Entity}({Entity}SaveReqVO reqVO) {
        {Entity}DO entity = BeanUtils.toBean(reqVO, {Entity}DO.class);
        {entityCamel}Mapper.insert(entity);
        return entity.getId();
    }

    @Transactional
    public void update{Entity}({Entity}UpdateReqVO reqVO) {
        {Entity}DO entity = BeanUtils.toBean(reqVO, {Entity}DO.class);
        {entityCamel}Mapper.updateById(entity);
    }

    @Transactional
    public void delete{Entity}(Long id) {
        {entityCamel}Mapper.deleteById(id);
    }

    public {Entity}RespVO get{Entity}(Long id) {
        return BeanUtils.toBean({entityCamel}Mapper.selectById(id), {Entity}RespVO.class);
    }
}`
      },
      {
        type: 'mapper', className: '{Entity}Mapper',
        description: 'MyBatis Mapper — 数据访问层，继承 BaseMapperX',
        entityType: 'mapper',
        template: `@Mapper
public interface {Entity}Mapper extends BaseMapperX<{Entity}DO> {
    default Page<{Entity}DO> selectPage({Entity}PageReqVO reqVO) {
        return selectPage(reqVO, new LambdaQueryWrapperX<{Entity}DO>()
            .orderByDesc({Entity}DO::getId));
    }
}`
      },
      {
        type: 'do', className: '{Entity}DO',
        description: 'Data Object — 数据库实体，@TableName 注解',
        entityType: 'do',
        template: `@TableName("{TABLE_NAME}")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class {Entity}DO extends BaseDO {
    @TableId("ID")
    private Long id;
    @TableField("NAME")
    private String name;
}`
      }
    ],
    extraNaming: [
      { entityType: 'vo_req', pattern: '{Entity}{Action}ReqVO' },
      { entityType: 'vo_resp', pattern: '{Entity}{Action}RespVO' },
      { entityType: 'enum', pattern: '{Entity}Enum' },
      { entityType: 'constant', pattern: '{Module}Constant' },
      { entityType: 'table', pattern: '{TABLE_PREFIX}_{ENTITY}' },
      { entityType: 'package', pattern: 'com.ctff.module.{module}.{layer}.{sublayer}' },
    ],
    componentPatterns: [
      { name: 'CommonResult.success', regex: 'CommonResult\\.success\\(' },
      { name: 'PageResult', regex: 'PageResult<' },
      { name: '@Transactional', regex: '@Transactional' },
      { name: 'BeanUtils.toBean', regex: 'BeanUtils\\.toBean\\(' },
      { name: 'LambdaQueryWrapperX', regex: 'LambdaQueryWrapperX<' },
      { name: '@RestController', regex: '@RestController' },
    ],
  },

  // ======== Python ========
  {
    name: 'python', label: 'Python', extensions: ['.py'], subDir: '',
    fileTypes: [
      {
        type: 'router', className: '{Entity}Router',
        description: 'FastAPI/Flask Router — HTTP 路由处理',
        entityType: 'controller',
        template: `from fastapi import APIRouter, Depends
from app.services.{entity_lower}_service import {Entity}Service
from app.schemas.{entity_lower} import {Entity}Create, {Entity}Response

router = APIRouter(prefix="/{entityKebab}", tags=["{entity_comment}"])

@router.post("/", response_model={Entity}Response)
async def create_{entity_lower}(data: {Entity}Create, service: {Entity}Service = Depends()):
    return await service.create(data)

@router.get("/{id}", response_model={Entity}Response)
async def get_{entity_lower}(id: int, service: {Entity}Service = Depends()):
    return await service.get_by_id(id)

@router.get("/", response_model=list[{Entity}Response])
async def list_{entity_lower}(skip: int = 0, limit: int = 20, service: {Entity}Service = Depends()):
    return await service.list(skip=skip, limit=limit)

@router.put("/{id}", response_model={Entity}Response)
async def update_{entity_lower}(id: int, data: {Entity}Update, service: {Entity}Service = Depends()):
    return await service.update(id, data)

@router.delete("/{id}")
async def delete_{entity_lower}(id: int, service: {Entity}Service = Depends()):
    await service.delete(id)
    return {"ok": True}`
      },
      {
        type: 'service', className: '{Entity}Service',
        description: '业务逻辑服务层 — 数据库操作和业务规则',
        entityType: 'service',
        template: `from app.repositories.{entity_lower}_repo import {Entity}Repository
from app.schemas.{entity_lower} import {Entity}Create, {Entity}Update, {Entity}Response

class {Entity}Service:
    def __init__(self, repo: {Entity}Repository = Depends()):
        self.repo = repo

    async def create(self, data: {Entity}Create) -> {Entity}Response:
        entity = await self.repo.insert(**data.model_dump())
        return {Entity}Response.model_validate(entity)

    async def get_by_id(self, id: int) -> {Entity}Response:
        entity = await self.repo.get(id)
        if not entity:
            raise HTTPException(status_code=404, detail="{Entity} not found")
        return {Entity}Response.model_validate(entity)

    async def list(self, skip: int = 0, limit: int = 20) -> list[{Entity}Response]:
        entities = await self.repo.list(skip=skip, limit=limit)
        return [{Entity}Response.model_validate(e) for e in entities]

    async def update(self, id: int, data: {Entity}Update) -> {Entity}Response:
        await self.repo.update(id, **data.model_dump(exclude_unset=True))
        return await self.get_by_id(id)

    async def delete(self, id: int):
        await self.repo.delete(id)`
      },
      {
        type: 'schema', className: '{Entity}Schema',
        description: 'Pydantic Schema — 请求/响应数据模型',
        entityType: 'vo_req',
        template: `from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class {Entity}Create(BaseModel):
    """创建{entity_comment}的请求体"""
    name: str = Field(..., description="{entity_comment}名称")

class {Entity}Update(BaseModel):
    """更新{entity_comment}的请求体"""
    name: Optional[str] = Field(None, description="{entity_comment}名称")

class {Entity}Response(BaseModel):
    """{entity_comment}的响应体"""
    id: int
    name: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}`
      },
      {
        type: 'model', className: '{Entity}Model',
        description: 'SQLAlchemy/ORM Model — 数据库表映射',
        entityType: 'do',
        template: `from sqlalchemy import Column, Integer, String, DateTime
from app.database import Base

class {Entity}Model(Base):
    __tablename__ = "{TABLE_NAME}"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())`
      }
    ],
    extraNaming: [
      { entityType: 'enum', pattern: '{Entity}Enum' },
      { entityType: 'constant', pattern: '{ENTITY}_CONSTANT' },
      { entityType: 'table', pattern: '{entity_lower}' },
    ],
    componentPatterns: [
      { name: '@router.', regex: '@router\\.(get|post|put|delete|patch)\\(' },
      { name: 'Depends()', regex: 'Depends\\(\\)' },
      { name: 'HTTPException', regex: 'HTTPException\\(' },
      { name: 'BaseModel', regex: 'BaseModel' },
    ],
  },

  // ======== TypeScript ========
  {
    name: 'typescript', label: 'TypeScript', extensions: ['.ts', '.tsx'], subDir: 'src',
    fileTypes: [
      {
        type: 'controller', className: '{Entity}Controller',
        description: 'NestJS Controller — HTTP 路由处理',
        entityType: 'controller',
        template: `import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { {Entity}Service } from './{entity_lower}.service';
import { Create{Entity}Dto, Update{Entity}Dto } from './dto';

@Controller('{entityKebab}')
export class {Entity}Controller {
  constructor(private readonly {entityCamel}Service: {Entity}Service) {}

  @Post()
  create(@Body() dto: Create{Entity}Dto) {
    return this.{entityCamel}Service.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.{entityCamel}Service.findOne(id);
  }

  @Get()
  findAll() {
    return this.{entityCamel}Service.findAll();
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Update{Entity}Dto) {
    return this.{entityCamel}Service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.{entityCamel}Service.remove(id);
  }
}`
      },
      {
        type: 'service', className: '{Entity}Service',
        description: 'Provider Service — 业务逻辑',
        entityType: 'service',
        template: `import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { {Entity} } from './entities/{entity_lower}.entity';
import { Create{Entity}Dto, Update{Entity}Dto } from './dto';

@Injectable()
export class {Entity}Service {
  constructor(
    @InjectRepository({Entity})
    private {entityCamel}Repo: Repository<{Entity}>,
  ) {}

  async create(dto: Create{Entity}Dto): Promise<{Entity}> {
    const entity = this.{entityCamel}Repo.create(dto);
    return this.{entityCamel}Repo.save(entity);
  }

  async findAll(): Promise<{Entity}[]> {
    return this.{entityCamel}Repo.find();
  }

  async findOne(id: string): Promise<{Entity}> {
    const entity = await this.{entityCamel}Repo.findOneBy({ id });
    if (!entity) throw new NotFoundException('{Entity} not found');
    return entity;
  }

  async update(id: string, dto: Update{Entity}Dto): Promise<{Entity}> {
    await this.{entityCamel}Repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.{entityCamel}Repo.delete(id);
  }
}`
      },
      {
        type: 'dto', className: '{Entity}Dto',
        description: 'DTO — 数据传输对象',
        entityType: 'vo_req',
        template: `import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Create{Entity}Dto {
  @ApiProperty({ description: '{entity_comment}名称' })
  @IsString()
  name: string;
}

export class Update{Entity}Dto {
  @ApiProperty({ description: '{entity_comment}名称', required: false })
  @IsOptional()
  @IsString()
  name?: string;
}`
      },
      {
        type: 'entity', className: '{Entity}',
        description: 'TypeORM Entity — 数据库表映射',
        entityType: 'do',
        template: `import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('{TABLE_NAME}')
export class {Entity} {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}`
      }
    ],
    extraNaming: [
      { entityType: 'enum', pattern: '{Entity}Enum' },
      { entityType: 'constant', pattern: '{ENTITY}_CONSTANT' },
    ],
    componentPatterns: [
      { name: '@Controller', regex: '@Controller\\(' },
      { name: '@Injectable', regex: '@Injectable\\(\\)' },
      { name: '@Module', regex: '@Module\\(' },
      { name: 'class-validator', regex: '@Is(String|Int|Optional|NotEmpty)' },
    ],
  },

  // ======== JavaScript ========
  {
    name: 'javascript', label: 'JavaScript', extensions: ['.js', '.jsx', '.mjs', '.cjs'], subDir: 'src',
    fileTypes: [
      {
        type: 'controller', className: '{Entity}Controller',
        description: 'Express/Koa 路由控制器',
        entityType: 'controller',
        template: `const express = require('express');
const router = express.Router();
const { {Entity}Service } = require('../services/{entity_lower}.service');

router.post('/', async (req, res) => {
  try {
    const result = await {Entity}Service.create(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await {Entity}Service.getById(req.params.id);
    if (!result) return res.status(404).json({ error: '{Entity} not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  const { skip = 0, limit = 20 } = req.query;
  const results = await {Entity}Service.list(Number(skip), Number(limit));
  res.json(results);
});

router.put('/:id', async (req, res) => {
  try {
    const result = await {Entity}Service.update(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  await {Entity}Service.delete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;`
      },
      {
        type: 'service', className: '{Entity}Service',
        description: '业务逻辑服务',
        entityType: 'service',
        template: `const db = require('../db');

class {Entity}Service {
  static async create(data) {
    const result = await db('{TABLE_NAME}').insert(data).returning('*');
    return result[0];
  }

  static async getById(id) {
    return db('{TABLE_NAME}').where({ id }).first();
  }

  static async list(skip = 0, limit = 20) {
    return db('{TABLE_NAME}').offset(skip).limit(limit);
  }

  static async update(id, data) {
    await db('{TABLE_NAME}').where({ id }).update(data);
    return this.getById(id);
  }

  static async delete(id) {
    return db('{TABLE_NAME}').where({ id }).del();
  }
}

module.exports = { {Entity}Service };`
      },
      {
        type: 'model', className: '{Entity}',
        description: 'Mongoose/Sequelize Model',
        entityType: 'do',
        template: `const mongoose = require('mongoose');

const {entity_lower}Schema = new mongoose.Schema({
  name: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('{Entity}', {entity_lower}Schema);`
      },
      {
        type: 'middleware', className: '{Entity}Middleware',
        description: 'Express/Koa 中间件',
        entityType: 'middleware',
        template: `function {entityCamel}Middleware(req, res, next) {
  // Validation / auth logic for {entity_comment}
  const isValid = true; // TODO: implement
  if (!isValid) {
    return res.status(400).json({ error: 'Validation failed' });
  }
  next();
}

module.exports = { {entityCamel}Middleware };`
      }
    ],
    extraNaming: [
      { entityType: 'constant', pattern: '{ENTITY}_CONSTANT' },
    ],
    componentPatterns: [
      { name: 'express.Router', regex: 'Router\\(\\)' },
      { name: 'mongoose.model', regex: 'mongoose\\.model\\(' },
      { name: 'module.exports', regex: 'module\\.exports' },
    ],
  },

  // ======== Go ========
  {
    name: 'go', label: 'Go', extensions: ['.go'], subDir: '',
    fileTypes: [
      {
        type: 'handler', className: '{Entity}Handler',
        description: 'Gin/Echo Handler — HTTP 处理函数',
        entityType: 'controller',
        template: `package handler

import (
    "net/http"
    "strconv"
    "github.com/gin-gonic/gin"
    "{module}/service"
)

type {Entity}Handler struct {
    svc *service.{Entity}Service
}

func New{Entity}Handler(svc *service.{Entity}Service) *{Entity}Handler {
    return &{Entity}Handler{svc: svc}
}

func (h *{Entity}Handler) Create(c *gin.Context) {
    var req Create{Entity}Req
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    result, err := h.svc.Create(c.Request.Context(), &req)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusCreated, result)
}

func (h *{Entity}Handler) Get(c *gin.Context) {
    id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
    result, err := h.svc.GetByID(c.Request.Context(), id)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "{Entity} not found"})
        return
    }
    c.JSON(http.StatusOK, result)
}

func (h *{Entity}Handler) List(c *gin.Context) {
    skip, _ := strconv.Atoi(c.DefaultQuery("skip", "0"))
    limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
    results := h.svc.List(c.Request.Context(), skip, limit)
    c.JSON(http.StatusOK, results)
}

func (h *{Entity}Handler) Update(c *gin.Context) {
    id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
    var req Update{Entity}Req
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    result, err := h.svc.Update(c.Request.Context(), id, &req)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, result)
}

func (h *{Entity}Handler) Delete(c *gin.Context) {
    id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
    h.svc.Delete(c.Request.Context(), id)
    c.JSON(http.StatusOK, gin.H{"ok": true})
}`
      },
      {
        type: 'service', className: '{Entity}Service',
        description: '业务逻辑服务层',
        entityType: 'service',
        template: `package service

import (
    "context"
    "{module}/model"
    "{module}/repository"
)

type {Entity}Service struct {
    repo *repository.{Entity}Repo
}

func New{Entity}Service(repo *repository.{Entity}Repo) *{Entity}Service {
    return &{Entity}Service{repo: repo}
}

func (s *{Entity}Service) Create(ctx context.Context, req *Create{Entity}Req) (*model.{Entity}, error) {
    entity := &model.{Entity}{Name: req.Name}
    return s.repo.Insert(ctx, entity)
}

func (s *{Entity}Service) GetByID(ctx context.Context, id int64) (*model.{Entity}, error) {
    return s.repo.Get(ctx, id)
}

func (s *{Entity}Service) List(ctx context.Context, skip, limit int) []*model.{Entity} {
    return s.repo.List(ctx, skip, limit)
}

func (s *{Entity}Service) Update(ctx context.Context, id int64, req *Update{Entity}Req) (*model.{Entity}, error) {
    return s.repo.Update(ctx, id, req)
}

func (s *{Entity}Service) Delete(ctx context.Context, id int64) {
    s.repo.Delete(ctx, id)
}`
      },
      {
        type: 'model', className: '{Entity}',
        description: 'GORM Model / Struct 定义',
        entityType: 'do',
        template: `package model

import "time"

type {Entity} struct {
    ID        int64     \`json:"id" gorm:"primaryKey;autoIncrement"\`
    Name      string    \`json:"name" gorm:"column:name;not null"\`
    CreatedAt time.Time \`json:"createdAt"\`
    UpdatedAt time.Time \`json:"updatedAt"\`
}

func ({Entity}) TableName() string {
    return "{TABLE_NAME}"
}`
      },
      {
        type: 'repository', className: '{Entity}Repo',
        description: 'Repository — 数据访问层',
        entityType: 'mapper',
        template: `package repository

import (
    "context"
    "{module}/model"
    "gorm.io/gorm"
)

type {Entity}Repo struct {
    db *gorm.DB
}

func New{Entity}Repo(db *gorm.DB) *{Entity}Repo {
    return &{Entity}Repo{db: db}
}

func (r *{Entity}Repo) Insert(ctx context.Context, m *model.{Entity}) (*model.{Entity}, error) {
    return m, r.db.WithContext(ctx).Create(m).Error
}

func (r *{Entity}Repo) Get(ctx context.Context, id int64) (*model.{Entity}, error) {
    var m model.{Entity}
    return &m, r.db.WithContext(ctx).First(&m, id).Error
}

func (r *{Entity}Repo) List(ctx context.Context, skip, limit int) []*model.{Entity} {
    var results []*model.{Entity}
    r.db.WithContext(ctx).Offset(skip).Limit(limit).Find(&results)
    return results
}

func (r *{Entity}Repo) Update(ctx context.Context, id int64, data interface{}) (*model.{Entity}, error) {
    r.db.WithContext(ctx).Model(&model.{Entity}{}).Where("id = ?", id).Updates(data)
    return r.Get(ctx, id)
}

func (r *{Entity}Repo) Delete(ctx context.Context, id int64) {
    r.db.WithContext(ctx).Delete(&model.{Entity}{}, id)
}`
      }
    ],
    extraNaming: [
      { entityType: 'constant', pattern: '{Entity}Constant' },
      { entityType: 'table', pattern: '{entity_lower}' },
    ],
    componentPatterns: [
      { name: 'gin.Context', regex: 'gin\\.Context' },
      { name: 'gorm.DB', regex: 'gorm\\.DB' },
      { name: 'http.Handler', regex: 'http\\.Handler' },
    ],
  },

  // ======== Rust ========
  {
    name: 'rust', label: 'Rust', extensions: ['.rs'], subDir: 'src',
    fileTypes: [
      {
        type: 'handler', className: '{Entity}Handler',
        description: 'Actix/Axum Handler — HTTP 请求处理函数',
        entityType: 'controller',
        template: `use axum::{extract::{Path, Query, State}, Json, http::StatusCode};
use crate::service::{Entity}Service;
use crate::dto::*;
use std::sync::Arc;

pub async fn create_{entity_lower}(
    State(svc): State<Arc<{Entity}Service>>,
    Json(req): Json<Create{Entity}Req>,
) -> Result<(StatusCode, Json<{Entity}Resp>), StatusCode> {
    svc.create(req).await
        .map(|r| (StatusCode::CREATED, Json(r)))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn get_{entity_lower}(
    State(svc): State<Arc<{Entity}Service>>,
    Path(id): Path<i64>,
) -> Result<Json<{Entity}Resp>, StatusCode> {
    svc.get_by_id(id).await
        .map(Json)
        .map_err(|_| StatusCode::NOT_FOUND)
}

pub async fn list_{entity_lower}(
    State(svc): State<Arc<{Entity}Service>>,
    Query(p): Query<ListQuery>,
) -> Json<Vec<{Entity}Resp>> {
    Json(svc.list(p.skip, p.limit).await)
}

pub async fn update_{entity_lower}(
    State(svc): State<Arc<{Entity}Service>>,
    Path(id): Path<i64>,
    Json(req): Json<Update{Entity}Req>,
) -> Result<Json<{Entity}Resp>, StatusCode> {
    svc.update(id, req).await
        .map(Json)
        .map_err(|_| StatusCode::NOT_FOUND)
}

pub async fn delete_{entity_lower}(
    State(svc): State<Arc<{Entity}Service>>,
    Path(id): Path<i64>,
) -> StatusCode {
    svc.delete(id).await;
    StatusCode::OK
}`
      },
      {
        type: 'service', className: '{Entity}Service',
        description: '业务逻辑服务层',
        entityType: 'service',
        template: `use sqlx::PgPool;
use crate::model::{Entity};
use crate::dto::*;

pub struct {Entity}Service {
    db: PgPool,
}

impl {Entity}Service {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    pub async fn create(&self, req: Create{Entity}Req) -> Result<{Entity}Resp, sqlx::Error> {
        let row = sqlx::query_as!({Entity}Row, "INSERT INTO {TABLE_NAME} (name) VALUES ($1) RETURNING *", req.name)
            .fetch_one(&self.db).await?;
        Ok(row.into())
    }

    pub async fn get_by_id(&self, id: i64) -> Result<{Entity}Resp, sqlx::Error> {
        sqlx::query_as!({Entity}Row, "SELECT * FROM {TABLE_NAME} WHERE id = $1", id)
            .fetch_one(&self.db).await.map(Into::into)
    }

    pub async fn list(&self, skip: i64, limit: i64) -> Vec<{Entity}Resp> {
        sqlx::query_as!({Entity}Row, "SELECT * FROM {TABLE_NAME} OFFSET $1 LIMIT $2", skip, limit)
            .fetch_all(&self.db).await.unwrap_or_default()
            .into_iter().map(Into::into).collect()
    }

    pub async fn update(&self, id: i64, req: Update{Entity}Req) -> Result<{Entity}Resp, sqlx::Error> {
        sqlx::query_as!({Entity}Row, "UPDATE {TABLE_NAME} SET name = $1 WHERE id = $2 RETURNING *", req.name, id)
            .fetch_one(&self.db).await.map(Into::into)
    }

    pub async fn delete(&self, id: i64) {
        let _ = sqlx::query!("DELETE FROM {TABLE_NAME} WHERE id = $1", id).execute(&self.db).await;
    }
}`
      },
      {
        type: 'model', className: '{Entity}',
        description: 'Struct / sqlx Row 定义',
        entityType: 'do',
        template: `use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct {Entity}Row {
    pub id: i64,
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct Create{Entity}Req {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct Update{Entity}Req {
    pub name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct {Entity}Resp {
    pub id: i64,
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<{Entity}Row> for {Entity}Resp {
    fn from(r: {Entity}Row) -> Self {
        Self { id: r.id, name: r.name, created_at: r.created_at, updated_at: r.updated_at }
    }
}`
      },
      {
        type: 'middleware', className: '{Entity}Middleware',
        description: 'Tower/Actix 中间件',
        entityType: 'middleware',
        template: `use axum::{middleware::Next, response::Response, extract::Request};

pub async fn {entity_lower}_middleware(request: Request, next: Next) -> Response {
    // Pre-processing for {entity_comment}
    tracing::info!("Processing {entity_lower} request: {:?}", request.uri());
    let response = next.run(request).await;
    // Post-processing
    response
}`
      }
    ],
    extraNaming: [
      { entityType: 'constant', pattern: '{ENTITY}_CONST' },
      { entityType: 'table', pattern: '{entity_lower}' },
    ],
    componentPatterns: [
      { name: 'axum::routing', regex: 'axum::routing' },
      { name: 'sqlx::query', regex: 'sqlx::query' },
      { name: 'actix_web', regex: 'actix_web' },
      { name: '#[tokio::test]', regex: '#\\[tokio::test\\]' },
    ],
  },

  // ======== C# ========
  {
    name: 'csharp', label: 'C#', extensions: ['.cs'], subDir: '',
    fileTypes: [
      {
        type: 'controller', className: '{Entity}Controller',
        description: 'ASP.NET Controller — API 控制器',
        entityType: 'controller',
        template: `using Microsoft.AspNetCore.Mvc;

namespace {Module}.Controllers;

[ApiController]
[Route("api/[controller]")]
public class {Entity}Controller : ControllerBase
{
    private readonly I{Entity}Service _{entityCamel}Service;

    public {Entity}Controller(I{Entity}Service service) => _{entityCamel}Service = service;

    [HttpPost]
    public async Task<ActionResult<{Entity}Dto>> Create([FromBody] Create{Entity}Dto dto)
    {
        var result = await _{entityCamel}Service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<{Entity}Dto>> GetById(int id)
    {
        var result = await _{entityCamel}Service.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<{Entity}Dto>>> List([FromQuery] int skip = 0, [FromQuery] int limit = 20)
    {
        return Ok(await _{entityCamel}Service.ListAsync(skip, limit));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<{Entity}Dto>> Update(int id, [FromBody] Update{Entity}Dto dto)
    {
        var result = await _{entityCamel}Service.UpdateAsync(id, dto);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _{entityCamel}Service.DeleteAsync(id);
        return Ok();
    }
}`
      },
      {
        type: 'service', className: '{Entity}Service',
        description: 'Service 实现',
        entityType: 'service',
        template: `using Microsoft.EntityFrameworkCore;

namespace {Module}.Services;

public class {Entity}Service : I{Entity}Service
{
    private readonly AppDbContext _db;

    public {Entity}Service(AppDbContext db) => _db = db;

    public async Task<{Entity}Dto> CreateAsync(Create{Entity}Dto dto)
    {
        var entity = new {Entity} { Name = dto.Name };
        _db.{Entity}s.Add(entity);
        await _db.SaveChangesAsync();
        return Map(entity);
    }

    public async Task<{Entity}Dto?> GetByIdAsync(int id)
    {
        var entity = await _db.{Entity}s.FindAsync(id);
        return entity is null ? null : Map(entity);
    }

    public async Task<IEnumerable<{Entity}Dto>> ListAsync(int skip, int limit)
    {
        return await _db.{Entity}s.Skip(skip).Take(limit)
            .Select(e => Map(e)).ToListAsync();
    }

    public async Task<{Entity}Dto?> UpdateAsync(int id, Update{Entity}Dto dto)
    {
        var entity = await _db.{Entity}s.FindAsync(id);
        if (entity is null) return null;
        entity.Name = dto.Name;
        await _db.SaveChangesAsync();
        return Map(entity);
    }

    public async Task DeleteAsync(int id)
    {
        var entity = await _db.{Entity}s.FindAsync(id);
        if (entity is not null) { _db.{Entity}s.Remove(entity); await _db.SaveChangesAsync(); }
    }

    private static {Entity}Dto Map({Entity} e) => new() { Id = e.Id, Name = e.Name };
}`
      },
      {
        type: 'entity', className: '{Entity}',
        description: 'EF Core Entity — 数据库模型',
        entityType: 'do',
        template: `using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace {Module}.Entities;

[Table("{TABLE_NAME}")]
public class {Entity}
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}`
      },
      {
        type: 'dto', className: '{Entity}Dto',
        description: 'DTO — 数据传输对象',
        entityType: 'vo_req',
        template: `namespace {Module}.Dtos;

public class Create{Entity}Dto
{
    public string Name { get; set; } = string.Empty;
}

public class Update{Entity}Dto
{
    public string? Name { get; set; }
}

public class {Entity}Dto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}`
      }
    ],
    extraNaming: [
      { entityType: 'enum', pattern: '{Entity}Enum' },
      { entityType: 'constant', pattern: '{Entity}Constants' },
    ],
    componentPatterns: [
      { name: '[ApiController]', regex: '\\[ApiController\\]' },
      { name: '[HttpGet]', regex: '\\[HttpGet' },
      { name: 'DbContext', regex: 'DbContext' },
      { name: 'Entity Framework', regex: 'Microsoft\\.EntityFrameworkCore' },
    ],
  },

  // ======== PHP ========
  {
    name: 'php', label: 'PHP', extensions: ['.php'], subDir: 'src',
    fileTypes: [
      {
        type: 'controller', className: '{Entity}Controller',
        description: 'Laravel/Symfony Controller',
        entityType: 'controller',
        template: `<?php

namespace App\\Http\\Controllers;

use App\\Services\\{Entity}Service;
use App\\Http\\Requests\\Create{Entity}Request;
use App\\Http\\Requests\\Update{Entity}Request;
use Illuminate\\Http\\JsonResponse;

class {Entity}Controller extends Controller
{
    public function __construct(private {Entity}Service $service) {}

    public function create(Create{Entity}Request $request): JsonResponse
    {
        $entity = $this->service->create($request->validated());
        return response()->json($entity, 201);
    }

    public function show(int $id): JsonResponse
    {
        $entity = $this->service->getById($id);
        if (!$entity) return response()->json(['error' => '{Entity} not found'], 404);
        return response()->json($entity);
    }

    public function index(): JsonResponse
    {
        return response()->json($this->service->list());
    }

    public function update(Update{Entity}Request $request, int $id): JsonResponse
    {
        $entity = $this->service->update($id, $request->validated());
        return response()->json($entity);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->service->delete($id);
        return response()->json(['ok' => true]);
    }
}`
      },
      {
        type: 'service', className: '{Entity}Service',
        description: 'Service 业务逻辑',
        entityType: 'service',
        template: `<?php

namespace App\\Services;

use App\\Models\\{Entity};
use Illuminate\\Support\\Facades\\DB;

class {Entity}Service
{
    public function create(array $data): {Entity}
    {
        return {Entity}::create($data);
    }

    public function getById(int $id): ?{Entity}
    {
        return {Entity}::find($id);
    }

    public function list(int $skip = 0, int $limit = 20): array
    {
        return {Entity}::skip($skip)->take($limit)->get()->toArray();
    }

    public function update(int $id, array $data): ?{Entity}
    {
        $entity = {Entity}::find($id);
        if ($entity) { $entity->update($data); }
        return $entity;
    }

    public function delete(int $id): void
    {
        {Entity}::destroy($id);
    }
}`
      },
      {
        type: 'model', className: '{Entity}',
        description: 'Eloquent Model',
        entityType: 'do',
        template: `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;

class {Entity} extends Model
{
    use HasFactory;

    protected $table = '{TABLE_NAME}';

    protected $fillable = ['name'];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}`
      },
      {
        type: 'middleware', className: '{Entity}Middleware',
        description: 'Laravel Middleware',
        entityType: 'middleware',
        template: `<?php

namespace App\\Http\\Middleware;

use Closure;
use Illuminate\\Http\\Request;

class {Entity}Middleware
{
    public function handle(Request $request, Closure $next)
    {
        // Validation / auth for {entity_comment}
        if (!$request->header('X-Api-Key')) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        return $next($request);
    }
}`
      }
    ],
    extraNaming: [
      { entityType: 'enum', pattern: '{Entity}Enum' },
      { entityType: 'constant', pattern: '{Entity}Constant' },
    ],
    componentPatterns: [
      { name: 'Eloquent Model', regex: 'extends Model' },
      { name: 'Controller', regex: 'extends Controller' },
      { name: 'JsonResponse', regex: 'JsonResponse' },
    ],
  },

  // ======== Kotlin ========
  {
    name: 'kotlin', label: 'Kotlin', extensions: ['.kt', '.kts'], subDir: 'src/main/kotlin',
    fileTypes: [
      {
        type: 'controller', className: '{Entity}Controller',
        description: 'Spring Boot REST Controller (Kotlin)',
        entityType: 'controller',
        template: `package com.{module}.controller

import org.springframework.web.bind.annotation.*
import io.swagger.v3.oas.annotations.tags.Tag
import io.swagger.v3.oas.annotations.Operation

@Tag(name = "{entity_comment}")
@RestController
@RequestMapping("/{module}/{entityKebab}")
class {Entity}Controller(
    private val {entityCamel}Service: {Entity}Service
) {
    @PostMapping("/page")
    @Operation(summary = "分页查询{entity_comment}")
    fun page{Entity}(@RequestBody reqVO: {Entity}PageReqVO) =
        CommonResult.success({entityCamel}Service.page{Entity}(reqVO))

    @PostMapping("/create")
    @Operation(summary = "创建{entity_comment}")
    fun create{Entity}(@Valid @RequestBody reqVO: {Entity}SaveReqVO) =
        CommonResult.success({entityCamel}Service.create{Entity}(reqVO))

    @GetMapping("/get/{id}")
    @Operation(summary = "获取{entity_comment}")
    fun get{Entity}(@PathVariable id: Long) =
        CommonResult.success({entityCamel}Service.get{Entity}(id))

    @DeleteMapping("/delete/{id}")
    @Operation(summary = "删除{entity_comment}")
    fun delete{Entity}(@PathVariable id: Long): CommonResult<Boolean> {
        {entityCamel}Service.delete{Entity}(id)
        return CommonResult.success(true)
    }
}`
      },
      {
        type: 'service_impl', className: '{Entity}ServiceImpl',
        description: 'Service 实现 (Kotlin)',
        entityType: 'service_impl',
        template: `package com.{module}.service.impl

import com.{module}.dal.dataobject.{Entity}DO
import com.{module}.dal.mysql.{Entity}Mapper
import org.springframework.stereotype.Service

@Service
class {Entity}ServiceImpl(
    private val {entityCamel}Mapper: {Entity}Mapper
) : {Entity}Service {

    override fun page{Entity}(reqVO: {Entity}PageReqVO): PageResult<{Entity}RespVO> {
        val page = {entityCamel}Mapper.selectPage(reqVO)
        return PageResult.of(page, {Entity}RespVO::class.java)
    }

    override fun create{Entity}(reqVO: {Entity}SaveReqVO): Long {
        val entity = BeanUtils.toBean(reqVO, {Entity}DO::class.java)
        {entityCamel}Mapper.insert(entity)
        return entity.id
    }

    override fun get{Entity}(id: Long): {Entity}RespVO {
        return BeanUtils.toBean({entityCamel}Mapper.selectById(id), {Entity}RespVO::class.java)
    }

    override fun delete{Entity}(id: Long) {
        {entityCamel}Mapper.deleteById(id)
    }
}`
      },
      {
        type: 'do', className: '{Entity}DO',
        description: 'Data Object (Kotlin)',
        entityType: 'do',
        template: `package com.{module}.dal.dataobject

import com.baomidou.mybatisplus.annotation.TableName
import com.baomidou.mybatisplus.annotation.TableId
import com.baomidou.mybatisplus.annotation.TableField

@TableName("{TABLE_NAME}")
data class {Entity}DO(
    @TableId("ID")
    var id: Long? = null,
    @TableField("NAME")
    var name: String? = null,
) : BaseDO()`
      },
      {
        type: 'mapper', className: '{Entity}Mapper',
        description: 'MyBatis Mapper (Kotlin)',
        entityType: 'mapper',
        template: `package com.{module}.dal.mysql

import org.apache.ibatis.annotations.Mapper

@Mapper
interface {Entity}Mapper : BaseMapperX<{Entity}DO> {
    fun selectPage(reqVO: {Entity}PageReqVO): Page<{Entity}DO> {
        return selectPage(reqVO) { queryWrapper ->
            queryWrapper.orderByDesc({Entity}DO::id)
        }
    }
}`
      }
    ],
    extraNaming: [
      { entityType: 'vo_req', pattern: '{Entity}{Action}ReqVO' },
      { entityType: 'vo_resp', pattern: '{Entity}{Action}RespVO' },
      { entityType: 'enum', pattern: '{Entity}Enum' },
      { entityType: 'constant', pattern: '{Entity}Constant' },
    ],
    componentPatterns: [
      { name: '@RestController', regex: '@RestController' },
      { name: '@Service', regex: '@Service' },
      { name: 'BaseMapperX', regex: 'BaseMapperX<' },
      { name: 'data class', regex: 'data class' },
    ],
  },

  // ======== C ========
  {
    name: 'c', label: 'C', extensions: ['.c', '.h'], subDir: 'src',
    fileTypes: [
      {
        type: 'header', className: '{Entity}',
        description: 'C 头文件 (.h) — 类型定义和函数声明',
        entityType: 'controller',
        template: `#ifndef {ENTITY}_H
#define {ENTITY}_H

#include <stddef.h>
#include <stdint.h>

// {entity_comment} 数据结构
typedef struct {
    int64_t id;
    char name[256];
} {entity_lower}_t;

// CRUD 操作
{entity_lower}_t* {entity_lower}_create(const char* name);
{entity_lower}_t* {entity_lower}_get_by_id(int64_t id);
{entity_lower}_t** {entity_lower}_list(size_t skip, size_t limit, size_t* out_count);
int {entity_lower}_update(int64_t id, const char* name);
int {entity_lower}_delete(int64_t id);

#endif // {ENTITY}_H`
      },
      {
        type: 'source', className: '{Entity}',
        description: 'C 源文件 (.c) — 函数实现',
        entityType: 'service',
        template: `#include "{entity_lower}.h"
#include <stdlib.h>
#include <string.h>

static {entity_lower}_t* alloc_{entity_lower}() {
    return calloc(1, sizeof({entity_lower}_t));
}

{entity_lower}_t* {entity_lower}_create(const char* name) {
    {entity_lower}_t* e = alloc_{entity_lower}();
    if (!e) return NULL;
    e->id = 0;
    strncpy(e->name, name, sizeof(e->name) - 1);
    // TODO: persist to storage
    return e;
}

{entity_lower}_t* {entity_lower}_get_by_id(int64_t id) {
    // TODO: retrieve from storage by id
    {entity_lower}_t* e = alloc_{entity_lower}();
    if (e) e->id = id;
    return e;
}

{entity_lower}_t** {entity_lower}_list(size_t skip, size_t limit, size_t* out_count) {
    *out_count = 0;
    return NULL; // TODO
}

int {entity_lower}_update(int64_t id, const char* name) {
    {entity_lower}_t* e = {entity_lower}_get_by_id(id);
    if (!e) return -1;
    strncpy(e->name, name, sizeof(e->name) - 1);
    free(e);
    return 0;
}

int {entity_lower}_delete(int64_t id) {
    return 0; // TODO
}`
      }
    ],
    extraNaming: [
      { entityType: 'constant', pattern: '{ENTITY}_CONST' },
    ],
    componentPatterns: [
      { name: '#include', regex: '#include\\s*[<"]' },
      { name: 'typedef struct', regex: 'typedef\\s+struct' },
      { name: '#ifndef guard', regex: '#ifndef\\s+\\w+_H' },
    ],
  },

  // ======== C++ ========
  {
    name: 'cpp', label: 'C++', extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.hxx'], subDir: 'src',
    fileTypes: [
      {
        type: 'header', className: '{Entity}',
        description: 'C++ 头文件 (.hpp) — 类声明',
        entityType: 'controller',
        template: `#pragma once

#include <string>
#include <vector>
#include <memory>
#include <cstdint>

namespace {module} {

// {entity_comment}
class {Entity} {
public:
    {Entity}() = default;
    {Entity}(std::string name) : name_(std::move(name)) {}

    int64_t id() const { return id_; }
    void set_id(int64_t id) { id_ = id; }

    const std::string& name() const { return name_; }
    void set_name(std::string name) { name_ = std::move(name); }

private:
    int64_t id_{0};
    std::string name_;
};

class I{Entity}Repository {
public:
    virtual ~I{Entity}Repository() = default;
    virtual std::shared_ptr<{Entity}> create(const std::string& name) = 0;
    virtual std::shared_ptr<{Entity}> getById(int64_t id) = 0;
    virtual std::vector<std::shared_ptr<{Entity}>> list(size_t skip, size_t limit) = 0;
    virtual bool update(int64_t id, const std::string& name) = 0;
    virtual bool remove(int64_t id) = 0;
};

} // namespace {module}`
      },
      {
        type: 'source', className: '{Entity}',
        description: 'C++ 源文件 (.cpp) — 实现',
        entityType: 'service',
        template: `#include "{entity_lower}.hpp"
#include <algorithm>
#include <stdexcept>

namespace {module} {

class {Entity}Repository : public I{Entity}Repository {
    std::vector<std::shared_ptr<{Entity}>> data_;
    int64_t next_id_{1};

public:
    std::shared_ptr<{Entity}> create(const std::string& name) override {
        auto e = std::make_shared<{Entity}>(name);
        e->set_id(next_id_++);
        data_.push_back(e);
        return e;
    }

    std::shared_ptr<{Entity}> getById(int64_t id) override {
        auto it = std::find_if(data_.begin(), data_.end(),
            [id](auto& e) { return e->id() == id; });
        if (it == data_.end()) return nullptr;
        return *it;
    }

    std::vector<std::shared_ptr<{Entity}>> list(size_t skip, size_t limit) override {
        std::vector<std::shared_ptr<{Entity}>> result;
        auto begin = data_.begin() + std::min(skip, data_.size());
        auto end = begin + std::min(limit, size_t(data_.end() - begin));
        std::copy(begin, end, std::back_inserter(result));
        return result;
    }

    bool update(int64_t id, const std::string& name) override {
        auto e = getById(id);
        if (!e) return false;
        e->set_name(name);
        return true;
    }

    bool remove(int64_t id) override {
        auto it = std::find_if(data_.begin(), data_.end(),
            [id](auto& e) { return e->id() == id; });
        if (it == data_.end()) return false;
        data_.erase(it);
        return true;
    }
};

} // namespace {module}`
      }
    ],
    extraNaming: [
      { entityType: 'constant', pattern: '{ENTITY}_CONST' },
      { entityType: 'table', pattern: '{entity_lower}' },
    ],
    componentPatterns: [
      { name: '#pragma once', regex: '#pragma\\s+once' },
      { name: 'namespace', regex: 'namespace\\s+\\w+' },
      { name: 'std::shared_ptr', regex: 'std::shared_ptr<' },
      { name: 'virtual', regex: 'virtual\\s+\\w+' },
    ],
  },

  // ======== Scala ========
  {
    name: 'scala', label: 'Scala', extensions: ['.scala'], subDir: 'src/main/scala',
    fileTypes: [
      {
        type: 'controller', className: '{Entity}Controller',
        description: 'Play/Scala Controller',
        entityType: 'controller',
        template: `package com.{module}.controllers

import play.api.mvc._
import play.api.libs.json._
import com.{module}.services.{Entity}Service
import javax.inject.Inject

class {Entity}Controller @Inject()(
    cc: ControllerComponents,
    service: {Entity}Service
) extends AbstractController(cc) {

  implicit val {entity_lower}Format: OFormat[{Entity}] = Json.format[{Entity}]

  def create() = Action(parse.json) { request =>
    request.body.validate[{Entity}] match {
      case JsSuccess(data, _) =>
        val created = service.create(data)
        Created(Json.toJson(created))
      case JsError(errors) =>
        BadRequest(Json.obj("error" -> JsError.toJson(errors)))
    }
  }

  def getById(id: Long) = Action {
    service.getById(id) match {
      case Some(entity) => Ok(Json.toJson(entity))
      case None => NotFound(Json.obj("error" -> "{Entity} not found"))
    }
  }

  def list(skip: Int, limit: Int) = Action {
    Ok(Json.toJson(service.list(skip, limit)))
  }

  def update(id: Long) = Action(parse.json) { request =>
    request.body.validate[{Entity}] match {
      case JsSuccess(data, _) => Ok(Json.toJson(service.update(id, data)))
      case JsError(errors) => BadRequest(Json.obj("error" -> JsError.toJson(errors)))
    }
  }

  def delete(id: Long) = Action {
    service.delete(id)
    Ok(Json.obj("ok" -> true))
  }
}`
      },
      {
        type: 'service', className: '{Entity}Service',
        description: 'Service 实现 (Scala)',
        entityType: 'service',
        template: `package com.{module}.services

import com.{module}.models.{Entity}
import com.{module}.repositories.{Entity}Repository
import javax.inject.Inject
import scala.concurrent.{Future, ExecutionContext}

class {Entity}Service @Inject()(repo: {Entity}Repository)(implicit ec: ExecutionContext) {

  def create(entity: {Entity}): Future[{Entity}] = repo.insert(entity)

  def getById(id: Long): Future[Option[{Entity}]] = repo.findById(id)

  def list(skip: Int, limit: Int): Future[Seq[{Entity}]] = repo.findAll(skip, limit)

  def update(id: Long, entity: {Entity}): Future[Option[{Entity}]] = repo.update(id, entity)

  def delete(id: Long): Future[Boolean] = repo.delete(id)
}`
      },
      {
        type: 'model', className: '{Entity}',
        description: 'Case Class Model',
        entityType: 'do',
        template: `package com.{module}.models

import java.time.Instant

case class {Entity}(
    id: Option[Long] = None,
    name: String,
    createdAt: Option[Instant] = None,
    updatedAt: Option[Instant] = None
)

object {Entity} {
  import play.api.libs.json._
  implicit val format: OFormat[{Entity}] = Json.format[{Entity}]
}`
      },
      {
        type: 'repository', className: '{Entity}Repository',
        description: 'Repository (Scala)',
        entityType: 'mapper',
        template: `package com.{module}.repositories

import com.{module}.models.{Entity}
import javax.inject.Singleton
import scala.collection.mutable
import scala.concurrent.{Future, ExecutionContext}
import java.util.concurrent.atomic.AtomicLong

@Singleton
class {Entity}Repository(implicit ec: ExecutionContext) {
  private val store = mutable.Map.empty[Long, {Entity}]
  private val nextId = new AtomicLong(1)

  def insert(entity: {Entity}): Future[{Entity}] = Future {
    val id = nextId.getAndIncrement()
    val e = entity.copy(id = Some(id))
    store(id) = e; e
  }

  def findById(id: Long): Future[Option[{Entity}]] = Future { store.get(id) }

  def findAll(skip: Int, limit: Int): Future[Seq[{Entity}]] = Future {
    store.values.toSeq.sortBy(_.id).slice(skip, skip + limit)
  }

  def update(id: Long, entity: {Entity}): Future[Option[{Entity}]] = Future {
    store.get(id).map { e => val u = e.copy(name = entity.name); store(id) = u; u }
  }

  def delete(id: Long): Future[Boolean] = Future { store.remove(id).isDefined }
}`
      }
    ],
    extraNaming: [
      { entityType: 'enum', pattern: '{Entity}Enum' },
      { entityType: 'constant', pattern: '{Entity}Constants' },
    ],
    componentPatterns: [
      { name: 'case class', regex: 'case class' },
      { name: '@Singleton', regex: '@Singleton' },
      { name: '@Inject', regex: '@Inject\\(\\)' },
      { name: 'Future', regex: 'Future\\[' },
    ],
  },

  // ======== Vue ========
  {
    name: 'vue', label: 'Vue', extensions: ['.vue'], subDir: 'src',
    fileTypes: [
      {
        type: 'component', className: '{Entity}',
        description: 'Vue 3 Composition API 组件 (.vue)',
        entityType: 'controller',
        template: `<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { {Entity} } from '@/types/{entity_lower}'
import { {entityCamel}Service } from '@/services/{entity_lower}.service'

const props = defineProps<{ id?: string }>()
const emit = defineEmits<{ update: [{Entity}]; delete: [string] }>()

const items = ref<{Entity}[]>([])
const loading = ref(false)
const selectedId = ref<string | null>(null)

const selectedItem = computed(() =>
  items.value.find(i => i.id === selectedId.value) ?? null
)

async function fetchItems() {
  loading.value = true
  try {
    items.value = await {entityCamel}Service.list()
  } finally {
    loading.value = false
  }
}

async function handleCreate(data: Omit<{Entity}, 'id'>) {
  const created = await {entityCamel}Service.create(data)
  items.value.push(created)
}

async function handleUpdate(id: string, data: Partial<{Entity}>) {
  const updated = await {entityCamel}Service.update(id, data)
  const idx = items.value.findIndex(i => i.id === id)
  if (idx !== -1) items.value[idx] = updated
}

async function handleDelete(id: string) {
  await {entityCamel}Service.delete(id)
  items.value = items.value.filter(i => i.id !== id)
}

onMounted(fetchItems)

defineExpose({ items, loading, selectedItem, handleCreate, handleUpdate, handleDelete })
</script>

<template>
  <div class="{entityKebab}-component">
    <h2>{entity_comment}管理</h2>
    <div v-if="loading">加载中...</div>
    <ul v-else>
      <li v-for="item in items" :key="item.id" @click="selectedId = item.id">
        {{ item.name }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.{entityKebab}-component {
  padding: 1rem;
}
</style>`
      },
      {
        type: 'composable', className: 'use{Entity}',
        description: 'Vue Composable (组合式函数)',
        entityType: 'service',
        template: `import { ref, computed } from 'vue'
import type { {Entity} } from '@/types/{entity_lower}'

export function use{Entity}() {
  const items = ref<{Entity}[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const count = computed(() => items.value.length)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const response = await fetch('/api/{entityKebab}')
      items.value = await response.json()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  async function create(data: Omit<{Entity}, 'id'>) {
    const response = await fetch('/api/{entityKebab}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const created = await response.json()
    items.value.push(created)
    return created
  }

  async function remove(id: string) {
    await fetch('/api/{entityKebab}/$\{id}', { method: 'DELETE' })
    items.value = items.value.filter(i => i.id !== id)
  }

  return { items, loading, error, count, fetchAll, create, remove }
}`
      },
      {
        type: 'store', className: '{Entity}Store',
        description: 'Pinia Store — 状态管理',
        entityType: 'do',
        template: `import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { {Entity} } from '@/types/{entity_lower}'

export const use{Entity}Store = defineStore('{entityCamel}', () => {
  const items = ref<{Entity}[]>([])
  const loading = ref(false)

  const all = computed(() => items.value)
  const getById = (id: string) => items.value.find(i => i.id === id)

  async function fetchAll() {
    loading.value = true
    try {
      const res = await fetch('/api/{entityKebab}')
      items.value = await res.json()
    } finally {
      loading.value = false
    }
  }

  async function add(item: {Entity}) {
    items.value.push(item)
  }

  async function remove(id: string) {
    items.value = items.value.filter(i => i.id !== id)
  }

  return { items, loading, all, getById, fetchAll, add, remove }
})`
      },
      {
        type: 'page', className: '{Entity}Page',
        description: 'Vue Page — 路由页面',
        entityType: 'controller',
        template: `<script setup lang="ts">
import {Entity}Component from '@/components/{Entity}Component.vue'
import { use{Entity}Store } from '@/stores/{entity_lower}.store'

const store = use{Entity}Store()
store.fetchAll()
</script>

<template>
  <{Entity}Component
    :items="store.items"
    @create="store.add"
    @delete="store.remove"
  />
</template>`
      }
    ],
    extraNaming: [
      { entityType: 'constant', pattern: '{ENTITY}_CONST' },
    ],
    componentPatterns: [
      { name: '<script setup>', regex: '<script\\s+setup' },
      { name: 'defineStore', regex: 'defineStore\\(' },
      { name: 'composable', regex: 'export\\s+function\\s+use' },
      { name: 'ref/reactive', regex: '\\bref\\b.*=|\\breactive\\b.*=' },
    ],
  },

  // ======== XML ========
  {
    name: 'xml', label: 'XML', extensions: ['.xml'], subDir: 'src/main/resources',
    fileTypes: [
      {
        type: 'mapper', className: '{Entity}Mapper.xml',
        description: 'MyBatis Mapper XML — SQL 映射文件，包含 resultMap / select / insert / update / delete',
        entityType: 'mapper',
        template: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.{module}.dal.mysql.{Entity}Mapper">

    <resultMap id="BaseResultMap" type="com.{module}.dal.dataobject.{Entity}DO">
        <id column="ID" property="id"/>
        <result column="NAME" property="name"/>
        <result column="CREATE_TIME" property="createTime"/>
        <result column="UPDATE_TIME" property="updateTime"/>
    </resultMap>

    <sql id="Base_Column_List">
        ID, NAME, CREATE_TIME, UPDATE_TIME
    </sql>

    <select id="selectPage" resultMap="BaseResultMap">
        SELECT <include refid="Base_Column_List"/>
        FROM {TABLE_NAME}
        <where>
            <if test="reqVO.name != null and reqVO.name != ''">
                AND NAME LIKE CONCAT('%', #{reqVO.name}, '%')
            </if>
        </where>
        ORDER BY ID DESC
    </select>

    <select id="selectById" resultMap="BaseResultMap">
        SELECT <include refid="Base_Column_List"/>
        FROM {TABLE_NAME}
        WHERE ID = #{id}
    </select>

    <insert id="insert" useGeneratedKeys="true" keyProperty="id">
        INSERT INTO {TABLE_NAME} (NAME, CREATE_TIME, UPDATE_TIME)
        VALUES (#{name}, NOW(), NOW())
    </insert>

    <update id="updateById">
        UPDATE {TABLE_NAME}
        <set>
            <if test="name != null and name != ''">NAME = #{name},</if>
            UPDATE_TIME = NOW()
        </set>
        WHERE ID = #{id}
    </update>

    <delete id="deleteById">
        DELETE FROM {TABLE_NAME} WHERE ID = #{id}
    </delete>

</mapper>`
      },
      {
        type: 'config', className: '{entityKebab}-config.xml',
        description: 'Spring XML 配置 — Bean / Property / Context 定义',
        entityType: 'config',
        template: `<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xsi:schemaLocation="http://www.springframework.org/schema/beans
       http://www.springframework.org/schema/beans/spring-beans.xsd">

    <!-- {entity_comment} 配置 -->
    <bean id="{entityCamel}Config" class="com.{module}.config.{Entity}Config">
        <property name="enabled" value="true"/>
    </bean>

</beans>`
      }
    ],
    extraNaming: [
      { entityType: 'mapper_xml', pattern: '{Entity}Mapper.xml' },
      { entityType: 'config_xml', pattern: '{entityKebab}-config.xml' },
    ],
    componentPatterns: [
      { name: '<mapper namespace>', regex: '<mapper\\s+namespace=' },
      { name: '<resultMap>', regex: '<resultMap\\s+' },
      { name: '<select>', regex: '<select\\s+' },
      { name: '<insert>', regex: '<insert\\s+' },
      { name: '<update>', regex: '<update\\s+' },
      { name: '<delete>', regex: '<delete\\s+' },
      { name: '<sql>', regex: '<sql\\s+id=' },
      { name: '<include>', regex: '<include\\s+refid=' },
      { name: '<if test>', regex: '<if\\s+test=' },
      { name: '<beans>', regex: '<beans\\s+' },
    ],
  },
];

export default LANGUAGES;

// Utility: get language by name
export function getLanguage(name: string): LanguageDef | undefined {
  return LANGUAGES.find(l => l.name === name);
}

// Utility: get language by file extension
export function getLanguageByExtension(ext: string): LanguageDef | undefined {
  return LANGUAGES.find(l => l.extensions.includes(ext));
}

// Utility: detect language from file path
export function detectLanguage(filePath: string): string | null {
  const ext = '.' + filePath.split('.').pop()?.toLowerCase();
  // Handle special cases
  if (ext === '.tsx' || ext === '.ts') return 'typescript';
  if (ext === '.jsx' || ext === '.js' || ext === '.mjs' || ext === '.cjs') return 'javascript';
  if (ext === '.hpp' || ext === '.hxx' || ext === '.cpp' || ext === '.cc' || ext === '.cxx') return 'cpp';
  if (ext === '.h') return 'c';  // .h files default to C
  if (ext === '.kts' || ext === '.kt') return 'kotlin';
  if (ext === '.xml') return 'xml';
  const lang = getLanguageByExtension(ext);
  return lang ? lang.name : null;
}

// Get file extension for a language
export function getFileExtension(language: string): string {
  const lang = getLanguage(language);
  return lang?.extensions[0] ?? '.' + language;
}

// Get all supported language names
export function getAllLanguageNames(): string[] {
  return LANGUAGES.map(l => l.name);
}

// Get file types for a language
export function getFileTypes(language: string): LanguageFileType[] {
  return getLanguage(language)?.fileTypes ?? [];
}

// Compatible with BuiltinTemplate from schema
export interface BuiltinTemplateLike {
  language: string;
  type: string;
  templateName: string;
  description: string;
  templateContent: string;
  namingRules: string;
  commonImports: string;
  fileExtension: string;
}

// Generate BuiltinTemplate entries for languages NOT already hardcoded in schema.ts
// (java, python, typescript, go, r are handled by the detailed builtins)
export function getExtraBuiltinTemplates(): BuiltinTemplateLike[] {
  const exclude = new Set(['java', 'python', 'typescript', 'go', 'r']);
  const templates: BuiltinTemplateLike[] = [];
  for (const lang of LANGUAGES) {
    if (exclude.has(lang.name)) continue;
    for (const ft of lang.fileTypes) {
      templates.push({
        language: lang.name,
        type: ft.type,
        templateName: ft.className.replace(/\{Entity\}/g, 'Entity').replace(/\{entityCamel\}/g, 'entity').replace(/\{entity_lower\}/g, 'entity').replace(/\{entityKebab\}/g, 'entity'),
        description: ft.description,
        templateContent: ft.template,
        namingRules: JSON.stringify({ className: ft.className, entityType: ft.entityType }),
        commonImports: JSON.stringify([]),
        fileExtension: lang.extensions[0],
      });
    }
  }
  return templates;
}

// Get target class name for a given type and entity
export function getTargetClassName(type: string, entityName: string, language: string = 'java'): string {
  const lang = getLanguage(language);
  if (!lang) return entityName;
  const ft = lang.fileTypes.find(f => f.type === type);
  if (ft) {
    return ft.className
      .replace('{Entity}', entityName)
      .replace('{entity_lower}', entityName.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase())
      .replace('{entityCamel}', entityName.charAt(0).toLowerCase() + entityName.slice(1))
      .replace('{entityKebab}', entityName.replace(/([A-Z])/g, '-$1').replace(/^-/, '').toLowerCase())
      .replace('{module}', 'module');
  }
  return entityName;
}
