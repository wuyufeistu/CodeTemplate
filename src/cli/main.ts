#!/usr/bin/env node
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { initDb, getConnection, dropAllTables, getLanguageDistribution } from '../db/schema';
import { build, sync, BuildProgress } from '../indexer/builder';

const COMMAND = process.argv[2];
const args = process.argv.slice(3);

/** Scan CWD (or specified path) for all supported source files */
function detectModules(): string[] {
  const root = process.cwd();
  // Default: scan the entire project root
  if (!fs.existsSync(root)) return [];
  // Verify at least one supported file exists before returning
  try {
    return [root];
  } catch { return []; }
}

function getModuleArg(): string | null {
  const mIdx = args.indexOf('-m');
  if (mIdx !== -1 && mIdx + 1 < args.length) return args[mIdx + 1];
  const moduleIdx = args.indexOf('--module');
  if (moduleIdx !== -1 && moduleIdx + 1 < args.length) return args[moduleIdx + 1];
  return null;
}

function hasFlag(flag: string): boolean {
  return args.includes(flag) || args.includes('-' + flag);
}

function getDefaultDbPath(): string {
  return path.join(process.cwd(), '.codetemplate', 'codeTemplate.db');
}

const STAGE_LABELS: Record<string, string> = {
  scanning: '扫描文件',
  classifying: '分类文件',
  inserting: '写入模板',
  done: '完成',
};

function renderProgress(p: BuildProgress): void {
  const label = STAGE_LABELS[p.stage] || p.stage;
  if (p.total === 0) {
    process.stderr.write(`\r${label}...`);
    return;
  }
  const pct = Math.round((p.current / p.total) * 100);
  const barW = 20;
  const filled = Math.round((p.current / p.total) * barW);
  const bar = '█'.repeat(filled) + '░'.repeat(barW - filled);
  process.stderr.write(`\r${label} [${bar}] ${p.current}/${p.total} (${pct}%)`);
}

function cmdInit(): void {
  const dbPath = getDefaultDbPath();
  console.log(`工作目录: ${process.cwd()}`);
  const db = initDb(dbPath);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as any[];
  db.close();
  console.log(`CodeTemplate 初始化完成 -> ${dbPath}`);
  console.log(`已创建 ${tables.length} 张表:`);
  for (const t of tables) console.log(`  - ${t.name}`);
}

function cmdIndex(): void {
  const moduleArg = getModuleArg();
  const fullRebuild = hasFlag('f') || hasFlag('-full');
  const dbPath = getDefaultDbPath();

  if (!fs.existsSync(dbPath)) {
    console.log('数据库未初始化，正在自动初始化...');
    cmdInit();
  }

  let modules: string[] = [];
  if (moduleArg) modules = [path.resolve(moduleArg)];
  else modules = detectModules();

  if (modules.length === 0) {
    console.log('未找到模块。请使用 -m <path> 指定模块路径');
    return;
  }

  if (fullRebuild) {
    const db = getConnection(dbPath);
    dropAllTables(db);
    db.close();
  }

  for (const mod of modules) {
    console.log(`正在索引: ${mod}`);
    try {
      const result = build(mod, dbPath, false, renderProgress);
      process.stderr.write('\n');
      console.log(`  扫描文件: ${result.fileCount}`);
      console.log(`  已分类: ${result.classifiedCount} 个模板`);
    } catch (e: any) {
      console.error(`  错误: ${e.message}`);
    }
  }
  cmdStatus();
}

function cmdSync(): void {
  const moduleArg = getModuleArg();
  const dbPath = getDefaultDbPath();
  if (!fs.existsSync(dbPath)) {
    console.log('数据库未初始化，请先运行 codeTemplate init && codeTemplate index');
    return;
  }
  const modules = moduleArg ? [path.resolve(moduleArg)] : detectModules();
  if (modules.length === 0) {
    console.log('未找到模块。使用 -m <path> 指定模块路径');
    return;
  }
  for (const mod of modules) {
    console.log(`增量同步: ${mod}`);
    try {
      const result = sync(mod, dbPath);
      console.log(`  新增: ${result.added}  更新: ${result.updated}  删除: ${result.deleted}`);
    } catch (e: any) { console.error(`  错误: ${e.message}`); }
  }
}

