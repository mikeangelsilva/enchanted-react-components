/**
 * Build-time metadata extraction for the Enchanted React Components MCP server.
 *
 * Reads the parent project's source files to extract component props, enums,
 * Storybook categories, theme info, and icon index.
 *
 * Usage: npm run build-metadata
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import _ from 'lodash';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Types ───────────────────────────────────────────────────────────────────

interface PropMeta {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

interface EnumMeta {
  name: string;
  values: Record<string, string>;
}

interface ComponentMeta {
  name: string;
  category: string;
  path: string;
  description: string;
  muiBase?: string;
  props: PropMeta[];
  enums: EnumMeta[];
  themeOverridesFn?: string;
  testIds?: string;
}

interface ThemeMeta {
  createFunction: string;
  directions: string[];
  modes: string[];
  typography: Record<string, Record<string, string>>;
  paletteCategories: string[];
  customPaletteExtensions: {
    background: string[];
    text: string[];
    border: string[];
    action: string[];
  };
}

interface IconMeta {
  name: string;
  importPath: string;
  category: 'Custom' | 'Carbon';
}

interface Metadata {
  version: string;
  generatedAt: string;
  components: Record<string, ComponentMeta>;
  theme: ThemeMeta;
  icons: IconMeta[];
}

// ─── Paths (parent project) ──────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

// ─── Parse component exports from src/index.ts ──────────────────────────────

interface ComponentExport {
  name: string;
  relativePath: string;
  kind: 'atomic' | 'composite' | 'hidden' | 'prerequisite';
}

function parseComponentExports(): ComponentExport[] {
  const indexContent = fs.readFileSync(path.join(SRC, 'index.ts'), 'utf-8');
  const exports: ComponentExport[] = [];
  const seen = new Set<string>();

  const regex = /export\s*\{\s*default\s+as\s+(\w+)\s*\}\s*from\s*'\.\/([^']+)'/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(indexContent)) !== null) {
    const name = match[1];
    const relPath = match[2];
    if (seen.has(name)) continue;
    seen.add(name);

    let kind: ComponentExport['kind'] = 'atomic';
    if (relPath.startsWith('composite_components/')) kind = 'composite';
    else if (relPath.startsWith('hidden_components/')) kind = 'hidden';
    else if (relPath.startsWith('prerequisite_components/')) kind = 'prerequisite';

    exports.push({ name, relativePath: relPath, kind });
  }
  return exports;
}

// ─── Resolve main .tsx file for a component ──────────────────────────────────

function resolveComponentFile(relativePath: string): string | null {
  const fullDir = path.join(SRC, relativePath);

  if (fs.existsSync(fullDir + '.tsx')) return fullDir + '.tsx';

  if (fs.existsSync(fullDir) && fs.statSync(fullDir).isDirectory()) {
    const dirName = path.basename(fullDir);
    const mainFile = path.join(fullDir, `${dirName}.tsx`);
    if (fs.existsSync(mainFile)) return mainFile;

    // Follow index.ts re-exports
    const indexFile = path.join(fullDir, 'index.ts');
    if (fs.existsSync(indexFile)) {
      const indexContent = fs.readFileSync(indexFile, 'utf-8');
      const defaultExportMatch = indexContent.match(/export\s*\{\s*default\s*\}\s*from\s*'\.\/([^']+)'/);
      if (defaultExportMatch) {
        const target = defaultExportMatch[1];
        const candidates = [
          path.join(fullDir, target + '.tsx'),
          path.join(fullDir, target, path.basename(target) + '.tsx'),
        ];
        for (const c of candidates) {
          if (fs.existsSync(c)) return c;
        }
      }
    }
  }

  return null;
}

// ─── Extract props/enums from a single component file (regex-based) ──────────

function extractFromFile(filePath: string, componentName: string): {
  props: PropMeta[];
  enums: EnumMeta[];
  muiBase?: string;
  themeOverridesFn?: string;
  testIds?: string;
} {
  const content = fs.readFileSync(filePath, 'utf-8');
  const props: PropMeta[] = [];
  const enums: EnumMeta[] = [];
  let muiBase: string | undefined;
  let themeOverridesFn: string | undefined;
  let testIds: string | undefined;

  // ── Extract enums ──
  const enumRegex = /export\s+enum\s+(\w+)\s*\{([^}]+)\}/g;
  let enumMatch;
  while ((enumMatch = enumRegex.exec(content)) !== null) {
    const enumName = enumMatch[1];
    const body = enumMatch[2];
    const values: Record<string, string> = {};
    const memberRegex = /(\w+)\s*=\s*['"]?([^,\n'"]+)['"]?/g;
    let memberMatch;
    while ((memberMatch = memberRegex.exec(body)) !== null) {
      values[memberMatch[1]] = memberMatch[2].trim();
    }
    // Handle implicit enum values
    if (Object.keys(values).length === 0) {
      const simpleMembers = body.split(',').map(s => s.trim()).filter(Boolean);
      simpleMembers.forEach((m, i) => { values[m] = String(i); });
    }
    enums.push({ name: enumName, values });
    if (enumName.endsWith('TestIds')) {
      testIds = enumName;
    }
  }

  // ── Extract props from interface/type declarations ──
  // Match: export interface XxxProps extends MuiYyy { ... }
  // Also: export type XxxProps = MuiYyy & { ... }
  // Also: export type XxxProps = Omit<MuiYyy, ...> & { ... }
  const interfaceRegex = /export\s+(?:interface|type)\s+(\w*Props\w*)\s*(?:<[^>]*>)?\s*(?:extends\s+([^{]+?))?\s*(?:=\s*([^{]+?)&\s*)?\{/g;
  let ifMatch;
  while ((ifMatch = interfaceRegex.exec(content)) !== null) {
    const extendsClause = ifMatch[2] || ifMatch[3] || '';
    // Find the MUI base type
    const muiMatch = extendsClause.match(/(Mui\w+|Omit\s*<\s*Mui[^>]+>)/);
    if (muiMatch && !muiBase) {
      muiBase = muiMatch[1].trim();
    }

    // Extract the body of the interface/type using brace matching
    const startIdx = content.indexOf('{', ifMatch.index + ifMatch[0].length - 1);
    if (startIdx === -1) continue;

    let braceCount = 1;
    let idx = startIdx + 1;
    while (idx < content.length && braceCount > 0) {
      if (content[idx] === '{') braceCount++;
      if (content[idx] === '}') braceCount--;
      idx++;
    }
    const body = content.substring(startIdx + 1, idx - 1);

    // Parse individual props — support both semicolons and commas as separators
    // Also handle multi-line types like Array<...>, Function, React.ReactNode etc.
    const propRegex = /(?:\/\*\*([^*]*(?:\*[^/][^*]*)*)\*\/\s*)?(\w+)(\??)\s*:\s*([^,;\n]+(?:<[^>]*>)?(?:\s*\|[^,;\n]+)*)[,;\n]/g;
    let propMatch;
    while ((propMatch = propRegex.exec(body)) !== null) {
      const propName = propMatch[2];
      // Skip non-prop matches (e.g. variable declarations within functions)
      if (['return', 'const', 'let', 'var', 'if', 'else'].includes(propName)) continue;
      const description = propMatch[1]?.replace(/\s*\*\s*/g, ' ').trim();
      props.push({
        name: propName,
        type: propMatch[4].trim(),
        required: propMatch[3] !== '?',
        ...(description ? { description } : {}),
      });
    }
  }

  // ── Extract theme override function ──
  const themeOverrideRegex = /export\s+(?:const|function)\s+(getMui\w+ThemeOverrides)/;
  const tfMatch = content.match(themeOverrideRegex);
  if (tfMatch) {
    themeOverridesFn = tfMatch[1];
  }

  // Also look for secondary interfaces like ExtendedGridColDef that extend MUI types
  const secondaryInterfaceRegex = /export\s+interface\s+(\w+)\s+extends\s+(\w+)\s*\{/g;
  let secMatch;
  while ((secMatch = secondaryInterfaceRegex.exec(content)) !== null) {
    const name = secMatch[1];
    if (name.includes('Props')) continue; // already handled above
    const startIdx = content.indexOf('{', secMatch.index + secMatch[0].length - 1);
    if (startIdx === -1) continue;
    let braceCount = 1;
    let idx = startIdx + 1;
    while (idx < content.length && braceCount > 0) {
      if (content[idx] === '{') braceCount++;
      if (content[idx] === '}') braceCount--;
      idx++;
    }
    const body = content.substring(startIdx + 1, idx - 1);
    const secEnum: EnumMeta = { name, values: {} };
    const propRegex2 = /(\w+)(\??)\s*:\s*([^,;\n]+)[,;\n]/g;
    let pm;
    const additionalProps: PropMeta[] = [];
    while ((pm = propRegex2.exec(body)) !== null) {
      if (['return', 'const', 'let', 'var', 'if', 'else'].includes(pm[1])) continue;
      additionalProps.push({
        name: pm[1],
        type: pm[3].trim(),
        required: pm[2] !== '?',
      });
    }
    if (additionalProps.length > 0) {
      // Add these as a separate type entry in enums for reference
      enums.push({ name, values: Object.fromEntries(additionalProps.map(p => [p.name, p.type])) });
    }
  }

  return { props, enums, muiBase, themeOverridesFn, testIds };
}

