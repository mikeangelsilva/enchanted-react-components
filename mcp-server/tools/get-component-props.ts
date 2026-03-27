/**
 * Tool: get_component_props
 *
 * Returns the full API reference for a component: props, enums, MUI base type.
 */

import { z } from 'zod';
import { loadMetadata } from '../types.js';

export const getComponentPropsSchema = {
  componentName: z.string().describe('Component name (e.g. "Button", "DataGrid", "TextField")'),
};

export function getComponentProps(args: { componentName: string }): string {
  const metadata = loadMetadata();
  const comp = metadata.components[args.componentName];

  if (!comp) {
    const available = Object.keys(metadata.components).sort();
    const suggestions = available.filter((n) =>
      n.toLowerCase().includes(args.componentName.toLowerCase()),
    );
    return `Component "${args.componentName}" not found.\n\n${
      suggestions.length > 0
        ? `Did you mean: ${suggestions.join(', ')}?`
        : `Available components: ${available.join(', ')}`
    }`;
  }

  const lines: string[] = [
    `# ${comp.name}`,
    '',
    comp.description,
    '',
    `**Category:** ${comp.category}`,
    `**Import:** \`import ${comp.name} from '@hcl-software/enchanted-react-components/dist/${comp.path}'\``,
  ];

  if (comp.muiBase) {
    lines.push(`**Extends:** \`${comp.muiBase}\` (all MUI base props are inherited)`);
  }

  // Props table
  if (comp.props.length > 0) {
    lines.push('', '## Custom Props', '');
    lines.push('| Prop | Type | Required | Description |');
    lines.push('|------|------|----------|-------------|');
    for (const prop of comp.props) {
      const req = prop.required ? '✅' : '—';
      const desc = prop.description || '';
      lines.push(`| \`${prop.name}\` | \`${prop.type}\` | ${req} | ${desc} |`);
    }
  } else {
    lines.push('', '_No custom props — this component passes through all MUI base props._');
  }

  // Enums
  if (comp.enums.length > 0) {
    lines.push('', '## Enums / Types', '');
    for (const e of comp.enums) {
      lines.push(`### ${e.name}`);
      lines.push('```typescript');
      lines.push(`enum ${e.name} {`);
      for (const [key, val] of Object.entries(e.values)) {
        lines.push(`  ${key} = '${val}',`);
      }
      lines.push('}');
      lines.push('```');
      lines.push('');
    }
  }

  if (comp.themeOverridesFn) {
    lines.push(`**Theme overrides:** \`${comp.themeOverridesFn}()\``);
  }

  if (comp.testIds) {
    lines.push(`**Test IDs:** \`${comp.testIds}\``);
  }

  return lines.join('\n');
}
