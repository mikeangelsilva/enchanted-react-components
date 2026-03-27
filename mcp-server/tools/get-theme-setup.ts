/**
 * Tool: get_theme_setup
 *
 * Returns theme setup code and palette info for the Enchanted design system.
 */

import { z } from 'zod';
import { loadMetadata } from '../types.js';

export const getThemeSetupSchema = {
  mode: z.enum(['LightNeutralGrey', 'LightCoolGrey']).optional().describe('Theme mode (default: LightNeutralGrey)'),
  direction: z.enum(['ltr', 'rtl']).optional().describe('Text direction (default: ltr)'),
};

export function getThemeSetup(args: { mode?: string; direction?: string }): string {
  const metadata = loadMetadata();
  const theme = metadata.theme;
  const mode = args.mode || 'LightNeutralGrey';
  const direction = args.direction || 'ltr';

  const lines = [
    '# Enchanted Theme Setup',
    '',
    '## Installation',
    '```bash',
    'npm install @hcl-software/enchanted-react-components @emotion/react @emotion/styled @mui/material',
    '```',
    '',
    '## Theme Provider Setup',
    '```tsx',
    "import React from 'react';",
    "import { ThemeProvider } from '@mui/material/styles';",
    "import CssBaseline from '@mui/material/CssBaseline';",
    `import { createEnchantedTheme, ThemeDirectionType, ThemeModeType } from '@hcl-software/enchanted-react-components/dist/theme';`,
    '',
    `const theme = createEnchantedTheme(ThemeDirectionType.${direction === 'rtl' ? 'RTL' : 'LTR'}, ThemeModeType.${mode === 'LightCoolGrey' ? 'LIGHT_COOL_GREY' : 'LIGHT_NEUTRAL_GREY'});`,
    '',
    'function App({ children }: { children: React.ReactNode }) {',
    '  return (',
    '    <ThemeProvider theme={theme}>',
    '      <CssBaseline />',
    '      {children}',
    '    </ThemeProvider>',
    '  );',
    '}',
    '```',
    '',
    `## Function Signature`,
    `\`${theme.createFunction}\``,
    '',
    '## Available Modes',
    ...theme.modes.map((m) => `  - \`ThemeModeType.${m === 'LightNeutralGrey' ? 'LIGHT_NEUTRAL_GREY' : 'LIGHT_COOL_GREY'}\` — ${m}`),
    '',
    '## Available Directions',
    ...theme.directions.map((d) => `  - \`ThemeDirectionType.${d.toUpperCase()}\` — ${d}`),
    '',
    '## Custom Palette Extensions',
    'The Enchanted theme extends MUI\'s default palette with these additional properties:',
    '',
    '### Background',
    `Standard MUI: \`default\`, \`paper\`  `,
    `Custom: ${theme.customPaletteExtensions.background.map(p => `\`${p}\``).join(', ')}`,
    '',
    '### Text',
    `Standard MUI: \`primary\`, \`secondary\`, \`disabled\`  `,
    `Custom: ${theme.customPaletteExtensions.text.map(p => `\`${p}\``).join(', ')}`,
    '',
    '### Border (custom category)',
    theme.customPaletteExtensions.border.map(p => `\`${p}\``).join(', '),
    '',
    '### Action',
    `Custom additions: ${theme.customPaletteExtensions.action.map(p => `\`${p}\``).join(', ')}`,
    '',
    '## Typography Scale',
    '```',
    'Font family: Inter, sans-serif',
    '',
  ];

  for (const [variant, props] of Object.entries(theme.typography)) {
    const vals = Object.entries(props)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    lines.push(`${variant}: ${vals}`);
  }
  lines.push('```');

  return lines.join('\n');
}
