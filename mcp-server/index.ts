/**
 * MCP Server for HCL Enchanted React Components
 *
 * Exposes component discovery, props reference, usage examples, theme setup,
 * code generation, and icon search to AI assistants via the Model Context Protocol.
 *
 * Transport: stdio
 * Usage: npx tsx index.ts
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { listComponents, listComponentsSchema } from './tools/list-components.js';
import { getComponentProps, getComponentPropsSchema } from './tools/get-component-props.js';
import { getComponentExample, getComponentExampleSchema } from './tools/get-component-example.js';
import { getThemeSetup, getThemeSetupSchema } from './tools/get-theme-setup.js';
import { generateComponentUsage, generateComponentUsageSchema } from './tools/generate-component-usage.js';
import { searchComponents, searchComponentsSchema } from './tools/search-components.js';
import { searchIcons, searchIconsSchema } from './tools/search-icons.js';

// ─── Server setup ────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'enchanted-react-components',
  version: '1.0.0',
});

// ─── Tools ───────────────────────────────────────────────────────────────────

server.tool(
  'list_components',
  'List all available Enchanted React Components, optionally filtered by category (Inputs, Data display, Feedback, Navigation, Surfaces, Composite, Hidden).',
  listComponentsSchema,
  async (args) => {
    return { content: [{ type: 'text', text: listComponents(args) }] };
  },
);

server.tool(
  'get_component_props',
  'Get the full API reference for a component: custom props, types, enums, MUI base type, theme override function, and test IDs.',
  getComponentPropsSchema,
  async (args) => {
    return { content: [{ type: 'text', text: getComponentProps(args) }] };
  },
);

server.tool(
  'get_component_example',
  'Get a usage example for a component extracted from its Storybook story file. Returns imports and JSX template code.',
  getComponentExampleSchema,
  async (args) => {
    return { content: [{ type: 'text', text: getComponentExample(args) }] };
  },
);

server.tool(
  'get_theme_setup',
  'Get the theme setup code for integrating the Enchanted design system into a project. Returns ThemeProvider setup, palette info, and typography scale.',
  getThemeSetupSchema,
  async (args) => {
    return { content: [{ type: 'text', text: getThemeSetup(args) }] };
  },
);

server.tool(
  'generate_component_usage',
  'Generate ready-to-paste code for using a component with proper imports, optional ThemeProvider wrapper, and placeholder props.',
  generateComponentUsageSchema,
  async (args) => {
    return { content: [{ type: 'text', text: generateComponentUsage(args) }] };
  },
);

server.tool(
  'search_components',
  'Search for components by name, props, category, or description. Returns ranked results with match reasons.',
  searchComponentsSchema,
  async (args) => {
    return { content: [{ type: 'text', text: searchComponents(args) }] };
  },
);

server.tool(
  'search_icons',
  'Search the ~2,000 icons from @hcl-software/enchanted-icons by name or keyword. Returns icon names with full import paths. Filter by category (Custom = HCL, Carbon = IBM).',
  searchIconsSchema,
  async (args) => {
    return { content: [{ type: 'text', text: searchIcons(args) }] };
  },
);

// ─── Prompts ─────────────────────────────────────────────────────────────────

server.prompt(
  'design-form',
  'Generate a complete form using Enchanted components (TextField, Select, Checkbox, Radio, Button) with ThemeProvider, validation patterns, and responsive layout.',
  { fields: z.string().describe('Describe the form fields you need, e.g. "name, email, role dropdown, terms checkbox, submit button"') },
  async (args) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Design a React form using HCL Enchanted React Components with these fields: ${args.fields}

Requirements:
1. Use "import ... from '@hcl-software/enchanted-react-components/dist/...'" for all imports
2. Wrap the form in a ThemeProvider with createEnchantedTheme(ThemeDirectionType.LTR, ThemeModeType.LIGHT_NEUTRAL_GREY)
3. Use these components as appropriate:
   - TextField for text inputs (supports nonEdit, helperText, helperIconTooltip, actionProps)
   - Select for dropdowns (supports helperText, unitLabel)
   - Checkbox for checkboxes (with FormControlLabel)
   - Radio with RadioGroup for radio selections
   - Button with variant="contained" for submit, variant="outlined" for cancel
4. Add proper form state management with React.useState
5. Add basic validation (required fields, email format, etc.)
6. Use a responsive Grid layout from @mui/material
7. Include error states using the error prop on form components
8. Add helper text for validation messages

Use the get_component_props and get_component_example tools to look up exact prop types if needed.`,
        },
      },
    ],
  }),
);

server.prompt(
  'design-data-view',
  'Generate a DataGrid-based data view with column definitions, pagination, sorting, and toolbar using Enchanted components.',
  { columns: z.string().describe('Describe the data columns, e.g. "ID, Name with avatar, Status chip, Actions with edit/delete buttons"') },
  async (args) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Design a data view using HCL Enchanted React Components DataGrid with these columns: ${args.columns}

Requirements:
1. Use "import DataGrid from '@hcl-software/enchanted-react-components/dist/DataGrid'"
2. Define columns using the ExtendedGridColDef interface which extends GridColDef with:
   - iconEnd, iconStart, avatar, endActions, showSortingIcon, tooltip, subTitle
3. Include DataGridProps: totalCount, page, pageSize, translation, rowsPerPageOptions
4. Add pagination state management
5. Wrap in ThemeProvider with createEnchantedTheme
6. For status columns, use Chip components
7. For action columns, use IconButton with enchanted-icons
8. Include sample data array with TypeScript interfaces

Use the get_component_props tool to look up DataGrid and DataGridCell props.`,
        },
      },
    ],
  }),
);

server.prompt(
  'setup-project',
  'Generate step-by-step setup instructions to integrate the Enchanted component library into a new or existing project.',
  { framework: z.string().optional().describe('Target framework: "vite", "nextjs", or "cra". Default: vite') },
  async (args) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Generate step-by-step instructions to set up HCL Enchanted React Components in a ${args.framework || 'Vite'} project.

Include:
1. Package installation commands:
   - @hcl-software/enchanted-react-components
   - @hcl-software/enchanted-icons
   - @emotion/react @emotion/styled
   - @mui/material @mui/x-data-grid @mui/x-date-pickers
   - dayjs (for date picker)

2. App root setup with ThemeProvider:
   - Import createEnchantedTheme, ThemeDirectionType, ThemeModeType from .../dist/theme
   - Wrap app in ThemeProvider + CssBaseline

3. For RTL support:
   - Import DirectionStyleProvider
   - Set ThemeDirectionType.RTL
   - Wrap with DirectionStyleProvider

4. First component example: a simple page with Button, TextField, and Typography

5. Font setup: add Inter font from Google Fonts

Use the get_theme_setup tool to get the exact theme setup code.`,
        },
      },
    ],
  }),
);

// ─── Start server ────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('Enchanted React Components MCP server running on stdio\n');
}

main().catch((err) => {
  process.stderr.write(`Failed to start MCP server: ${err}\n`);
  process.exit(1);
});
