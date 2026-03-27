/**
 * Tool: search_icons
 *
 * Search/list icons from @hcl-software/enchanted-icons (~2,000 icons).
 */

import { z } from 'zod';
import { loadMetadata } from '../types.js';

export const searchIconsSchema = {
  query: z.string().describe('Search query for icon names (e.g. "arrow", "add", "calendar", "user")'),
  category: z
    .enum(['Custom', 'Carbon', 'all'])
    .optional()
    .describe('Filter by icon category. "Custom" = HCL app icons, "Carbon" = IBM Carbon icons. Default: all'),
  limit: z.number().optional().describe('Max results to return (default: 30, max: 50)'),
};

export function searchIcons(args: {
  query: string;
  category?: string;
  limit?: number;
}): string {
  const metadata = loadMetadata();
  const query = args.query.toLowerCase();
  const limit = Math.min(args.limit || 30, 50);

  let icons = metadata.icons;

  // Filter by category
  if (args.category && args.category !== 'all') {
    icons = icons.filter((i) => i.category === args.category);
  }

  // Search by name
  const terms = query.split(/\s+/);
  const matching = icons.filter((icon) => {
    const nameLower = icon.name.toLowerCase();
    const pathLower = icon.importPath.toLowerCase();
    return terms.every((term) => nameLower.includes(term) || pathLower.includes(term));
  });

  if (matching.length === 0) {
    return `No icons found matching "${args.query}".${
      args.category ? ` (filtered to ${args.category} category)` : ''
    }\n\nTry simpler terms like "arrow", "add", "user", "edit", "close", "search".`;
  }

  const shown = matching.slice(0, limit);

  const lines = [
    `# Icon Search: "${args.query}"`,
    '',
    `Found ${matching.length} icons${matching.length > limit ? ` (showing first ${limit})` : ''}:`,
    '',
    '## Usage',
    '```tsx',
    "// Import an icon:",
    `import IconName from '${shown[0].importPath}';`,
    '',
    '// Use in JSX:',
    '<IconName fontSize="small" color="primary" />',
    '```',
    '',
    '## Results',
    '',
  ];

  // Group by category
  const custom = shown.filter((i) => i.category === 'Custom');
  const carbon = shown.filter((i) => i.category === 'Carbon');

  if (custom.length > 0) {
    lines.push(`### Custom (HCL) — ${custom.length} matches`);
    for (const icon of custom) {
      lines.push(`- **${icon.name}** — \`import ${icon.name} from '${icon.importPath}'\``);
    }
    lines.push('');
  }

  if (carbon.length > 0) {
    lines.push(`### Carbon (IBM) — ${carbon.length} matches`);
    for (const icon of carbon) {
      lines.push(`- **${icon.name}** — \`import ${icon.name} from '${icon.importPath}'\``);
    }
    lines.push('');
  }

  if (matching.length > limit) {
    lines.push(`_...and ${matching.length - limit} more. Refine your search for more specific results._`);
  }

  return lines.join('\n');
}
