'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_SOURCE = path.join(os.homedir(), '.gemini', 'antigravity', 'skills', '_incoming', 'skills');
const DEFAULT_USER_PROMPTS = path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'prompts');
const DEFAULT_WORKSPACE_PROMPTS = path.join(__dirname, '..', '.github', 'prompts');
const RISKY_KEYWORDS = [
  'attack',
  'attacks',
  'broken-authentication',
  'ethical-hacking',
  'exploit',
  'exploitation',
  'file-path-traversal',
  'hacking',
  'idor',
  'injection',
  'metasploit',
  'pentest',
  'privilege-escalation',
  'red-team',
  'reconnaissance',
  'scan',
  'scanner',
  'scanning',
  'shodan',
  'sql-injection',
  'sqlmap',
  'ssh-penetration',
  'smtp-penetration',
  'top-web-vulnerabilities',
  'vulnerability',
  'wireshark',
  'wordpress-penetration',
  'windows-privilege-escalation',
  'xss'
];

function parseArgs(argv) {
  const args = {
    source: DEFAULT_SOURCE,
    output: DEFAULT_WORKSPACE_PROMPTS,
    force: false,
    names: [],
    allowRisky: false
  };

  for (const rawArg of argv) {
    if (rawArg === '--force') {
      args.force = true;
      continue;
    }
    if (rawArg === '--allow-risky') {
      args.allowRisky = true;
      continue;
    }
    if (rawArg === '--user') {
      args.output = DEFAULT_USER_PROMPTS;
      continue;
    }
    if (rawArg === '--workspace') {
      args.output = DEFAULT_WORKSPACE_PROMPTS;
      continue;
    }
    if (rawArg.startsWith('--source=')) {
      args.source = rawArg.slice('--source='.length);
      continue;
    }
    if (rawArg.startsWith('--output=')) {
      args.output = rawArg.slice('--output='.length);
      continue;
    }
    if (rawArg.startsWith('--only=')) {
      args.names = rawArg.slice('--only='.length).split(',').map((item) => item.trim()).filter(Boolean);
      continue;
    }
    if (rawArg === '--help' || rawArg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp() {
  console.log('Importa skills estilo Antigravity como prompt files de Copilot.');
  console.log('');
  console.log('Uso:');
  console.log('  node scripts/import-antigravity-skills-as-prompts.js [--workspace|--user] [--only=a,b] [--force]');
  console.log('');
  console.log('Opciones:');
  console.log('  --workspace        Importa a .github/prompts del repo actual');
  console.log('  --user             Importa a la carpeta de prompts del perfil de VS Code');
  console.log('  --source=RUTA      Carpeta origen con subcarpetas de skills');
  console.log('  --output=RUTA      Carpeta destino explícita');
  console.log('  --only=a,b         Importa solo esos nombres de skill');
  console.log('  --force            Sobrescribe .prompt.md existentes');
  console.log('  --allow-risky      Importa también prompts de alto riesgo ofensivo');
}

function isRiskySkill(name) {
  const normalizedName = name.toLowerCase();
  return RISKY_KEYWORDS.some((keyword) => normalizedName.includes(keyword));
}

function readFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { attributes: {}, body: markdown.trim() };
  }

  const attributes = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    attributes[key] = value;
  }

  return {
    attributes,
    body: markdown.slice(match[0].length).trim()
  };
}

function sanitizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}

function uniquePromptName(preferredName, folderName, usedNames) {
  const baseName = sanitizeName(folderName || preferredName || 'imported-skill');
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName);
    return baseName;
  }

  const folderBasedName = sanitizeName(preferredName || folderName || baseName);
  if (!usedNames.has(folderBasedName)) {
    usedNames.add(folderBasedName);
    return folderBasedName;
  }

  let suffix = 2;
  while (usedNames.has(folderBasedName + '-' + suffix)) {
    suffix += 1;
  }

  const finalName = folderBasedName + '-' + suffix;
  usedNames.add(finalName);
  return finalName;
}

function buildPromptContent(skillName, description, body, sourceDir) {
  return [
    '---',
    'name: ' + skillName,
    'description: ' + description,
    '---',
    '',
    '<!-- managed-by: import-antigravity-skills-as-prompts -->',
    '> Importado desde ' + sourceDir.replace(/\\/g, '/'),
    '',
    body,
    ''
  ].join('\n');
}

