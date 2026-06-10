import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import {
  getTemplate,
  getComponentUsage,
  getModuleStructure,
  getNamingConvention,
  getAnnotationPattern,
  searchConventions,
  getSupportedLanguages,
} from './tools';
import { getLanguage, getAllLanguageNames, LANGUAGES } from '../languages/registry';
import type { LanguageDef } from '../languages/registry';

const ALL_LANGUAGE_NAMES = getAllLanguageNames();
const LANG_ENUM = ALL_LANGUAGE_NAMES as [string, ...string[]];

// Build dynamic type descriptions from the registry
function buildTypeDesc(): string {
  const parts: string[] = [];
  for (const lang of LANGUAGES) {
    const types = lang.fileTypes.map(ft => ft.type);
    parts.push(`${lang.name}: ${types.join('|')}`);
  }
  return '文件类型（常见内置类型如下，项目中实际存在的所有类型均支持，如 util, enum, constant, converter, filter, config 等): ' + parts.join(', ');
}

function buildEntityTypeDesc(): string {
  const all = new Set<string>();
  for (const lang of LANGUAGES) {
    for (const ft of lang.fileTypes) all.add(ft.entityType);
    for (const en of lang.extraNaming) all.add(en.entityType);
  }
  const types = [...all].slice(0, 12).join('|');
  return '实体类型（' + types + ' 等，项目中实际索引的所有类型均支持）';
}

