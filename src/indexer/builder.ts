import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { initDb, dropAllTables, getConnection } from '../db/schema';
import { scanModule } from '../extractor/scanner';
import { batchClassify, FileMeta, classify } from '../extractor/classifier';
import {
  extractComponentUsages,
  extractNamingConventions,
  extractAnnotations,
  extractModuleStructure,
} from '../extractor/patterns';

function scoreRepresentativeness(meta: FileMeta, content: string): number {
  let score = 0;
  const methodCount = (content.match(/(?:public|protected|private)\s+\w+\s+\w+\s*\(/g) || []).length;
  score += Math.floor(methodCount / 10);
  if (meta.annotations.length >= 5) score += 2;
  if (meta.annotations.length >= 8) score += 3;
  if (meta.annotations.includes('@Transactional')) score += 2;
  return score;
}

export interface BuildProgress {
  stage: 'scanning' | 'classifying' | 'inserting' | 'done';
  current: number;
  total: number;
}

export function build(
  modulePath: string,
  dbPath: string,
  fullRebuild: boolean = false,
  onProgress?: (p: BuildProgress) => void
): { fileCount: number; classifiedCount: number } {
  const resolvedPath = path.resolve(modulePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Module path not found: ${resolvedPath}`);
  }
  const normalized = path.normalize(resolvedPath);
  if (normalized.includes('/etc/') || normalized.startsWith('/etc')) {
    throw new Error('Path traversal detected');
  }

  const db = initDb(dbPath);
  if (fullRebuild) {
    dropAllTables(db);
    db.close();
  } else {
    db.close();
  }

  const db2 = initDb(dbPath);
  if (onProgress) onProgress({ stage: 'scanning', current: 0, total: 0 });
  const scanResult = scanModule(resolvedPath);
  if (onProgress) onProgress({ stage: 'classifying', current: 0, total: scanResult.files.length });
  const classified = batchClassify(scanResult.files, (current, total) => {
    if (onProgress) onProgress({ stage: 'classifying', current, total });
  });
  const components = extractComponentUsages(classified, scanResult.files);
  const namings = extractNamingConventions(classified);
  const annotations = extractAnnotations(classified);
  const moduleName = resolvedPath.replace(/\\/g, '/').split('/').pop() || 'unknown';
  const structure = extractModuleStructure(scanResult.structure, moduleName);

  // module_structures
  db2.prepare('INSERT INTO module_structures (module_name, structure_json, file_count) VALUES (?, ?, ?)')
    .run(moduleName, structure.structureJson, scanResult.files.length);

  // file_templates
  const insertTemplate = db2.prepare(
    `INSERT INTO file_templates (type, module, file_path, class_name, package_path, annotations, extends_class, implements_interface, import_list, source_content, representativeness, language)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  let templateCount = 0;
  const allMetas: [string, FileMeta][] = [];
  for (const [fileType, metas] of Object.entries(classified)) {
    for (const meta of metas) allMetas.push([fileType, meta]);
  }
  if (onProgress) onProgress({ stage: 'inserting', current: 0, total: allMetas.length });
  for (let i = 0; i < allMetas.length; i++) {
    const [fileType, meta] = allMetas[i];
    let content = '';
    try { content = fs.readFileSync(meta.filePath, 'utf-8'); } catch { /* skip */ }
    const score = scoreRepresentativeness(meta, content);
    insertTemplate.run(
      fileType, moduleName, meta.filePath, meta.className, meta.packagePath,
      JSON.stringify(meta.annotations), meta.extendsClass, meta.implementsInterface,
      JSON.stringify(meta.importList), content, score, meta.language || 'java'
    );
    templateCount++;
    if (onProgress && i % 3 === 0) onProgress({ stage: 'inserting', current: i + 1, total: allMetas.length });
  }
  if (onProgress) onProgress({ stage: 'inserting', current: allMetas.length, total: allMetas.length });

  // component_usages
  const insertComp = db2.prepare(
    'INSERT INTO component_usages (component_name, usage_pattern, file_path, usage_count, related_components) VALUES (?, ?, ?, ?, ?)'
  );
  for (const comp of components) {
    insertComp.run(comp.componentName, comp.usagePattern, comp.filePath, comp.usageCount, JSON.stringify(comp.relatedComponents));
  }

  // naming_conventions
  const insertNaming = db2.prepare(
    'INSERT INTO naming_conventions (entity_type, pattern, examples, source_files) VALUES (?, ?, ?, ?)'
  );
  for (const n of namings) {
    insertNaming.run(n.entityType, n.pattern, JSON.stringify(n.examples), JSON.stringify(n.sourceFiles));
  }

  // annotation_patterns
  const insertAnno = db2.prepare(
    'INSERT INTO annotation_patterns (file_type, annotations, optional_annotations, required_imports) VALUES (?, ?, ?, ?)'
  );
  for (const [fileType, pat] of Object.entries(annotations)) {
    insertAnno.run(fileType, JSON.stringify(pat.required), JSON.stringify(pat.optional), JSON.stringify(pat.imports));
  }

  // project_conventions
  const insertConv = db2.prepare('INSERT OR REPLACE INTO project_conventions (key, value) VALUES (?, ?)');
  insertConv.run('module_name', moduleName);
  insertConv.run('indexed_at', new Date().toISOString());
  insertConv.run('file_count', String(scanResult.files.length));
  insertConv.run('template_count', String(templateCount));
  insertConv.run('source_module', resolvedPath);

  db2.close();
  if (onProgress) onProgress({ stage: 'done', current: templateCount, total: templateCount });
  return { fileCount: scanResult.files.length, classifiedCount: templateCount };
}

export function sync(
  modulePath: string,
  dbPath: string
): { added: number; updated: number; deleted: number } {
  const resolvedPath = path.resolve(modulePath);
  const db = getConnection(dbPath);
  const indexedFiles = new Map<string, number>();
  const rows = db.prepare('SELECT id, file_path FROM file_templates').all() as any[];
  for (const row of rows) indexedFiles.set(row.file_path, row.id);

  const scanResult = scanModule(resolvedPath);
  const currentFiles = new Set(scanResult.files.map((f) => f.replace(/\\/g, '/')));

  let added = 0, deleted = 0;
  const insertTemplate = db.prepare(
    `INSERT INTO file_templates (type, module, file_path, class_name, package_path, annotations, extends_class, implements_interface, import_list, source_content, representativeness, language)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const deleteTemplate = db.prepare('DELETE FROM file_templates WHERE id = ?');
  const moduleName = resolvedPath.replace(/\\/g, '/').split('/').pop() || 'unknown';

  for (const fp of currentFiles) {
    if (indexedFiles.has(fp)) {
      indexedFiles.delete(fp);
      continue;
    }
    try {
      const { type, ...meta } = classify(fp);
      if (type) {
        let content = '';
        try { content = fs.readFileSync(fp, 'utf-8'); } catch { /* skip */ }
        insertTemplate.run(
          type, moduleName, fp, meta.className, meta.packagePath,
          JSON.stringify(meta.annotations), meta.extendsClass, meta.implementsInterface,
          JSON.stringify(meta.importList), content, scoreRepresentativeness(meta, content),
          meta.language || 'java'
        );
        added++;
      }
    } catch { /* skip */ }
  }

  for (const [, id] of indexedFiles) {
    deleteTemplate.run(id);
    deleted++;
  }

  db.prepare('INSERT OR REPLACE INTO project_conventions (key, value) VALUES (?, ?)').run('indexed_at', new Date().toISOString());
  db.close();
  return { added, updated: 0, deleted };
}