function getSkillDirs(sourceDir) {
  return fs.readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(sourceDir, entry.name))
    .filter((dirPath) => fs.existsSync(path.join(dirPath, 'SKILL.md')));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function buildManifest(outputDir, details) {
  const manifestPath = path.join(outputDir, '_antigravity-import-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(details, null, 2), 'utf8');
}

function loadPreviousManifest(outputDir) {
  const manifestPath = path.join(outputDir, '_antigravity-import-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (_) {
    return null;
  }
}

function removePreviousImportedPrompts(outputDir, manifest) {
  if (!manifest || !Array.isArray(manifest.imported)) {
    return;
  }

  for (const entry of manifest.imported) {
    const promptName = typeof entry === 'string' ? entry : entry.promptName;
    if (!promptName) {
      continue;
    }

    const promptFile = path.join(outputDir, promptName + '.prompt.md');
    if (fs.existsSync(promptFile)) {
      fs.unlinkSync(promptFile);
    }
  }
}

function removeManagedPromptFiles(outputDir) {
  for (const entry of fs.readdirSync(outputDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.prompt.md')) {
      continue;
    }

    const filePath = path.join(outputDir, entry.name);
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('<!-- managed-by: import-antigravity-skills-as-prompts -->')) {
      fs.unlinkSync(filePath);
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(args.source)) {
    throw new Error('No existe la carpeta origen: ' + args.source);
  }

  ensureDir(args.output);
  const previousManifest = loadPreviousManifest(args.output);
  if (args.force) {
    removePreviousImportedPrompts(args.output, previousManifest);
    removeManagedPromptFiles(args.output);
  }
  const skillDirs = getSkillDirs(args.source);
  const selectedSkillDirs = args.names.length
    ? skillDirs.filter((dirPath) => args.names.includes(path.basename(dirPath)))
    : skillDirs;

  const filteredSkillDirs = args.allowRisky
    ? selectedSkillDirs
    : selectedSkillDirs.filter((dirPath) => !isRiskySkill(path.basename(dirPath)));

  if (!filteredSkillDirs.length) {
    throw new Error('No se encontraron skills para importar.');
  }

  const imported = [];
  const skipped = [];
  const skippedRisky = [];
  const usedNames = new Set();

  for (const entry of fs.readdirSync(args.output, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.prompt.md')) {
      continue;
    }
    usedNames.add(entry.name.slice(0, -'.prompt.md'.length));
  }

  if (!args.allowRisky) {
    for (const dirPath of selectedSkillDirs) {
      const skillName = path.basename(dirPath);
      if (isRiskySkill(skillName)) {
        skippedRisky.push(skillName);
      }
    }
  }

  for (const skillDir of filteredSkillDirs) {
    const skillFile = path.join(skillDir, 'SKILL.md');
    const parsed = readFrontmatter(fs.readFileSync(skillFile, 'utf8'));
    const folderName = path.basename(skillDir);
    const rawName = parsed.attributes.name || folderName || 'imported-skill';
    const skillName = uniquePromptName(rawName, folderName, usedNames);
    const description = parsed.attributes.description || ('Imported prompt for ' + skillName);
    const outputFile = path.join(args.output, skillName + '.prompt.md');

    if (!args.force && fs.existsSync(outputFile)) {
      skipped.push(skillName);
      continue;
    }

    const promptContent = buildPromptContent(skillName, description, parsed.body, skillDir);
    fs.writeFileSync(outputFile, promptContent, 'utf8');
    imported.push({
      promptName: skillName,
      sourceFolder: folderName,
      sourcePath: skillDir,
      declaredName: rawName,
      risky: false
    });
  }

  const manifest = {
    source: args.source,
    output: args.output,
    allowRisky: args.allowRisky,
    imported,
    skipped,
    skippedRisky,
    totalFound: selectedSkillDirs.length,
    totalImported: imported.length,
    generatedAt: new Date().toISOString()
  };

  buildManifest(args.output, manifest);
  console.log(JSON.stringify(manifest, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error && error.message ? error.message : error);
  process.exit(1);
}