// ─── Extract categories from Storybook story files ──────────────────────────

function extractCategories(): Record<string, string> {
  const categories: Record<string, string> = {};

  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        scanDir(path.join(dir, entry.name));
      } else if (entry.name.endsWith('.stories.tsx')) {
        const content = fs.readFileSync(path.join(dir, entry.name), 'utf-8');
        const titleMatch = content.match(/title:\s*'([^']+)'/);
        if (titleMatch) {
          const parts = titleMatch[1].split('/');
          if (parts.length >= 2) {
            const componentName = parts[parts.length - 1].replace(/\s*\(.*\)/, '');
            categories[componentName] = parts.slice(0, -1).join('/');
          }
        }
      }
    }
  }

  scanDir(SRC);
  return categories;
}

// ─── Extract theme metadata ─────────────────────────────────────────────────

function extractThemeMeta(): ThemeMeta {
  const themeFile = path.join(SRC, 'theme', 'index.ts');
  const content = fs.readFileSync(themeFile, 'utf-8');

  // Extract typography
  const typography: Record<string, Record<string, string>> = {};
  const typographySection = content.match(/export const TYPOGRAPHY[\s\S]*?^};/m);
  if (typographySection) {
    const variantRegex = /(\w+):\s*\{([^}]+)\}/g;
    let match;
    while ((match = variantRegex.exec(typographySection[0])) !== null) {
      const variant = match[1];
      if (variant === 'fontFamily') continue;
      const props: Record<string, string> = {};
      const propRegex = /(\w+):\s*'([^']+)'/g;
      let pm;
      while ((pm = propRegex.exec(match[2])) !== null) {
        props[pm[1]] = pm[2];
      }
      if (Object.keys(props).length > 0) {
        typography[variant] = props;
      }
    }
  }

  return {
    createFunction: 'createEnchantedTheme(direction: ThemeDirectionType, mode: ThemeModeType): Theme',
    directions: ['ltr', 'rtl'],
    modes: ['LightNeutralGrey', 'LightCoolGrey'],
    typography,
    paletteCategories: ['primary', 'error', 'warning', 'info', 'success', 'background', 'text', 'border', 'action', 'grey'],
    customPaletteExtensions: {
      background: ['secondary', 'tertiary', 'dark', 'overlay', 'success', 'info', 'warning', 'error', 'primary', 'inverse', 'tile'],
      text: ['hint', 'tertiary1', 'tertiary2', 'disabledInverse'],
      border: ['primary', 'secondary', 'hover', 'inverseSecondary', 'tertiary'],
      action: ['activeOpacity', 'selectedOpacityModified', 'selectedOpacityHover', 'hoverInverse', 'hoverOpacityModified', 'inverse', 'disabledInverse', 'disabledOpacityModified', 'focusOpacityModified', 'disableOpacityHover', 'focusInverse', 'selectedInverse'],
    },
  };
}

