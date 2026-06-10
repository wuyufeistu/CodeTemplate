import fs from 'fs';
import path from 'path';
import { LANGUAGES } from '../languages/registry';

// Collect all supported extensions from the registry
const SUPPORTED_EXTS = new Set<string>();
for (const lang of LANGUAGES) {
  for (const ext of lang.extensions) SUPPORTED_EXTS.add(ext);
}

export interface ScanResult {
  files: string[];
  structure: ModuleStructure;
}

export interface ModuleStructure {
  root: string;
  layers: LayerInfo[];
}

export interface LayerInfo {
  name: string;
  path: string;
  files: string[];
  subLayers: LayerInfo[];
  fileCount: number;
}

function collectSourceFiles(dir: string, result: string[]): void {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (entry.name === 'node_modules' || entry.name === 'target' || entry.name === '__pycache__') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collectSourceFiles(fullPath, result);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (SUPPORTED_EXTS.has(ext)) result.push(fullPath);
      }
    }
  } catch { /* skip */ }
}

export function scanModule(modulePath: string): ScanResult {
  const files: string[] = [];
  if (!fs.existsSync(modulePath)) {
    return { files: [], structure: { root: modulePath, layers: [] } };
  }
  collectSourceFiles(modulePath, files);

  const layers: LayerInfo[] = [];
  try {
    const entries = fs.readdirSync(modulePath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (entry.name === 'node_modules' || entry.name === 'target' || entry.name === '__pycache__') continue;
      const fullPath = path.join(modulePath, entry.name);
      if (entry.isDirectory()) {
        const dirFiles: string[] = [];
        const subLayers: LayerInfo[] = [];
        scanLayer(fullPath, dirFiles, subLayers);
        layers.push({ name: entry.name, path: fullPath, files: dirFiles, subLayers, fileCount: dirFiles.length });
      }
    }
  } catch { /* skip */ }

  return { files, structure: { root: modulePath, layers } };
}

function scanLayer(dir: string, files: string[], subLayers: LayerInfo[]): void {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const subFiles: string[] = [];
        const subSubLayers: LayerInfo[] = [];
        scanLayer(fullPath, subFiles, subSubLayers);
        subLayers.push({ name: entry.name, path: fullPath, files: subFiles, subLayers: subSubLayers, fileCount: subFiles.length });
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (SUPPORTED_EXTS.has(ext)) files.push(fullPath);
      }
    }
  } catch { /* skip */ }
}
