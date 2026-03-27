/**
 * Tool: generate_component_usage
 *
 * Generates ready-to-paste code for using a component with proper imports.
 */

import { z } from 'zod';
import { loadMetadata } from '../types.js';

export const generateComponentUsageSchema = {
  componentName: z.string().describe('Component name (e.g. "Button", "DataGrid", "TextField")'),
  variant: z.string().optional().describe('Specific variant to use (e.g. "contained", "outlined"). Uses component default if not specified.'),
  withTheme: z.boolean().optional().describe('If true, wraps the usage in a ThemeProvider with createEnchantedTheme. Default: false.'),
};

export function generateComponentUsage(args: {
  componentName: string;
  variant?: string;
  withTheme?: boolean;
}): string {
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

  const lines: string[] = [];

  // Build imports
  const imports: string[] = [
    `import ${comp.name} from '@hcl-software/enchanted-react-components/dist/${comp.path}';`,
  ];

  // Add enum imports if any have Variants in the name
  const variantEnum = comp.enums.find((e) => e.name.includes('Variant'));
  if (variantEnum) {
    imports.push(
      `import { ${variantEnum.name} } from '@hcl-software/enchanted-react-components/dist/${comp.path}';`,
    );
  }

  if (args.withTheme) {
    imports.unshift(
      `import { ThemeProvider } from '@mui/material/styles';`,
      `import CssBaseline from '@mui/material/CssBaseline';`,
      `import { createEnchantedTheme, ThemeDirectionType, ThemeModeType } from '@hcl-software/enchanted-react-components/dist/theme';`,
    );
  }

  lines.push('```tsx');
  lines.push(`import React from 'react';`);
  lines.push(...imports);
  lines.push('');

  if (args.withTheme) {
    lines.push(
      'const theme = createEnchantedTheme(ThemeDirectionType.LTR, ThemeModeType.LIGHT_NEUTRAL_GREY);',
      '',
    );
  }

  // Build JSX props
  const jsxProps: string[] = [];

  // Add variant if specified or if there's a variant enum
  if (args.variant) {
    jsxProps.push(`  variant="${args.variant}"`);
  } else if (variantEnum) {
    const firstValue = Object.values(variantEnum.values)[0];
    jsxProps.push(`  variant={${variantEnum.name}.${Object.keys(variantEnum.values)[0]}}`);
  }

  // Add required props with placeholder values
  for (const prop of comp.props) {
    if (prop.required && prop.name !== 'variant') {
      const placeholder = getPlaceholderValue(prop);
      jsxProps.push(`  ${prop.name}={${placeholder}}`);
    }
  }

  // Component usage
  const componentName = `Example${comp.name}`;
  lines.push(`function ${componentName}() {`);
  lines.push('  return (');

  if (args.withTheme) {
    lines.push('    <ThemeProvider theme={theme}>');
    lines.push('      <CssBaseline />');
  }

  const indent = args.withTheme ? '      ' : '    ';

  if (jsxProps.length > 0) {
    lines.push(`${indent}<${comp.name}`);
    for (const prop of jsxProps) {
      lines.push(`${indent}${prop}`);
    }
    // Check if it's likely a self-closing component or has children
    const hasChildren = isChildrenComponent(comp.name);
    if (hasChildren) {
      lines.push(`${indent}>`);
      lines.push(`${indent}  {/* children */}`);
      lines.push(`${indent}</${comp.name}>`);
    } else {
      lines.push(`${indent}/>`);
    }
  } else {
    const hasChildren = isChildrenComponent(comp.name);
    if (hasChildren) {
      lines.push(`${indent}<${comp.name}>{/* children */}</${comp.name}>`);
    } else {
      lines.push(`${indent}<${comp.name} />`);
    }
  }

  if (args.withTheme) {
    lines.push('    </ThemeProvider>');
  }

  lines.push('  );');
  lines.push('}');
  lines.push('```');

  // Add prop documentation
  if (comp.props.length > 0) {
    lines.push('', '## Available Custom Props');
    for (const prop of comp.props) {
      lines.push(`- \`${prop.name}${prop.required ? '' : '?'}: ${prop.type}\`${prop.description ? ` — ${prop.description}` : ''}`);
    }
  }

  if (comp.enums.length > 0) {
    lines.push('', '## Available Enums');
    for (const e of comp.enums) {
      lines.push(`- \`${e.name}\`: ${Object.keys(e.values).join(', ')}`);
    }
  }

  return lines.join('\n');
}

function getPlaceholderValue(prop: { name: string; type: string }): string {
  const t = prop.type.toLowerCase();
  if (t === 'string') return `"${prop.name}"`;
  if (t === 'number') return '0';
  if (t === 'boolean') return 'true';
  if (t.includes('function')) return '() => {}';
  if (t.startsWith('array') || t.startsWith('Array')) return '[]';
  if (t.includes('ReactNode') || t.includes('React.ReactNode')) return '""';
  if (prop.name === 'onClose' || prop.name.startsWith('on')) return '() => {}';
  if (prop.name === 'translation') return '{ of: "of" }';
  return `undefined /* ${prop.type} */`;
}

function isChildrenComponent(name: string): boolean {
  const childrenComponents = [
    'Button', 'Dialog', 'Panel', 'Accordion', 'Typography', 'Link',
    'Tooltip', 'Paper', 'Drawer', 'Tabs', 'List', 'Menu', 'Snackbar',
    'Alert', 'Backdrop', 'ButtonGroup',
  ];
  return childrenComponents.includes(name);
}