function resolveDbPath(): string {
  if (process.env.CODETEMPLATE_DB_PATH) return process.env.CODETEMPLATE_DB_PATH;
  // Search from CWD upward (covers Claude Code session CWD)
  const searchPaths = [process.cwd()];
  // Also search from script location (covers MCP launcher using different CWD)
  try {
    searchPaths.push(path.dirname(__filename));
  } catch {}
  for (const start of searchPaths) {
    let current = start;
    for (let i = 0; i < 10; i++) {
      const dbPath = path.join(current, '.codetemplate', 'codeTemplate.db');
      if (fs.existsSync(dbPath)) return dbPath;
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  return path.join(process.cwd(), '.codetemplate', 'codeTemplate.db');
}

function validateDb(dbPath: string): void {
  if (!fs.existsSync(dbPath)) {
    console.error(`[codeTemplate] 数据库未找到: ${dbPath}`);
    console.error('[codeTemplate] 请先运行: codeTemplate init && codeTemplate index');
    process.exit(1);
  }
}

const SERVER_INSTRUCTIONS = `# CodeTemplate — 项目代码规范知识库

CodeTemplate 已索引当前项目的所有源代码，存储了代码模板、命名约定、目录结构、注解/装饰器模式、框架 API 用法、各类文件的编写规范等全部代码相关知识。覆盖 14 种编程语言。

## 强制触发条件

以下场景 **必须首先** 调用 codeTemplate 工具，**禁止** 跳过 codeTemplate 直接搜索文件或凭通用知识回答:

1. **创建或生成任何代码文件** → \`codeTemplate_get_template\`（含完整注解、import、方法骨架）
2. **查看某类文件的编写规范/写法/约定** (如 "VO怎么写"、"Controller规范"、"异常处理规范") → \`codeTemplate_get_template\` 或 \`codeTemplate_search_conventions\`
3. **命名任何代码元素** (类名/方法名/包名/表名/字段名) → \`codeTemplate_get_naming_convention\`
4. **查询框架 API / 组件用法** (如 "BeanUtils.toBean怎么用"、"CommonResult怎么写") → \`codeTemplate_get_component_usage\`
5. **涉及项目目录结构/模块组织** → \`codeTemplate_get_module_structure\`
6. **查询注解/装饰器/import 规范** → \`codeTemplate_get_annotation_pattern\`
7. **搜索项目中的代码模式/规范** (如 "分页怎么写"、"事务怎么处理") → \`codeTemplate_search_conventions\`

## 核心原则

- **项目规范优先于通用知识**: CodeTemplate 已索引项目源码，知道项目实际的类名模式、注解使用、目录组织。即使你知道框架的通用写法，也必须先查项目实际规范
- **“查看规范/了解写法/查询约定” = 必须用 codeTemplate**: 这类问题不应通过搜索文件或子代理查找，codeTemplate 已提取并整理好规范信息
- **codeTemplate 是代码规范的第一数据源**: 不要绕过它直接去读文件、搜索文件或启动 Explore 子代理来找代码规范

## 工具选择

- **创建代码 / 查看某类文件的完整模板** → codeTemplate_get_template
- **命名规范 / 命名约定** → codeTemplate_get_naming_convention
- **目录结构 / 模块组织** → codeTemplate_get_module_structure
- **框架 API / 组件用法** → codeTemplate_get_component_usage
- **注解 / 装饰器 / import** → codeTemplate_get_annotation_pattern
- **搜索代码模式 / 查规范 / 搜索写法** → codeTemplate_search_conventions
- **支持的语言和文件类型** → codeTemplate_list_languages

## 常见场景映射

- "帮我创建一个 Controller" → get_template(type="controller", ...)
- "VO类的编写规范" → get_template(type="vo_req") + get_naming_convention(entity_type="vo_req")
- "XXX怎么命名" → get_naming_convention
- "BeanUtils.toBean怎么用" → get_component_usage(component="BeanUtils.toBean")
- "分页怎么写" → search_conventions(query="分页")
- "项目的目录结构" → get_module_structure
- "Controller需要哪些注解" → get_annotation_pattern(file_type="controller")`;

export async function startMcpServer(): Promise<void> {
  const dbPath = resolveDbPath();
  validateDb(dbPath);
  console.error(`[codeTemplate] MCP server starting, db: ${dbPath}`);

  const server = new McpServer(
    { name: 'codeTemplate', version: '1.0.0' },
    { instructions: SERVER_INSTRUCTIONS }
  );

  server.registerTool(
    'codeTemplate_get_template',
    {
      description: `获取指定语言和类型的完整代码模板。注意: 文件类型不限于内置类型，项目中实际存在的所有类型（如 util, enum, constant, converter, filter 等）均支持，取决于 codeTemplate index 的索引结果。参数: type (文件类型，必填，如 controller, util, enum, vo_req 等), entity_name (实体名如 VptModel，必填), module (模块名如 vmp，必填), language (语言，可选，默认 java)。返回: 完整代码模板含 package / import / 注解 / 类体 / 方法骨架。`,
      inputSchema: {
        type: z.string().describe(buildTypeDesc()),
        entity_name: z.string().describe('实体名，如 VptModel'),
        module: z.string().describe('模块名，如 vmp'),
        language: z.enum(LANG_ENUM).default('java').describe('代码语言，默认 java'),
      },
    },
    async ({ type, entity_name, module, language }) => {
      const result = getTemplate(dbPath, type, entity_name, module, language);
      return { content: [{ type: 'text' as const, text: result }] };
    }
  );

  server.registerTool(
    'codeTemplate_get_component_usage',
    {
      description: `获取框架组件/API 的使用方法和代码示例。触发场景: 使用 BeanUtils.toBean / PageResult / CommonResult.success / LambdaQueryWrapperX / exception 等框架 API 前。参数: component (组件名如 BeanUtils.toBean，必填)。返回: 使用模式、代码片段含上下文、用法频次、关联组件列表。`,
      inputSchema: { component: z.string().describe('组件名，如 BeanUtils.toBean') },
    },
    async ({ component }) => {
      const result = getComponentUsage(dbPath, component);
      return { content: [{ type: 'text' as const, text: result }] };
    }
  );

  server.registerTool(
    'codeTemplate_get_module_structure',
    {
      description: `获取模块的标准目录结构模板。触发场景: 新建模块或不确定文件放哪里时。参数: module (模块名，必填), include_examples (是否含示例文件路径，可选，默认 false)。返回: 完整目录树、每层职责说明、代表性文件列表。`,
      inputSchema: {
        module: z.string().describe('模块名，如 vmp'),
        include_examples: z.boolean().default(false).describe('是否包含示例文件路径'),
      },
    },
    async ({ module, include_examples }) => {
      const result = getModuleStructure(dbPath, module, include_examples);
      return { content: [{ type: 'text' as const, text: result }] };
    }
  );

  server.registerTool(
    'codeTemplate_get_naming_convention',
    {
      description: `获取命名约定和实际示例。触发场景: 命名新类/表/包前。支持多语言。参数: entity_type (实体类型，必填), entity_name (可选，提供则生成具体命名建议), language (语言，可选，默认 java)。返回: 命名模式、项目中的命名示例、生成的命名建议。`,
      inputSchema: {
        entity_type: z.string().describe(buildEntityTypeDesc()),
        entity_name: z.string().optional().describe('可选：业务实体名，如 VptModel'),
        language: z.enum(LANG_ENUM).default('java').describe('代码语言，默认 java'),
      },
    },
    async ({ entity_type, entity_name, language }) => {
      const result = getNamingConvention(dbPath, entity_type, entity_name, language);
      return { content: [{ type: 'text' as const, text: result }] };
    }
  );

  server.registerTool(
    'codeTemplate_get_annotation_pattern',
    {
      description: `获取特定文件类型需要的标准注解集合及各自对应的 import 路径。触发场景: 快速确认某类文件需要哪些注解时。参数: file_type (文件类型，必填)。返回: 必选注解列表+import 路径、可选注解列表+import 路径。`,
      inputSchema: { file_type: z.string().describe(buildTypeDesc()) },
    },
    async ({ file_type }) => {
      const result = getAnnotationPattern(dbPath, file_type);
      return { content: [{ type: 'text' as const, text: result }] };
    }
  );

  server.registerTool(
    'codeTemplate_search_conventions',
    {
      description: `在代码模板和组件用法中模糊搜索。触发场景: 不确定具体 API 名称，想搜索"怎么做分页/事务/校验"时。参数: query (搜索关键词，必填), file_type (可选，限定文件类型)。返回: 匹配的模板文件、组件用法、命名约定，含匹配片段。`,
      inputSchema: {
        query: z.string().describe('搜索关键词，如 分页'),
        file_type: z.string().optional().describe('可选：限定文件类型'),
      },
    },
    async ({ query, file_type }) => {
      const result = searchConventions(dbPath, query, file_type);
      return { content: [{ type: 'text' as const, text: result }] };
    }
  );

  // New tool: list supported languages
  server.registerTool(
    'codeTemplate_list_languages',
    {
      description: `列出所有支持的代码生成语言及其文件扩展名和类型。触发场景: 不确定支持哪些语言时。参数: 无。返回: 所有支持语言的列表，包含支持的文件类型和文件扩展名。`,
      inputSchema: {},
    },
    async () => {
      const allLangs = getAllLanguageNames();
      const langInfo = allLangs.map((name: string) => {
        const lang = getLanguage(name);
        if (!lang) return `## ${name}\n- 语言数据缺失`;
        const ext = lang.extensions[0];
        const types = lang.fileTypes.map(ft => ft.type);
        return `## ${lang.label} (${lang.name})\n- 文件扩展名: \`${ext}\`\n- 支持的类型: ${types.join(', ')}`;
      });
      const result = `# CodeTemplate 支持的语言\n\n当前支持 **${allLangs.length}** 种语言:\n\n${langInfo.join('\n\n')}\n\n使用 \`codeTemplate_get_template\` 工具并指定 \`language\` 参数生成对应语言的代码模板。`;
      return { content: [{ type: 'text' as const, text: result }] };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
