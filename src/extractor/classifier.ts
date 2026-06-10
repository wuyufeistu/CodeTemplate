import fs from 'fs';
import path from 'path';
import { detectLanguage } from '../languages/registry';

export interface FileMeta {
  filePath: string;
  className: string;
  packagePath: string;
  annotations: string[];
  extendsClass: string | null;
  implementsInterface: string | null;
  importList: string[];
  language: string;
}

// Dynamic file type — no longer hardcoded to Java types
export type ClassifiedResult = Record<string, FileMeta[]>;

// ===== Java-specific extraction =====
function readJavaFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

function extractPackage(content: string): string {
  const m = content.match(/^package\s+([\w.]+)\s*;/m);
  return m ? m[1] : '';
}

function extractClassNameJava(content: string, filePath: string): string {
  const m = content.match(/(?:public\s+)?(?:abstract\s+)?(?:class|interface|enum)\s+(\w+)/);
  if (m) return m[1];
  return path.basename(filePath, '.java');
}

function extractAnnotationsJava(content: string): string[] {
  const annotations: string[] = [];
  const re = /@(\w+)(?:\s*\([^)]*\))?/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    annotations.push('@' + match[1]);
  }
  return annotations;
}

function extractExtends(content: string): string | null {
  const m = content.match(/(?:public\s+)?(?:abstract\s+)?class\s+\w+\s+extends\s+([\w<>,.\s]+?)\s*(?:\{|implements)/);
  return m ? m[1].trim() : null;
}

function extractImplements(content: string): string | null {
  const m = content.match(/implements\s+([\w<>,.\s]+?)\s*\{/);
  return m ? m[1].trim() : null;
}

function extractImports(content: string): string[] {
  const imports: string[] = [];
  const re = /^import\s+(static\s+)?([\w.*]+)\s*;$/gm;
  let match;
  while ((match = re.exec(content)) !== null) {
    imports.push(match[0].replace(/;$/, ''));
  }
  return imports;
}

function extractMetaJava(filePath: string): FileMeta {
  const content = readJavaFile(filePath);
  return {
    filePath: filePath.replace(/\\/g, '/'),
    className: extractClassNameJava(content, filePath),
    packagePath: extractPackage(content),
    annotations: extractAnnotationsJava(content),
    extendsClass: extractExtends(content),
    implementsInterface: extractImplements(content),
    importList: extractImports(content),
    language: 'java',
  };
}

// ===== Generic extraction for non-Java files =====
function classNameFromPath(filePath: string, ext: string): string {
  const base = path.basename(filePath, ext);
  // PascalCase conversion for snake_case / kebab-case filenames
  return base.replace(/[-_]([a-zA-Z0-9])/g, (_, c) => c.toUpperCase())
    .replace(/^[a-z]/, (c) => c.toUpperCase());
}

function extractMetaGeneric(filePath: string, language: string, ext: string): FileMeta {
  const content = readFileSafe(filePath);
  const decorators = extractDecoratorsGeneric(content, language);
  return {
    filePath: filePath.replace(/\\/g, '/'),
    className: classNameFromPath(filePath, ext),
    packagePath: extractNamespaceGeneric(content, language),
    annotations: decorators,
    extendsClass: null,
    implementsInterface: null,
    importList: extractImportsGeneric(content, language),
    language,
  };
}

function readFileSafe(filePath: string): string {
  try { return fs.readFileSync(filePath, 'utf-8'); } catch { return ''; }
}

function extractDecoratorsGeneric(content: string, language: string): string[] {
  const decs: string[] = [];
  switch (language) {
    case 'python':
      for (const m of content.matchAll(/@(\w+)(?:\([^)]*\))?/g)) decs.push('@' + m[1]);
      break;
    case 'typescript':
    case 'javascript':
      for (const m of content.matchAll(/@(\w+)(?:\([^)]*\))?/g)) decs.push('@' + m[1]);
      break;
    case 'go':
      for (const m of content.matchAll(/`json:"(\w+)/g)) decs.push('json:' + m[1]);
      break;
    case 'rust':
      for (const m of content.matchAll(/#\[(\w+)/g)) decs.push('#[' + m[1] + ']');
      break;
    case 'csharp':
      for (const m of content.matchAll(/\[(\w+)(?:\([^)]*\))?\]/g)) decs.push('[' + m[1] + ']');
      break;
    case 'php':
      for (const m of content.matchAll(/#\[(\w+)/g)) decs.push('#[' + m[1] + ']');
      break;
    case 'vue':
      if (/<script\s+setup/.test(content)) decs.push('<script setup>');
      if (/defineStore\(/.test(content)) decs.push('defineStore');
      break;
    case 'xml':
      for (const m of content.matchAll(/<(\w+)[\s>]/g)) {
        if (!decs.includes('<' + m[1] + '>')) decs.push('<' + m[1] + '>');
      }
      break;
  }
  return decs;
}

function extractNamespaceGeneric(content: string, language: string): string {
  switch (language) {
    case 'python': {
      const m = content.match(/^from\s+([\w.]+)\s+import/m);
      return m ? m[1] : '';
    }
    case 'typescript':
    case 'javascript': {
      const m = content.match(/^import\s+.*\s+from\s+['"]([\w./@-]+)['"]/m);
      return m ? m[1] : '';
    }
    case 'go': {
      const m = content.match(/^package\s+(\w+)/m);
      return m ? m[1] : '';
    }
    case 'rust': {
      const m = content.match(/^mod\s+(\w+)/m);
      return m ? m[1] : '';
    }
    case 'csharp': {
      const m = content.match(/^namespace\s+([\w.]+)/m);
      return m ? m[1] : '';
    }
    case 'php': {
      const m = content.match(/^namespace\s+([\w\\]+)/m);
      return m ? m[1] : '';
    }
    case 'kotlin': {
      const m = content.match(/^package\s+([\w.]+)/m);
      return m ? m[1] : '';
    }
    case 'scala': {
      const m = content.match(/^package\s+([\w.]+)/m);
      return m ? m[1] : '';
    }
    case 'xml': {
      const m = content.match(/namespace="([^"]+)"/);
      return m ? m[1] : '';
    }
    default: return '';
  }
}

function extractImportsGeneric(content: string, language: string): string[] {
  const imports: string[] = [];
  switch (language) {
    case 'python':
      for (const m of content.matchAll(/^(?:from\s+[\w.]+\s+)?import\s+.+$/gm)) imports.push(m[0]);
      break;
    case 'typescript':
    case 'javascript':
      for (const m of content.matchAll(/^import\s+.+$/gm)) imports.push(m[0]);
      break;
    case 'go':
      for (const m of content.matchAll(/^\s+"[\w./-]+"/gm)) imports.push(m[0].trim().replace(/"/g, ''));
      break;
    case 'rust':
      for (const m of content.matchAll(/^use\s+.+;$/gm)) imports.push(m[0]);
      break;
    case 'csharp':
      for (const m of content.matchAll(/^using\s+.+;$/gm)) imports.push(m[0]);
      break;
    case 'php':
      for (const m of content.matchAll(/^use\s+.+;$/gm)) imports.push(m[0]);
      break;
    case 'c':
    case 'cpp':
      for (const m of content.matchAll(/^#include\s+[<"].+[>"]/gm)) imports.push(m[0]);
      break;
  }
  return imports;
}

// ===== Multi-language classification =====

function extractMeta(filePath: string, language: string): FileMeta {
  if (language === 'java' || language === 'kotlin') {
    if (language === 'java') return extractMetaJava(filePath);
    // Kotlin uses similar extraction
    return extractMetaJava(filePath); // reuse Java patterns for Kotlin
  }
  const ext = path.extname(filePath);
  return extractMetaGeneric(filePath, language, ext);
}

/**
 * Classify a file by path patterns and content patterns.
 * Uses language-specific heuristics.
 */
export function classify(filePath: string): FileMeta & { type: string | null } {
  const ext = path.extname(filePath);
  const language = detectLanguage(filePath) || 'unknown';
  const meta = extractMeta(filePath, language);
  const fpath = filePath.replace(/\\/g, '/');
  const lower = fpath.toLowerCase();

  // Java classification
  if (language === 'java') {
    const annSet = new Set(meta.annotations);
    try {
      const content = readJavaFile(filePath);
      if (/^public\s+enum\s/.test(content)) return { ...meta, type: 'enum' };
      if (/^public\s+@?interface\s/.test(content) && meta.extendsClass?.includes('BaseMapperX'))
        return { ...meta, type: 'mapper' };
    } catch { /* skip */ }

    if (annSet.has('@RestController') || (annSet.has('@Controller') && lower.includes('/controller/')))
      return { ...meta, type: 'controller' };
    if (annSet.has('@Service') && lower.includes('/impl/'))
      return { ...meta, type: 'service_impl' };
    if (meta.extendsClass?.includes('BaseMapperX') || annSet.has('@Mapper'))
      return { ...meta, type: 'mapper' };
    if (annSet.has('@TableName') || meta.extendsClass?.includes('BaseDO'))
      return { ...meta, type: 'do' };
    if (meta.className.endsWith('ReqVO') || (lower.includes('/vo/') && meta.className.includes('Req')))
      return { ...meta, type: 'vo_req' };
    if (meta.className.endsWith('RespVO') || (lower.includes('/vo/') && (meta.className.includes('Resp') || meta.className.includes('Response'))))
      return { ...meta, type: 'vo_resp' };
    if (meta.className.includes('Constant') || meta.className.endsWith('Constants'))
      return { ...meta, type: 'constant' };
    return { ...meta, type: null };
  }

  // Kotlin classification
  if (language === 'kotlin') {
    const annSet = new Set(meta.annotations);
    if (annSet.has('@RestController') || annSet.has('@Controller'))
      return { ...meta, type: 'controller' };
    if (annSet.has('@Service'))
      return { ...meta, type: 'service_impl' };
    if (annSet.has('@Mapper') || meta.extendsClass?.includes('BaseMapperX'))
      return { ...meta, type: 'mapper' };
    if (annSet.has('@TableName'))
      return { ...meta, type: 'do' };
    return { ...meta, type: null };
  }

  // Generic path-based classification for all languages
  if (lower.includes('/controller/') || lower.includes('/controllers/') || lower.includes('/handler/') || lower.includes('/handlers/') || lower.includes('/router/') || lower.includes('/routers/') || lower.includes('/routes/'))
    return { ...meta, type: 'controller' };
  if (lower.includes('/service/') || lower.includes('/services/'))
    return { ...meta, type: 'service' };
  if (lower.includes('/model/') || lower.includes('/models/') || lower.includes('/entity/') || lower.includes('/entities/') || lower.includes('/dataobject/') || lower.includes('/do/'))
    return { ...meta, type: 'do' };
  if (lower.includes('/mapper/') || lower.includes('/repository/') || lower.includes('/repositories/') || lower.includes('/dao/'))
    return { ...meta, type: 'mapper' };
  if (lower.includes('/dto/') || lower.includes('/schema/') || lower.includes('/schemas/'))
    return { ...meta, type: 'vo_req' };
  if (lower.includes('/middleware/'))
    return { ...meta, type: 'middleware' };
  if (lower.includes('/vo/') || lower.includes('/viewobject/'))
    return { ...meta, type: 'vo_req' };
  if (lower.includes('/config/') || lower.includes('/configuration/'))
    return { ...meta, type: 'config' };
  if (lower.includes('/store/') || lower.includes('/stores/'))
    return { ...meta, type: 'store' };
  if (lower.includes('/composable/') || lower.includes('/composables/') || lower.includes('/hook/') || lower.includes('/hooks/'))
    return { ...meta, type: 'composable' };
  if (lower.includes('/page/') || lower.includes('/pages/') || lower.includes('/view/') || lower.includes('/views/'))
    return { ...meta, type: 'page' };
  if (lower.includes('/component/') || lower.includes('/components/'))
    return { ...meta, type: 'component' };
  if (lower.includes('/util/') || lower.includes('/utils/') || lower.includes('/helper/') || lower.includes('/helpers/'))
    return { ...meta, type: 'util' };
  if (lower.includes('/constant/') || lower.includes('/constants/'))
    return { ...meta, type: 'constant' };

  // Content-based fallback for specific languages
  if (language === 'python') {
    const content = readFileSafe(filePath);
    if (/class\s+\w+.*BaseModel/.test(content)) return { ...meta, type: 'schema' };
    if (/class\s+\w+.*Base\b/.test(content) || /__tablename__/.test(content)) return { ...meta, type: 'model' };
    if (/@router\./.test(content) || /APIRouter/.test(content) || /Blueprint/.test(content)) return { ...meta, type: 'router' };
    if (/class\s+\w+Service/.test(content)) return { ...meta, type: 'service' };
  }
  if (language === 'typescript' || language === 'javascript') {
    const content = readFileSafe(filePath);
    if (/@Controller\(/.test(content) || /@Get\(|@Post\(|@Put\(|@Delete\(/.test(content)) return { ...meta, type: 'controller' };
    if (/@Injectable\(/.test(content)) return { ...meta, type: 'service' };
    if (/@Entity\(/.test(content) || /@Table\(/.test(content)) return { ...meta, type: 'entity' };
    if (/class-validator/.test(content) || /@IsString|@IsInt|@IsOptional/.test(content)) return { ...meta, type: 'dto' };
  }
  if (language === 'go') {
    const content = readFileSafe(filePath);
    if (/gin\.Context/.test(content) || /echo\.Context/.test(content) || /http\.ResponseWriter/.test(content)) return { ...meta, type: 'handler' };
    if (/gorm\.DB/.test(content)) return { ...meta, type: 'service' };
    if (/gorm:"/.test(content)) return { ...meta, type: 'model' };
  }
  if (language === 'vue') {
    const content = readFileSafe(filePath);
    if (/defineStore\(/.test(content)) return { ...meta, type: 'store' };
    if (/export\s+function\s+use/.test(content)) return { ...meta, type: 'composable' };
    if (/<template>/.test(content) && /<script/.test(content)) return { ...meta, type: 'component' };
  }
  if (language === 'xml') {
    const content = readFileSafe(filePath);
    if (/<mapper\s+namespace=/.test(content)) return { ...meta, type: 'mapper' };
    if (/<beans\s/.test(content)) return { ...meta, type: 'config' };
  }

  return { ...meta, type: null };
}

export function batchClassify(filePaths: string[], onProgress?: (current: number, total: number) => void): ClassifiedResult {
  const result: ClassifiedResult = {};
  const total = filePaths.length;
  for (let i = 0; i < total; i++) {
    const fp = filePaths[i];
    const { type, ...meta } = classify(fp);
    if (type) {
      if (!result[type]) result[type] = [];
      result[type].push(meta);
    }
    if (onProgress && i % 5 === 0) onProgress(i + 1, total);
  }
  if (onProgress) onProgress(total, total);
  return result;
}
