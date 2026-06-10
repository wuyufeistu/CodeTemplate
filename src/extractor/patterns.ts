import fs from 'fs';
import { ClassifiedResult, FileMeta } from './classifier';
import { ModuleStructure } from './scanner';
import { LANGUAGES } from '../languages/registry';

export interface AnnotationPatternResult {
  [fileType: string]: {
    required: string[];
    optional: string[];
    imports: Record<string, string>;
  };
}

export interface ComponentUsage {
  componentName: string;
  usagePattern: string;
  filePath: string;
  usageCount: number;
  relatedComponents: string[];
}

export interface NamingConvention {
  entityType: string;
  pattern: string;
  examples: string[];
  sourceFiles: string[];
}

const BASE_COMPONENT_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: 'BeanUtils.toBean', regex: /BeanUtils\.toBean\(/g },
  { name: 'CommonResult.success', regex: /CommonResult\.success\(/g },
  { name: 'LambdaQueryWrapperX', regex: /new\s+LambdaQueryWrapperX</g },
  { name: 'Wrappers.lambdaQuery', regex: /Wrappers\.\w*lambdaQuery\(/g },
  { name: 'ExcelUtils.write', regex: /ExcelUtils\.write\(/g },
  { name: 'ServiceExceptionUtil.exception', regex: /throw\s+exception\(/g },
  { name: '@Transactional', regex: /@Transactional(?:\([^)]*\))?/g },
  { name: '@PreAuthorize', regex: /@PreAuthorize\(/g },
  { name: 'BeanUtil.copyProperties', regex: /BeanUtil\.copyProperties\(/g },
  { name: 'PageResult', regex: /PageResult</g },
  { name: 'PageParam', regex: /extends\s+PageParam/g },
];

function getComponentPatterns(): { name: string; regex: RegExp }[] {
  const all = [...BASE_COMPONENT_PATTERNS];
  for (const lang of LANGUAGES) {
    for (const cp of lang.componentPatterns) {
      if (all.some(p => p.name === cp.name)) continue;
      try {
        all.push({ name: cp.name, regex: new RegExp(cp.regex, 'g') });
      } catch { /* skip invalid regex from registry */ }
    }
  }
  return all;
}

export function extractAnnotations(classified: ClassifiedResult): AnnotationPatternResult {
  const result: AnnotationPatternResult = {};
  for (const [fileType, metas] of Object.entries(classified)) {
    if (metas.length === 0) continue;
    const annoCounts = new Map<string, number>();
    const annoImports = new Map<string, string>();
    for (const meta of metas) {
      for (const anno of meta.annotations) {
        const name = anno.startsWith('@') ? anno : '@' + anno;
        annoCounts.set(name, (annoCounts.get(name) || 0) + 1);
        for (const imp of meta.importList) {
          const cleaned = imp.replace(/^import\s+(static\s+)?/, '').replace(/;$/, '').trim();
          const parts = cleaned.split('.');
          const lastName = parts[parts.length - 1];
          if (lastName === name.replace('@', '')) {
            annoImports.set(name, imp);
            break;
          }
        }
      }
    }
    const total = metas.length;
    const required: string[] = [];
    const optional: string[] = [];
    for (const [anno, count] of annoCounts) {
      if (count === total) required.push(anno);
      else if (count >= total * 0.3) optional.push(anno);
    }
    result[fileType] = { required, optional, imports: Object.fromEntries(annoImports) };
  }
  return result;
}

export function extractComponentUsages(
  _classified: ClassifiedResult,
  allFiles: string[]
): ComponentUsage[] {
  const usagesMap = new Map<string, ComponentUsage>();
  const allPatterns = getComponentPatterns();
  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const foundComponents: string[] = [];

      for (const pattern of allPatterns) {
        pattern.regex.lastIndex = 0;
        let match;
        let found = false;
        while ((match = pattern.regex.exec(content)) !== null) {
          found = true;
          const lineIdx = content.substring(0, match.index).split('\n').length - 1;
          const start = Math.max(0, lineIdx - 2);
          const end = Math.min(lines.length, lineIdx + 3);
          const snippet = lines.slice(start, end).join('\n').trim();
          const key = pattern.name;
          const existing = usagesMap.get(key);
          if (existing) {
            existing.usageCount++;
            if (!existing.usagePattern.includes(snippet)) {
              existing.usagePattern += '\n\n' + snippet;
            }
          } else {
            usagesMap.set(key, {
              componentName: key,
              usagePattern: snippet,
              filePath: filePath.replace(/\\/g, '/'),
              usageCount: 1,
              relatedComponents: [],
            });
          }
        }
        if (found) foundComponents.push(pattern.name);
      }

      // 关联组件
      for (const c1 of foundComponents) {
        for (const c2 of foundComponents) {
          if (c1 !== c2) {
            const usage = usagesMap.get(c1);
            if (usage && !usage.relatedComponents.includes(c2)) {
              usage.relatedComponents.push(c2);
            }
          }
        }
      }
    } catch { /* skip */ }
  }
  return Array.from(usagesMap.values()).sort((a, b) => b.usageCount - a.usageCount);
}

export function extractNamingConventions(classified: ClassifiedResult): NamingConvention[] {
  const result: NamingConvention[] = [];
  const patterns: Record<string, string> = {
    controller: '{Entity}Controller',
    service_impl: '{Entity}ServiceImpl',
    mapper: '{Entity}Mapper',
    do: '{Entity}DO',
    vo_req: '{Entity}{Action}ReqVO',
    vo_resp: '{Entity}{Action}RespVO',
    enum: '{Entity}Enum or {Entity}{Type}Enum',
    constant: '{Module}Constant',
  };
  for (const [fileType, metas] of Object.entries(classified)) {
    if (metas.length === 0) continue;
    result.push({
      entityType: fileType,
      pattern: patterns[fileType] || '{Entity}' + fileType,
      examples: metas.slice(0, 5).map((m) => m.className),
      sourceFiles: metas.map((m) => m.filePath),
    });
  }
  result.push({
    entityType: 'table', pattern: '{MODULE_PREFIX}_{ENTITY}',
    examples: ['VMP_LOG', 'VMP_VPT_MODEL', 'VMP_ORDER_MAIN'], sourceFiles: [],
  });
  result.push({
    entityType: 'package', pattern: 'com.ctff.module.{module}.{layer}.{sublayer}',
    examples: ['com.ctff.module.vmp.controller.admin.log', 'com.ctff.module.vmp.service.log.impl', 'com.ctff.module.vmp.dal.mysql.log'],
    sourceFiles: [],
  });
  return result;
}

export function extractModuleStructure(
  structure: ModuleStructure,
  moduleName: string
): { moduleName: string; structureJson: string; fileCount: number } {
  return {
    moduleName,
    structureJson: JSON.stringify(structure),
    fileCount: structure.layers.reduce((sum, l) => sum + l.fileCount, 0),
  };
}

export function extractAll(modulePath: string): {
  structures: ReturnType<typeof extractModuleStructure>;
  templates: ClassifiedResult;
  components: ComponentUsage[];
  namings: NamingConvention[];
  annotations: AnnotationPatternResult;
} {
  const { scanModule } = require('./scanner');
  const { batchClassify } = require('./classifier');
  const scanResult = scanModule(modulePath);
  const classified = batchClassify(scanResult.files);
  const components = extractComponentUsages(classified, scanResult.files);
  const namings = extractNamingConventions(classified);
  const annotations = extractAnnotations(classified);
  const moduleName = modulePath.replace(/\\/g, '/').split('/').pop() || 'unknown';
  const structures = extractModuleStructure(scanResult.structure, moduleName);
  return { structures, templates: classified, components, namings, annotations };
}