// ─── Extract icon index ──────────────────────────────────────────────────────

function extractIcons(): IconMeta[] {
  const icons: IconMeta[] = [];
  // Look in the parent project's node_modules
  const iconsRoot = path.join(ROOT, 'node_modules', '@hcl-software', 'enchanted-icons', 'dist');

  if (!fs.existsSync(iconsRoot)) {
    console.warn('⚠ @hcl-software/enchanted-icons not found. Run "npm install" in parent project first. Skipping icon extraction.');
    return icons;
  }

  function scanIconDir(dir: string, subFolder: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'utils') continue;
      const fullPath = path.join(dir, entry.name);
      const currentSubFolder = subFolder ? `${subFolder}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        scanIconDir(fullPath, currentSubFolder);
      } else if (entry.name === 'index.js') {
        const pathParts = subFolder.split('/');
        let iconBaseName = pathParts[pathParts.length - 1];
        if (pathParts.length > 3) {
          iconBaseName = `${pathParts[pathParts.length - 2]}-${iconBaseName}`;
        }

        const pascalName = _.upperFirst(_.camelCase(iconBaseName));
        const isCustom = subFolder.includes('apps/');
        const prefix = isCustom ? 'CustomIcon' : 'Icon';
        let name = `${prefix}${pascalName}`;

        if (iconBaseName === 'page--add' && isCustom) {
          name = 'CustomCustomIconPageAdd2';
        }

        icons.push({
          name,
          importPath: `@hcl-software/enchanted-icons/dist/${subFolder}`,
          category: isCustom ? 'Custom' : 'Carbon',
        });
      }
    }
  }

  scanIconDir(iconsRoot, '');
  return icons;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log('📦 Extracting metadata from Enchanted React Components...\n');

  // 1. Parse component exports
  const componentExports = parseComponentExports();
  console.log(`  Found ${componentExports.length} component exports`);

  // 2. Extract categories from story files
  const categories = extractCategories();

  // 3. Extract metadata for each component
  const components: Record<string, ComponentMeta> = {};
  for (const comp of componentExports) {
    const file = resolveComponentFile(comp.relativePath);
    const extracted = file ? extractFromFile(file, comp.name) : { props: [], enums: [] };

    // Assign category
    const categoryKey = comp.name;
    let category = categories[categoryKey] || '';
    if (!category) {
      if (comp.kind === 'composite') category = 'Composite';
      else if (comp.kind === 'hidden') category = 'Hidden';
      else if (comp.kind === 'prerequisite') category = 'Prerequisite';
      else category = 'Other';
    }

    components[comp.name] = {
      name: comp.name,
      category,
      path: comp.relativePath,
      description: `${comp.name} component${extracted.muiBase ? ` extending ${extracted.muiBase}` : ''} from the HCL Enchanted design system.`,
      muiBase: extracted.muiBase,
      props: extracted.props,
      enums: extracted.enums,
      themeOverridesFn: extracted.themeOverridesFn,
      testIds: extracted.testIds,
    };
  }
  console.log(`  Extracted metadata for ${Object.keys(components).length} components`);

  // 4. Extract theme
  const theme = extractThemeMeta();
  console.log('  Extracted theme metadata');

  // 5. Extract icons
  const icons = extractIcons();
  console.log(`  Indexed ${icons.length} icons`);

  // 6. Read version from parent package.json
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));

  // 7. Write metadata
  const metadata: Metadata = {
    version: pkg.version,
    generatedAt: new Date().toISOString(),
    components,
    theme,
    icons,
  };

  const outputPath = path.join(__dirname, 'metadata.json');
  fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));
  console.log(`\n✅ Metadata written to ${outputPath}`);
}

main();