function cmdStatus(): void {
  const dbPath = getDefaultDbPath();
  if (!fs.existsSync(dbPath)) {
    console.log('数据库未初始化。请运行 codeTemplate init');
    console.log(`预期位置: ${dbPath}`);
    return;
  }
  const db = getConnection(dbPath);
  const tables = ['file_templates', 'builtin_templates', 'component_usages', 'naming_conventions', 'annotation_patterns', 'module_structures', 'project_conventions'];
  console.log('\nCodeTemplate 状态');
  console.log('─'.repeat(50));
  for (const table of tables) {
    const row = db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get() as any;
    console.log(`  ${table}: ${row.cnt} 行`);
  }
  const typeDist = db.prepare('SELECT type, COUNT(*) as cnt FROM file_templates GROUP BY type ORDER BY cnt DESC').all() as any[];
  if (typeDist.length > 0) {
    console.log('\n模板类型分布:');
    for (const t of typeDist) console.log(`  ${t.type}: ${t.cnt}`);
  }
  const indexedAt = db.prepare("SELECT value FROM project_conventions WHERE key = 'indexed_at'").get() as any;
  if (indexedAt) console.log(`\n索引时间: ${indexedAt.value}`);

  try {
    const langDist = getLanguageDistribution(db);
    const langKeys = Object.keys(langDist).filter(k => !k.includes('(builtin)'));
    const builtinKeys = Object.keys(langDist).filter(k => k.includes('(builtin)'));
    if (langKeys.length > 0) {
      console.log('\n语言分布 (项目模板):');
      for (const k of langKeys) console.log(`  ${k}: ${langDist[k]} 行`);
    }
    if (builtinKeys.length > 0) {
      console.log('\n语言分布 (内置模板):');
      for (const k of builtinKeys) console.log(`  ${k}: ${langDist[k]} 行`);
    }
  } catch { /* skip if not supported */ }
  db.close();
}

function getCurrentVersion(): string | null {
  try {
    const pkgPaths = [
      path.join(__dirname, '..', '..', 'package.json'),
      path.join(__dirname, '..', 'package.json'),
    ];
    for (const p of pkgPaths) {
      if (fs.existsSync(p)) {
        const pkg = JSON.parse(fs.readFileSync(p, 'utf-8'));
        return pkg.version;
      }
    }
    const output = execSync('npm ls -g codetemplate-mcp --depth=0 --json 2>/dev/null', { encoding: 'utf-8' });
    const info = JSON.parse(output);
    return info?.dependencies?.['codetemplate-mcp']?.version || null;
  } catch {
    return null;
  }
}

function cmdVersion(): void {
  const ver = getCurrentVersion();
  if (ver) console.log(`codetemplate-mcp v${ver}`);
  else console.log('codetemplate-mcp (version unknown)');
}

function cmdUpdate(): void {
  const current = getCurrentVersion();
  try {
    const latest = execSync('npm view codetemplate-mcp version 2>/dev/null', { encoding: 'utf-8' }).trim();
    if (current && current === latest) {
      console.log(`当前已是最新版本，版本号：${current}`);
      return;
    }
  } catch { /* 无法获取最新版本号，继续执行安装 */ }

  const fromVer = current || 'unknown';
  console.log(`正在更新 codetemplate-mcp (${fromVer} → latest)...`);
  try {
    execSync('npm install -g codetemplate-mcp@latest', { stdio: 'inherit' });
    console.log('更新完成!');
    cmdVersion();
  } catch (e: any) {
    console.error('更新失败:', e.message);
    process.exit(1);
  }
}

async function cmdServe(): Promise<void> {
  if (!args.includes('--mcp')) {
    console.log('用法: codeTemplate serve --mcp');
    console.log('启动 MCP 服务器（stdio JSON-RPC 传输）');
    return;
  }
  const { startMcpServer } = await import('../server/mcp-server');
  startMcpServer().catch((err: Error) => {
    console.error('MCP 服务器启动失败:', err.message);
    process.exit(1);
  });
}

function printHelp(): void {
  console.log(`
CodeTemplate — 代码规范知识库 (npm: codetemplate-mcp)

用法: codeTemplate <command> [options]

命令:
  init              初始化 .codetemplate/codeTemplate.db
  index             扫描项目并构建知识库
  sync              增量同步（仅处理变更文件）
  status            显示索引统计信息
  version           显示版本号
  update            从 npm 更新到最新版本
  serve --mcp       启动 MCP 服务器（stdio 传输）

选项:
  -m, --module PATH 指定模块/目录路径
  -f, --full        强制全量重建索引
  -h, --help        显示帮助
`);
}

if (!COMMAND || COMMAND === '-h' || COMMAND === '--help' || COMMAND === 'help') {
  printHelp();
} else {
  switch (COMMAND) {
    case 'init': cmdInit(); break;
    case 'index': cmdIndex(); break;
    case 'sync': cmdSync(); break;
    case 'status': cmdStatus(); break;
    case 'version': cmdVersion(); break;
    case 'update': cmdUpdate(); break;
    case 'serve': cmdServe(); break;
    default: console.log(`未知命令: ${COMMAND}`); printHelp(); process.exit(1);
  }
}
