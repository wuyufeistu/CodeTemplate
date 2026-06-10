# codetemplate-mcp

代码规范知识库 — 为 AI Agent 提供项目代码模板、组件用法和命名约定查询，支持 **13 种编程语言**，可作为 MCP Server 集成到 Claude Code 等 AI 工具中。

---

## 前提

- **Node.js >= 18**
- 项目中已有代码文件（至少一个模块），CodeTemplate 通过扫描源码自动学习项目规范
- 如果项目使用 Java / Spring Boot / MyBatis Plus 等框架，效果最佳（内置模板更贴合项目风格）

## 使用场景

当你需要 AI 帮你写代码时，最常见的问题是 AI 不了解你项目的**具体规范**：

- 不知道某个文件类型的写法 — Java 的 Controller、Python 的 Router、Go 的 Handler，各有不同
- 不知道文件该放在哪个包/目录 — 每种语言有不同的目录结构约定
- 不知道命名风格 — `VptModelDO` 还是 `VptModelEntity`？camelCase 还是 snake_case？
- 不知道项目中框架 API 怎么用 — `BeanUtils.toBean`、`Depends()`、`gin.Context`？

**CodeTemplate 解决这些问题**：先扫描你的项目学习规范，然后 AI 通过 MCP 工具查询，生成的代码自动符合项目风格。每种语言有自己的一套文件类型（由语言注册表动态生成，而非硬编码），确保生成的模板贴合对应语言生态。

典型场景：

| 场景 | 使用工具 | 效果 |
|------|----------|------|
| 新建文件（任意语言） | `codeTemplate_get_template` | 生成包含注解/装饰器、方法骨架的完整代码 |
| 不确定文件放哪个目录 | `codeTemplate_get_module_structure` | 返回项目的目录层级结构 |
| 命名新类/函数/表 | `codeTemplate_get_naming_convention` | 给出项目中已有的命名模式和示例 |
| 使用框架 API 不确定参数 | `codeTemplate_get_component_usage` | 返回项目中的实际用法代码片段 |
| 搜索某个技术点 | `codeTemplate_search_conventions` | 在模板和组件中模糊搜索 |
| 查看某语言支持哪些文件类型 | `codeTemplate_list_languages` | 列出所有语言及对应的文件类型 |

## 使用步骤

### 1. 安装

```bash
npm install -g codetemplate-mcp
```

### 2. 初始化并扫描项目

在项目根目录执行：

```bash
cd /your-project
codetemplate init          # 创建数据库
codetemplate index         # 扫描所有模块，构建知识库
codetemplate status        # 查看扫描结果
```

status 输出示例：

```
CodeTemplate 状态
──────────────────────────────────────────────────
  file_templates: 1227 行      # 从项目提取的代码模板
  builtin_templates: 52 行     # 13 种语言的内置模板
  component_usages: 58 行      # 框架组件使用方式
  naming_conventions: 53 行    # 命名约定
  annotation_patterns: 39 行   # 注解模式
  module_structures: 7 行      # 模块目录结构

模板类型分布:
  vo_req: 382
  vo_resp: 216
  controller: 214
  mapper: 207
  do: 182

语言分布 (内置模板):
  java (builtin): 4 行
  python (builtin): 4 行
  typescript (builtin): 4 行
  go (builtin): 4 行
  rust (builtin): 4 行
  ...
```

### 3. 配置 Claude Code MCP

**全局安装**（推荐，所有项目共用）：

```bash
claude mcp add -s user codeTemplate -- npx -y codetemplate-mcp serve --mcp
```

**当前项目安装**（仅当前项目可用）：

```bash
claude mcp add codeTemplate -- npx -y codetemplate-mcp serve --mcp
```

> 区别：`-s user` 将配置写入 `~/.claude.json` 全局生效，不加则默认写入项目级配置，仅当前目录项目可用。

CodeTemplate 会自动从当前工作目录向上查找 `.codetemplate/codeTemplate.db`，无需额外配置。

重启 Claude Code 后，`/mcp` 中即可看到 codeTemplate 的 7 个工具。

### 4. 后续维护

项目代码变更后，运行增量同步：

```bash
codetemplate sync
```

## MCP 工具一览

| 工具 | 说明 | 关键参数 |
|------|------|----------|
| `codeTemplate_get_template` | 获取完整代码模板 | type（依语言而定）, entity_name, module, language |
| `codeTemplate_get_component_usage` | 查询组件/API 用法 | component |
| `codeTemplate_get_module_structure` | 查看模块目录结构 | module |
| `codeTemplate_get_naming_convention` | 获取命名约定 | entity_type（依语言而定）, entity_name, language |
| `codeTemplate_get_annotation_pattern` | 获取注解/装饰器和 import | file_type（依语言而定） |
| `codeTemplate_search_conventions` | 模糊搜索 | query |
| `codeTemplate_list_languages` | 列出所有语言及支持的文件类型 | 无 |

> **注意**: `type`、`entity_type`、`file_type` 参数的具体取值取决于所选语言。例如 Java 支持 `controller | service_impl | mapper | do`，而 Python 支持 `router | service | schema | model`。使用 `codeTemplate_list_languages` 查看每种语言的完整支持列表。

