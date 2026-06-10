import { getReadonlyConnection, getBuiltinTemplate } from '../db/schema';
import { getTargetClassName as registryGetTargetClassName, getFileExtension as registryGetFileExtension, getAllLanguageNames, detectLanguage } from '../languages/registry';

function escapeLike(s: string): string {
  return s.replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Fill entity placeholders in a template string based on language naming conventions.
 * Supported placeholders:
 *   {Entity}         - PascalCase (VptModel)
 *   {entityLower}    - lowercase (vptmodel)
 *   {entity_lower}   - snake_case (vpt_model)
 *   {entityCamel}    - camelCase (vptModel)
 *   {entityKebab}    - kebab-case (vpt-model)
 *   {entity_comment} - Chinese comment placeholder (use Entity name)
 *   {module}         - module name (from parameter)
 *   {TABLE_PREFIX}   - table prefix (default VMP_)
 *   {TABLE_NAME}     - table name derived from entity
 *   {MODULE_PREFIX}  - module prefix
 *   {ENTITY}         - ALL CAPS (VPT_MODEL)
 */
function fillEntityPlaceholders(content: string, entityName: string, module: string = 'module'): string {
  // Convert entity name to different cases
  const entityUpper = entityName; // PascalCase input
  const entityLower = entityName.toLowerCase();
  const entitySnake = entityName.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase();
  const entityCamel = entityName.charAt(0).toLowerCase() + entityName.slice(1);
  const entityKebab = entitySnake.replace(/_/g, '-');
  const entityAllCaps = entitySnake.toUpperCase();
  const moduleLower = module.toLowerCase();
  const moduleUpper = module.toUpperCase();

  let result = content;
  result = result.replace(/\{Entity\}/g, entityName);
  result = result.replace(/\{entityLower\}/g, entityLower);
  result = result.replace(/\{entity_lower\}/g, entitySnake);
  result = result.replace(/\{entityCamel\}/g, entityCamel);
  result = result.replace(/\{entityKebab\}/g, entityKebab);
  result = result.replace(/\{entity_comment\}/g, entityUpper + '管理');
  result = result.replace(/\{module\}/g, moduleLower);
  result = result.replace(/\{MODULE\}/g, moduleUpper);
  result = result.replace(/\{TABLE_PREFIX\}/g, moduleUpper + '_');
  result = result.replace(/\{TABLE_NAME\}/g, moduleUpper + '_' + entityAllCaps);
  result = result.replace(/\{MODULE_PREFIX\}/g, moduleUpper);
  result = result.replace(/\{ENTITY\}/g, entityAllCaps);
  result = result.replace(/\{TABLE_PREFIX\}_\{TABLE_NAME\}/g, moduleUpper + '_' + entityAllCaps);
  return result;
}

export function getTemplate(dbPath: string, type: string, entityName: string, module: string, language: string = 'java'): string {
  const db = getReadonlyConnection(dbPath);

  // Try to find project-specific template for the given language
  const row = db.prepare(
    `SELECT * FROM file_templates WHERE type = ? AND module LIKE ? ESCAPE '\\' AND language = ? ORDER BY representativeness DESC LIMIT 1`
  ).get(type, `%${escapeLike(module)}%`, language) as any;

  if (row) {
    db.close();
    const lines: string[] = [];
    let replaced = false;
    for (const line of row.source_content.split('\n')) {
      if (!replaced && line.includes('class ' + row.class_name)) {
        lines.push(line.replace(row.class_name, registryGetTargetClassName(row.type, entityName, language)));
        replaced = true;
      } else {
        lines.push(line);
      }
    }
    const code = lines.join('\n');
    return `# ${type} 代码模板 — 参考 ${row.file_path}\n\n**实体名**: ${entityName}\n**目标类名**: ${registryGetTargetClassName(row.type, entityName, language)}\n**模块**: ${module}\n**语言**: ${language}\n**模板来源**: ${row.file_path}\n\n\`\`\`${getFileExtension(language)}\n${code}\n\`\`\``;
  }

  // Fall back to builtin template
  const builtin = getBuiltinTemplate(db, language, type);
  db.close();

  if (builtin) {
    const filled = fillEntityPlaceholders(builtin.templateContent, entityName, module);
    return `# ${type} 代码模板 (${language}) — 内置模板\n\n**实体名**: ${entityName}\n**目标类名**: ${registryGetTargetClassName(type, entityName, language)}\n**模块**: ${module}\n**语言**: ${language}\n**模板来源**: 内置模板 (${builtin.templateName})\n\n\`\`\`${builtin.fileExtension}\n${filled}\n\`\`\``;
  }

  // Last resort: annotation pattern fallback (Java only)
  if (language === 'java') {
    const db2 = getReadonlyConnection(dbPath);
    const annoRow = db2.prepare('SELECT * FROM annotation_patterns WHERE file_type = ?').get(type) as any;
    db2.close();
    if (annoRow) {
      const annos = JSON.parse(annoRow.annotations);
      return `# ${type} 通用模板（无匹配的 ${entityName} 示例）\n\n// 标准注解:\n${annos.map((a: string) => `//   ${a}`).join('\n')}\n// 请参考项目中已有的 ${type} 文件获取完整模板`;
    }
  }

  return `# ${type} 模板未找到 (${language})\n\n项目中未找到类型为 "${type}" 的 ${language} 文件模板。\n\n可能原因:\n1. 项目中不存在该类型文件，或尚未运行 \`codeTemplate index\` 索引\n2. 尝试用 \`codeTemplate_search_conventions\` 搜索相关代码片段\n3. 尝试用 \`codeTemplate_list_languages\` 查看该语言的其他可用类型`;
}

function getFileExtension(language: string): string {
  return registryGetFileExtension(language).replace(/^\./, '');
}

export function getComponentUsage(dbPath: string, component: string): string {
  const db = getReadonlyConnection(dbPath);
  const rows = db.prepare(
    `SELECT * FROM component_usages WHERE component_name LIKE ? ESCAPE '\\' ORDER BY usage_count DESC LIMIT 5`
  ).all(`%${escapeLike(component)}%`) as any[];
  db.close();

  if (rows.length === 0) return `# 未找到组件用法: ${component}\n\n请检查组件名拼写，或使用 \`codeTemplate_search_conventions\` 模糊搜索。`;

  let output = `# ${component} 用法示例\n\n`;
  for (const row of rows) {
    const lang = detectLanguage(row.file_path) || 'java';
    const fence = registryGetFileExtension(lang).replace(/^\./, '');
    output += `## ${row.component_name} (使用 ${row.usage_count} 次)\n**来源**: ${row.file_path}\n\n\`\`\`${fence}\n${row.usage_pattern}\n\`\`\`\n\n`;
    try {
      const related = JSON.parse(row.related_components || '[]');
      if (related.length > 0) output += `**常配合使用**: ${related.join(', ')}\n\n`;
    } catch { /* skip */ }
  }
  return output;
}

export function getModuleStructure(dbPath: string, module: string, includeExamples: boolean): string {
  const db = getReadonlyConnection(dbPath);
  const row = db.prepare(
    `SELECT * FROM module_structures WHERE module_name LIKE ? ESCAPE '\\' LIMIT 1`
  ).get(`%${escapeLike(module)}%`) as any;
  db.close();

  if (!row) {
    return `# 模块目录结构（通用模板）\n\n\`\`\`\nctff-module-{module}/ctff-module-{module}-server/src/main/java/com/ctff/module/{module}/\n├── controller/\n│   ├── admin/{business}/\n│   └── app/\n├── service/{business}/impl/\n├── dal/dataobject/{business}/\n├── dal/mysql/{business}/\n├── enums/\n├── common/constants/\n├── util/\n└── framework/\n\`\`\``;
  }

  let output = `# 模块目录结构: ${row.module_name}\n**文件数**: ${row.file_count}\n\n`;
  try {
    const structure = JSON.parse(row.structure_json);
    output += `**根路径**: ${structure.root}\n\n`;
    if (structure.layers) {
      output += `## 目录层级\n\n`;
      for (const layer of structure.layers) {
        output += `- **${layer.name}/** (${layer.fileCount} 文件)\n`;
        if (includeExamples && layer.files?.length > 0) {
          for (const f of layer.files.slice(0, 3)) {
            output += `  - \`${f.split('/').slice(-3).join('/')}\`\n`;
          }
        }
        if (layer.subLayers) {
          for (const sub of layer.subLayers) {
            output += `  - **${sub.name}/** (${sub.fileCount} 文件)\n`;
            if (includeExamples && sub.files?.length > 0) {
              for (const f of sub.files.slice(0, 2)) {
                output += `    - \`${f.split('/').slice(-3).join('/')}\`\n`;
              }
            }
          }
        }
      }
    }
  } catch { /* skip */ }
  return output;
}

export function getNamingConvention(dbPath: string, entityType: string, entityName?: string, language: string = 'java'): string {
  const db = getReadonlyConnection(dbPath);
  const row = db.prepare('SELECT * FROM naming_conventions WHERE entity_type = ?').get(entityType) as any;
  db.close();

  if (!row) {
    // Fall back to builtin naming pattern
    if (entityName) {
      const className = registryGetTargetClassName(entityType, entityName, language);
      return `# 命名约定: ${entityType} (${language})\n\n**基于内置模板生成**: ${className}\n`;
    }
    return `# 命名约定未找到: ${entityType}`;
  }

  let output = `# 命名约定: ${entityType}\n\n**模式**: ${row.pattern}\n\n`;
  try {
    const examples = JSON.parse(row.examples);
    output += `**项目中的示例**:\n${examples.map((e: string) => `  - ${e}`).join('\n')}\n`;
  } catch { /* skip */ }
  if (entityName) {
    output += `\n**建议命名**: ${registryGetTargetClassName(entityType, entityName, language)}\n`;
  }
  return output;
}

export function getAnnotationPattern(dbPath: string, fileType: string): string {
  const db = getReadonlyConnection(dbPath);
  const row = db.prepare('SELECT * FROM annotation_patterns WHERE file_type = ?').get(fileType) as any;
  db.close();

  if (!row) return `# 注解模式未找到: ${fileType}\n\n请确保已运行 \`codeTemplate index\` 构建知识库`;

  let output = `# 注解模式: ${fileType}\n\n`;
  try {
    const required = JSON.parse(row.annotations);
    const optional = row.optional_annotations ? JSON.parse(row.optional_annotations) : [];
    const imports = JSON.parse(row.required_imports);
    output += `## 必须\n${required.map((a: string) => `- ${a} → \`${imports[a] || '手动导入'}\``).join('\n')}\n`;
    if (optional.length > 0) {
      output += `\n## 可选\n${optional.map((a: string) => `- ${a} → \`${imports[a] || '手动导入'}\``).join('\n')}\n`;
    }
  } catch { /* skip */ }
  return output;
}

