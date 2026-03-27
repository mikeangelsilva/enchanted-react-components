# Enchanted React Components — MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that exposes the [HCL Enchanted React Components](https://github.com/HCL-TECH-SOFTWARE/enchanted-react-components) library to AI assistants (Claude Desktop, Cursor, VS Code Copilot, and any MCP-compatible client).

Ask your AI assistant questions like:
- *"What components are available for form inputs?"*
- *"Show me the props for the DataGrid component"*
- *"Generate a login form using Enchanted components"*
- *"Find an arrow icon I can use"*

---

## Contents

- [Features](#features)
- [Setup](#setup)
- [Connecting to Clients](#connecting-to-clients)
  - [Claude Desktop](#claude-desktop)
  - [VS Code Copilot](#vs-code-copilot)
  - [Cursor](#cursor)
- [Tools Reference](#tools-reference)
- [Prompts Reference](#prompts-reference)
- [Updating Metadata](#updating-metadata)
- [Project Structure](#project-structure)

---

## Features

**7 MCP Tools:**
| Tool | Description |
|------|-------------|
| `list_components` | List all 57 components, optionally filtered by category |
| `get_component_props` | Full API reference: props, types, enums, MUI base |
| `get_component_example` | Live usage examples from Storybook story files |
| `get_theme_setup` | Theme setup code + palette and typography reference |
| `generate_component_usage` | Generate ready-to-paste component code |
| `search_components` | Fuzzy search across names, props, and categories |
| `search_icons` | Search ~1,910 icons from `@hcl-software/enchanted-icons` |

**3 MCP Prompts:**
| Prompt | Description |
|--------|-------------|
| `design-form` | Generate a complete form (TextField, Select, Checkbox, Radio, Button) |
| `design-data-view` | Generate a DataGrid-based data view with pagination / sorting |
| `setup-project` | Step-by-step setup guide for Vite, Next.js, or CRA |

---

## Setup

This is a self-contained project. The main library files are **not modified**.

```bash
# 1. Install dependencies
cd mcp-server
npm install

# 2. (Optional) Regenerate component metadata
#    Only needed if library components change.
npm run build-metadata
```

`metadata.json` is already committed and always up to date for the current library version — you typically don't need to regenerate it.

---

## Connecting to Clients

The server uses **stdio** transport — it runs as a local process that your AI client communicates with.

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "enchanted-react-components": {
      "command": "npx",
      "args": ["tsx", "index.ts"],
      "cwd": "/absolute/path/to/enchanted-react-components/mcp-server"
    }
  }
}
```

Replace `/absolute/path/to/enchanted-react-components` with the actual path on your machine. Restart Claude Desktop after saving.

### VS Code Copilot

Add to your VS Code `settings.json` (or workspace `.vscode/mcp.json`):

```json
{
  "mcp": {
    "servers": {
      "enchanted-react-components": {
        "type": "stdio",
        "command": "npx",
        "args": ["tsx", "index.ts"],
        "cwd": "/absolute/path/to/enchanted-react-components/mcp-server"
      }
    }
  }
}
```

Alternatively, the root-level `mcp.json` in this repo is pre-configured — open it in VS Code and click **Start** in the MCP panel.

### Cursor

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "enchanted-react-components": {
      "command": "npx",
      "args": ["tsx", "index.ts"],
      "cwd": "/absolute/path/to/enchanted-react-components/mcp-server"
    }
  }
}
```

### Verify the server is running

Use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) to test interactively:

```bash
cd mcp-server
npx @modelcontextprotocol/inspector npx tsx index.ts
```

Open the Inspector UI in your browser to call tools directly.

---

## Tools Reference

### `list_components`

Lists all available components, grouped by category.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by category (e.g. `"Inputs"`, `"Data display"`, `"Feedback"`, `"Navigation"`, `"Surfaces"`) |

**Example prompt:** *"List all input components"*

---

### `get_component_props`

Returns the full API reference for a component.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `componentName` | string | Yes | Component name, e.g. `"Button"`, `"DataGrid"`, `"TextField"` |

**Returns:** Custom props table, enums with values, MUI base type, theme override function name, test IDs enum.

**Example prompt:** *"Show me all props for the Autocomplete component"*

---

### `get_component_example`

Extracts a usage example from the component's Storybook story file (reads the file at runtime so it's always fresh).

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `componentName` | string | Yes | Component name |

**Returns:** Imports and JSX template code directly from the story file.

**Example prompt:** *"Give me an example of how to use the DataGrid"*

---

### `get_theme_setup`

Returns complete theme integration code.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mode` | `"LightNeutralGrey"` \| `"LightCoolGrey"` | No | Theme mode (default: `LightNeutralGrey`) |
| `direction` | `"ltr"` \| `"rtl"` | No | Text direction (default: `ltr`) |

**Returns:** `ThemeProvider` setup code, full typography scale, custom palette extensions.

**Example prompt:** *"How do I set up the Enchanted theme in my Next.js app?"*

---

### `generate_component_usage`

Generates complete, ready-to-paste component code with proper imports.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `componentName` | string | Yes | Component name |
| `variant` | string | No | Specific variant (e.g. `"contained"`, `"outlined"`) |
| `withTheme` | boolean | No | If `true`, wraps in `ThemeProvider`. Default: `false` |

**Example prompt:** *"Generate a contained Button with the theme provider"*

---

### `search_components`

Fuzzy search across component names, props, categories, and descriptions.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Free-text search (e.g. `"dropdown"`, `"toggle switch"`, `"data table"`) |

**Returns:** Ranked results with match reasons and prop summaries.

**Example prompt:** *"Find components related to date selection"*

---

### `search_icons`

Search the ~1,910 icons from `@hcl-software/enchanted-icons`.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search term (e.g. `"arrow"`, `"calendar"`, `"user"`, `"close"`) |
| `category` | `"Custom"` \| `"Carbon"` \| `"all"` | No | `Custom` = HCL app icons, `Carbon` = IBM Carbon icons |
| `limit` | number | No | Max results (default: 30, max: 50) |

**Returns:** Matching icon names with complete import statements ready to copy.

**Example prompt:** *"Find a trash/delete icon"*

---

## Prompts Reference

Prompts are pre-built templates that guide the AI to generate complete, production-ready code.

### `design-form`

Generates a complete form with validation, state management, and responsive layout.

**Arguments:**
- `fields` — Describe the form fields, e.g. `"first name, email, role dropdown (admin/editor/viewer), newsletter checkbox, submit and cancel buttons"`

**What you get:** Full React component with ThemeProvider, useState for each field, validation logic, error states, and Grid layout.

---

### `design-data-view`

Generates a DataGrid-based view with columns, pagination, and sorting.

**Arguments:**
- `columns` — Describe the columns, e.g. `"ID, user name with avatar, email, role chip (color-coded), created date, action buttons for edit and delete"`

**What you get:** Full React component with `ExtendedGridColDef` column definitions, pagination state, ThemeProvider, and sample data.

---

### `setup-project`

Generates step-by-step integration instructions.

**Arguments:**
- `framework` — `"vite"`, `"nextjs"`, or `"cra"` (default: `"vite"`)

**What you get:** Install commands, App root ThemeProvider setup, RTL configuration, font setup, and a first working component example.

---

## Updating Metadata

The `metadata.json` file contains pre-extracted component props, enums, categories, and the icon index. It is read-only at runtime.

Regenerate it after library updates:

```bash
cd mcp-server
npm run build-metadata
```

The extraction script reads from the parent project's `src/` directory and `node_modules/@hcl-software/enchanted-icons` — it does **not** modify any library files.

---

## Project Structure

```
mcp-server/
├── index.ts              # MCP server entry — registers all tools and prompts
├── types.ts              # Shared TypeScript interfaces and metadata loader
├── extract-metadata.ts   # Build-time script: generates metadata.json
├── metadata.json         # Pre-built component + icon index (committed)
├── package.json          # Self-contained dependencies
├── tsconfig.json         # TypeScript config
├── README.md             # This file
└── tools/
    ├── list-components.ts
    ├── get-component-props.ts
    ├── get-component-example.ts   # Reads .stories.tsx files at runtime
    ├── get-theme-setup.ts
    ├── generate-component-usage.ts
    ├── search-components.ts
    └── search-icons.ts
```

---

## Tech Stack

- **[`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk)** — official MCP TypeScript SDK
- **[`zod`](https://zod.dev/)** — runtime schema validation for tool inputs
- **[`tsx`](https://github.com/privatenumber/tsx)** — TypeScript runner (no build step needed)
- **Transport:** stdio (compatible with all major MCP clients)