## 示例

### 示例 1: 生成 Spring Boot Controller (Java)

在 Claude Code 中说：

> "帮我创建一个 VptModelController，模块是 vmp"

AI 会调用 `codeTemplate_get_template(type="controller", entity_name="VptModel", module="vmp")`，获取到如下模板：

```java
@Tag(name = "管理后台 - VptModel管理")
@RestController
@RequestMapping("/vmp/vpt-model")
@RequiredArgsConstructor
@Slf4j
public class VptModelController {

    private final VptModelService vptModelService;

    @PostMapping("/page")
    @Operation(summary = "分页查询VptModel管理")
    public CommonResult<PageResult<VptModelRespVO>> pageVptModel(@RequestBody VptModelPageReqVO reqVO) {
        return CommonResult.success(vptModelService.pageVptModel(reqVO));
    }

    @PostMapping("/create")
    @Operation(summary = "创建VptModel管理")
    public CommonResult<Long> createVptModel(@Valid @RequestBody VptModelSaveReqVO reqVO) {
        return CommonResult.success(vptModelService.createVptModel(reqVO));
    }
    // ... 含 update / delete / get 完整方法
}
```

### 示例 2: 生成 Python FastAPI Router

指定 language 参数即可切换语言：

```
language="python", type="router", entity_name="User"
```

生成结果：

```python
from fastapi import APIRouter, Depends
from app.services.user_service import UserService
from app.schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/user", tags=["User管理"])

@router.post("/", response_model=UserResponse)
async def create_user(data: UserCreate, service: UserService = Depends()):
    return await service.create(data)

@router.get("/{id}", response_model=UserResponse)
async def get_user(id: int, service: UserService = Depends()):
    return await service.get_by_id(id)
```

### 示例 3: 生成 Go Gin Handler

```
language="go", type="handler", entity_name="User"
```

### 示例 4: 查询组件用法

在 Claude Code 中说：

> "项目中 BeanUtils.toBean 怎么用的？"

AI 调用 `codeTemplate_get_component_usage(component="BeanUtils.toBean")`，返回你在项目中的实际用法片段。

### 示例 5: 新建模块时查看目录结构

> "vmp 模块的目录结构是什么样的？"

AI 调用 `codeTemplate_get_module_structure(module="vmp")`，返回完整的包层级结构。

## 模板占位符

模板中以下占位符会自动替换：

| 占位符 | 说明 | 输入 `VptModel` 时输出 |
|--------|------|----------------------|
| `{Entity}` | PascalCase | `VptModel` |
| `{entityCamel}` | camelCase | `vptModel` |
| `{entity_lower}` | snake_case | `vpt_model` |
| `{entityKebab}` | kebab-case | `vpt-model` |
| `{ENTITY}` | UPPER_SNAKE | `VPT_MODEL` |
| `{entityLower}` | 全小写 | `vptmodel` |
| `{module}` | 模块名 | `vmp` |
| `{MODULE}` | 模块名大写 | `VMP` |
| `{TABLE_NAME}` | 表名 | `VMP_VPT_MODEL` |
| `{entity_comment}` | 中文注释 | `VptModel管理` |

## CLI 命令参考

```bash
codetemplate init                  # 初始化数据库
codetemplate index                 # 扫描当前工作目录，构建知识库
codetemplate index -f              # 强制全量重建
codetemplate index -m <path>       # 指定要扫描的目录路径
codetemplate sync                  # 增量同步（扫描当前工作目录的变更）
codetemplate sync -m <path>        # 指定目录增量同步
codetemplate status                # 显示统计信息
codetemplate version               # 显示版本号
codetemplate update                # 从 npm 更新到最新版本
codetemplate serve --mcp           # 启动 MCP Server
codetemplate -h                    # 帮助
```

> **注意**: `index` 和 `sync` 默认扫描当前工作目录下所有支持的文件类型（不限于 `ctff-module-*` 模块），支持 14 种编程语言的文件扩展名。

## 支持的语言

| 语言 | 扩展名 | 模板类型 |
|------|--------|----------|
| Java | `.java` | controller, service_impl, mapper, do |
| Python | `.py` | router, service, schema, model |
| TypeScript | `.ts` | controller, service, dto, entity |
| JavaScript | `.js` | controller, service, model, middleware |
| Go | `.go` | handler, service, model, repository |
| Rust | `.rs` | handler, service, model, middleware |
| C# | `.cs` | controller, service, entity, dto |
| PHP | `.php` | controller, service, model, middleware |
| Kotlin | `.kt` | controller, service_impl, do, mapper |
| C | `.c/.h` | header, source |
| C++ | `.cpp/.hpp` | header, source |
| Scala | `.scala` | controller, service, model, repository |
| Vue | `.vue` | component, composable, store, page |
| XML | `.xml` | mapper, config |

每种语言的模板类型由语言注册表（registry）动态定义，确保代码风格符合对应语言生态的惯例。使用 `codeTemplate_list_languages` 可查看最新支持情况。

## License

MIT
