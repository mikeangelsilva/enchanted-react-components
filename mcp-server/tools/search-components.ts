/**
 * Tool: search_components
 *
 * Fuzzy search across component names, props, categories, and enums.
 */

import { z } from 'zod';
import { loadMetadata } from '../types.js';

export const searchComponentsSchema = {
  query: z.string().describe('Free-text search query (e.g. "select", "toggle", "form input")'),
};

export function searchComponents(args: { query: string }): string {
  const metadata = loadMetadata();
  const query = args.query.toLowerCase();
  const terms = query.split(/\s+/);

  interface ScoredComponent {
    name: string;
    score: number;
    matchReasons: string[];
  }

  const scored: ScoredComponent[] = [];

  for (const comp of Object.values(metadata.components)) {
    let score = 0;
    const reasons: string[] = [];

    for (const term of terms) {
      // Name match (highest weight)
      if (comp.name.toLowerCase().includes(term)) {
        score += 10;
        reasons.push(`name matches "${term}"`);
      }

      // Category match
      if (comp.category.toLowerCase().includes(term)) {
        score += 5;
        reasons.push(`category "${comp.category}" matches`);
      }

      // Description match
      if (comp.description.toLowerCase().includes(term)) {
        score += 3;
        reasons.push(`description matches`);
      }

      // Prop name match
      const matchingProps = comp.props.filter((p) =>
        p.name.toLowerCase().includes(term),
      );
      if (matchingProps.length > 0) {
        score += 2 * matchingProps.length;
        reasons.push(`props: ${matchingProps.map((p) => p.name).join(', ')}`);
      }

      // Enum name/value match
      for (const e of comp.enums) {
        if (e.name.toLowerCase().includes(term)) {
          score += 3;
          reasons.push(`enum "${e.name}"`);
        }
        const matchingValues = Object.keys(e.values).filter((v) =>
          v.toLowerCase().includes(term),
        );
        if (matchingValues.length > 0) {
          score += matchingValues.length;
          reasons.push(`enum values: ${matchingValues.join(', ')}`);
        }
      }

      // MUI base match
      if (comp.muiBase && comp.muiBase.toLowerCase().includes(term)) {
        score += 2;
        reasons.push(`MUI base: ${comp.muiBase}`);
      }
    }

    if (score > 0) {
      scored.push({ name: comp.name, score, matchReasons: [...new Set(reasons)] });
    }
  }

  if (scored.length === 0) {
    return `No components found matching "${args.query}". Try broader terms like "input", "data", "navigation", "feedback".`;
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 15);

  const lines = [
    `# Search Results for "${args.query}"`,
    '',
    `Found ${scored.length} matches (showing top ${top.length}):`,
    '',
  ];

  for (const result of top) {
    const comp = metadata.components[result.name];
    lines.push(`## ${result.name} (${comp.category})`);
    lines.push(`  ${comp.description}`);
    lines.push(`  Match reasons: ${result.matchReasons.join('; ')}`);
    if (comp.props.length > 0) {
      lines.push(`  Custom props: ${comp.props.map((p) => p.name).join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