export function searchConventions(dbPath: string, query: string, fileType?: string): string {
  const db = getReadonlyConnection(dbPath);
  const eq = escapeLike(query);
  const results: string[] = [];

  let sql = `SELECT type, file_path, class_name, source_content, language FROM file_templates WHERE source_content LIKE ? ESCAPE '\\'`;
  const params: any[] = [`%${eq}%`];
  if (fileType) { sql += ` AND type = ?`; params.push(fileType); }
  sql += ` LIMIT 20`;

  const tmplRows = db.prepare(sql).all(...params) as any[];
  for (const row of tmplRows) {
    const tmplFence = registryGetFileExtension(row.language || 'java').replace(/^\./, '');
    results.push(`### [${row.type}] ${row.class_name}\n**文件**: ${row.file_path}\n\n\`\`\`${tmplFence}\n${extractSnippet(row.source_content, query, 500)}\n\`\`\``);
  }

  const compRows = db.prepare(
    `SELECT component_name, usage_pattern, file_path FROM component_usages WHERE usage_pattern LIKE ? ESCAPE '\\' LIMIT 10`
  ).all(`%${eq}%`) as any[];
  for (const row of compRows) {
    const compLang = detectLanguage(row.file_path) || 'java';
    const compFence = registryGetFileExtension(compLang).replace(/^\./, '');
    results.push(`### [组件] ${row.component_name}\n\`\`\`${compFence}\n${extractSnippet(row.usage_pattern, query, 300)}\n\`\`\``);
  }

  const namingRows = db.prepare(
    `SELECT entity_type, pattern, examples FROM naming_conventions WHERE pattern LIKE ? ESCAPE '\\' OR examples LIKE ? ESCAPE '\\' LIMIT 5`
  ).all(`%${eq}%`, `%${eq}%`) as any[];
  for (const row of namingRows) {
    results.push(`### [命名] ${row.entity_type}\n**模式**: ${row.pattern}\n**示例**: ${row.examples}`);
  }

  db.close();

  if (results.length === 0) {
    return `# 未找到匹配结果: "${query}"\n\n请尝试:\n- 使用英文关键词（如 "pagination", "transaction"）\n- 使用组件名（如 "BeanUtils.toBean"）`;
  }
  return `# 搜索结果: "${query}" (${results.length} 条)\n\n${results.join('\n\n---\n\n')}`;
}

function extractSnippet(content: string, query: string, maxLen: number): string {
  const idx = content.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return content.substring(0, maxLen) + '...';
  const start = Math.max(0, idx - maxLen / 2);
  const end = Math.min(content.length, idx + query.length + maxLen / 2);
  let snippet = content.substring(start, end);
  if (start > 0) snippet = '...\n' + snippet;
  if (end < content.length) snippet = snippet + '\n...';
  return snippet;
}

export function getSupportedLanguages(_dbPath: string): string[] {
  return getAllLanguageNames();
}
