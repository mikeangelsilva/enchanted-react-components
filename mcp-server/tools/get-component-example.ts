/**
 * Tool: get_component_example
 *
 * Reads Storybook story files at runtime to extract usage examples.
 */

import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { loadMetadata, SRC_DIR } from '../types.js';

export const getComponentExampleSchema = {
  componentName: z.string().describe('Component name (e.g. "Button", "DataGrid", "TextField")'),
};

function findStoryFile(componentPath: string): string | null {
  const fullDir = path.join(SRC_DIR, componentPath);

  // Direct directory
  if (fs.existsSync(fullDir) && fs.statSync(fullDir).isDirectory()) {
    const dirName = path.basename(fullDir);
    const storyFile = path.join(fullDir, `${dirName}.stories.tsx`);
    if (fs.existsSync(storyFile)) return storyFile;

    // Try any .stories.tsx in the directory
    const files = fs.readdirSync(fullDir);
    const story = files.find((f) => f.endsWith('.stories.tsx'));
    if (story) return path.join(fullDir, story);
  }

  // For paths like ProgressIndicator/CircularProgress
  const parent = path.dirname(fullDir);
  const base = path.basename(fullDir);
  const storyInParent = path.join(parent, `${base}.stories.tsx`);
  if (fs.existsSync(storyInParent)) return storyInParent;

  return null;
}

function extractExampleFromStory(content: string, componentName: string): string {
  // Try to find the Interactive/Example template first
  const templateNames = [
    'InteractiveExampleTemplate',
    'InteractiveExample',
    'ExampleTemplate',
    'VisualTest',
    'Template',
  ];

  for (const tmpl of templateNames) {
    const regex = new RegExp(`const\\s+${tmpl}[^=]*=\\s*\\([^)]*\\)\\s*(?:=>)?\\s*(?:\\{[\\s\\S]*?^\\};|\\([\\s\\S]*?^\\);|<[\\s\\S]*?^\\);)`, 'gm');
    const match = content.match(regex);
    if (match) {
      return match[0];
    }
  }

  // Fall back: extract the first story that has a render or bind
  const storyRegex = /export const \w+ = \{[\s\S]*?\n\};/gm;
  const storyMatch = content.match(storyRegex);
  if (storyMatch) {
    return storyMatch[0];
  }

  // Last resort: extract everything between the first Template and its bind
  const simpleMatch = content.match(/const Template[\s\S]*?\.bind\(\{\}\);/);
  if (simpleMatch) {
    return simpleMatch[0];
  }

  return '// No example template found in story file';
}

export function getComponentExample(args: { componentName: string }): string {
  const metadata = loadMetadata();
  const comp = metadata.components[args.componentName];

  if (!comp) {
    const suggestions = Object.keys(metadata.components)
      .filter((n) => n.toLowerCase().includes(args.componentName.toLowerCase()))
      .sort();
    return `Component "${args.componentName}" not found.${
      suggestions.length > 0 ? ` Did you mean: ${suggestions.join(', ')}?` : ''
    }`;
  }

  const storyFile = findStoryFile(comp.path);
  if (!storyFile) {
    return `No story file found for ${comp.name}. You can use the component like:\n\n\`\`\`tsx\nimport ${comp.name} from '@hcl-software/enchanted-react-components/dist/${comp.path}';\n\n<${comp.name} />\n\`\`\``;
  }

  const content = fs.readFileSync(storyFile, 'utf-8');

  // Extract imports
  const importLines = content
    .split('\n')
    .filter((line) => line.startsWith('import '))
    .filter((line) => !line.includes('@storybook'))
    .join('\n');

  // Extract example template
  const example = extractExampleFromStory(content, comp.name);

  // Extract default args if available
  let defaultArgs = '';
  const argsMatch = content.match(/\.args\s*=\s*\{[\s\S]*?\n\};/);
  if (argsMatch) {
    defaultArgs = `\n// Default args:\n${argsMatch[0]}`;
  }

  const lines = [
    `# ${comp.name} — Usage Example`,
    '',
    `Source: ${path.basename(storyFile)}`,
    '',
    '## Imports',
    '```tsx',
    importLines,
    '```',
    '',
    '## Example',
    '```tsx',
    example,
    '```',
  ];

  if (defaultArgs) {
    lines.push('', '## Default Props', '```tsx', defaultArgs, '```');
  }

  return lines.join('\n');
}
