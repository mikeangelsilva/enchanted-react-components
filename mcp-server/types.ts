/**
 * Shared types and utilities for the MCP server tools.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PropMeta {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface EnumMeta {
  name: string;
  values: Record<string, string>;
}

export interface ComponentMeta {
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

export interface ThemeMeta {
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

export interface IconMeta {
  name: string;
  importPath: string;
  category: 'Custom' | 'Carbon';
}

export interface Metadata {
  version: string;
  generatedAt: string;
  components: Record<string, ComponentMeta>;
  theme: ThemeMeta;
  icons: IconMeta[];
}

// ─── Load metadata ──────────────────────────────────────────────────────────

let _metadata: Metadata | null = null;

export function loadMetadata(): Metadata {
  if (!_metadata) {
    const metadataPath = path.join(__dirname, 'metadata.json');
    _metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  }
  return _metadata!;
}

// ─── Parent project root ────────────────────────────────────────────────────

export const PROJECT_ROOT = path.resolve(__dirname, '..');
export const SRC_DIR = path.join(PROJECT_ROOT, 'src');
