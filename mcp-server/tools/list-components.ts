/**
 * Tool: list_components
 *
 * Lists all available components, optionally filtered by category.
 */

import { z } from 'zod';
import { loadMetadata } from '../types.js';

export const listComponentsSchema = {
  category: z.string().optional().describe(
    'Filter by category (e.g. "Inputs", "Data display", "Feedback", "Navigation", "Surfaces", "Composite", "Hidden")',
  ),
};

export function listComponents(args: { category?: string }): string {
  const metadata = loadMetadata();
  const components = Object.values(metadata.components);

  let filtered = components;
  if (args.category) {
    const cat = args.category.toLowerCase();
    filtered = components.filter(
      (c) => c.category.toLowerCase().includes(cat),
    );
  }

  if (filtered.length === 0) {
    const categories = [...new Set(components.map((c) => c.category))].sort();
    return `No components found for category "${args.category}".\n\nAvailable categories:\n${categories.map((c) => `  - ${c}`).join('\n')}`;
  }

  // Group by category
  const grouped: Record<string, typeof filtered> = {};
  for (const comp of filtered) {
    const cat = comp.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(comp);
  }

  const lines: string[] = [`# Enchanted React Components (v${metadata.version})`, ''];
  for (const [category, comps] of Object.entries(grouped).sort()) {
    lines.push(`## ${category}`);
    for (const comp of comps.sort((a, b) => a.name.localeCompare(b.name))) {
      const propCount = comp.props.length;
      const muiInfo = comp.muiBase ? ` (extends ${comp.muiBase})` : '';
      lines.push(`  - **${comp.name}**${muiInfo} — ${propCount} custom props`);
    }
    lines.push('');
  }

  lines.push(`Total: ${filtered.length} components`);
  return lines.join('\n');
}
