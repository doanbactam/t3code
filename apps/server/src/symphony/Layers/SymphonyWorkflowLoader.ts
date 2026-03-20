/**
 * SymphonyWorkflowLoader - Effect layer implementation.
 *
 * Loads and parses WORKFLOW.md files with YAML front matter.
 *
 * @module symphony/Layers/SymphonyWorkflowLoader
 */
import type { SymphonyWorkflow, SymphonyWorkflowConfig } from "@t3tools/contracts";
import { Effect, FileSystem, Layer, Stream } from "effect";
import * as path from "node:path";

import { SymphonyWorkflowError } from "../Errors.ts";
import {
  SymphonyWorkflowLoader,
  type ParsedWorkflowFile,
} from "../Services/SymphonyWorkflowLoader.ts";

const WORKFLOW_FILE = "WORKFLOW.md";

/**
 * Default workflow configuration.
 */
const DEFAULT_CONFIG: SymphonyWorkflowConfig = {
  agent: {
    maxConcurrency: 1,
    maxRetries: 3,
    maxRetryBackoffMs: 30000,
    turnTimeoutMs: 600000,
    stallTimeoutMs: 60000,
  },
  hooks: {
    timeoutMs: 30000,
  },
};

/**
 * Default prompt template when no WORKFLOW.md exists.
 */
const DEFAULT_PROMPT_TEMPLATE = `You are an autonomous agent working on the following task:

**Task:** {{task.title}}

**Description:**
{{task.description}}

**Priority:** {{task.priority}}
**Labels:** {{task.labels}}

Please complete this task autonomously. When you're done, provide a summary of what was accomplished.`;

/**
 * Parse YAML front matter from markdown content.
 */
function parseFrontMatter(content: string): { frontMatter: string; body: string } | null {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  return {
    frontMatter: match[1] ?? "",
    body: match[2] ?? "",
  };
}

/**
 * Parse YAML config string into SymphonyWorkflowConfig.
 */
function parseYamlConfig(yaml: string): Partial<SymphonyWorkflowConfig> {
  const result: Partial<SymphonyWorkflowConfig> = {
    agent: { ...DEFAULT_CONFIG.agent },
    hooks: { ...DEFAULT_CONFIG.hooks },
  };
  const lines = yaml.split("\n");
  let currentSection: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (!line.startsWith(" ") && !line.startsWith("\t") && trimmed.endsWith(":")) {
      currentSection = trimmed.slice(0, -1);
      continue;
    }

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    let value: string | number = trimmed.slice(colonIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (/^\d+$/.test(value)) {
      value = parseInt(value, 10);
    }

    if (currentSection === "agent" && result.agent) {
      (result.agent as Record<string, unknown>)[key] = value;
    } else if (currentSection === "hooks" && result.hooks) {
      (result.hooks as Record<string, unknown>)[key] = value;
    }
  }

  return result;
}

const makeSymphonyWorkflowLoader = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;

  const getDefault = (): ParsedWorkflowFile => ({
    frontMatter: null,
    config: DEFAULT_CONFIG,
    promptTemplate: DEFAULT_PROMPT_TEMPLATE,
    workflow: {
      config: DEFAULT_CONFIG,
      promptTemplate: DEFAULT_PROMPT_TEMPLATE,
    },
  });

  const load = (projectId: string, projectRoot: string) =>
    Effect.gen(function* () {
      const filePath = path.join(projectRoot, WORKFLOW_FILE);

      const exists = yield* fs.exists(filePath).pipe(
        Effect.mapError(
          (cause) =>
            new SymphonyWorkflowError({
              reason: "file_not_found",
              message: `Failed to check workflow file: ${filePath}`,
              cause,
            }),
        ),
      );

      if (!exists) {
        return getDefault();
      }

      const content = yield* fs.readFileString(filePath).pipe(
        Effect.mapError(
          (cause) =>
            new SymphonyWorkflowError({
              reason: "parse_error",
              message: `Failed to read workflow file: ${filePath}`,
              cause,
            }),
        ),
      );

      const parsed = parseFrontMatter(content);

      if (!parsed) {
        return {
          frontMatter: null,
          config: DEFAULT_CONFIG,
          promptTemplate: content.trim(),
          workflow: {
            config: DEFAULT_CONFIG,
            promptTemplate: content.trim(),
          },
        };
      }

      const partialConfig = parseYamlConfig(parsed.frontMatter);
      const promptTemplate = parsed.body.trim();

      return {
        frontMatter: parsed.frontMatter,
        config: partialConfig ?? DEFAULT_CONFIG,
        promptTemplate,
        workflow: {
          config: partialConfig ?? DEFAULT_CONFIG,
          promptTemplate,
        } satisfies SymphonyWorkflow,
      };
    });

  // Simple watch implementation - just return a single-element stream
  // Real file watching can be added later
  const watch = (projectId: string, projectRoot: string) =>
    Stream.fromEffect(load(projectId, projectRoot));

  return {
    load,
    watch,
    getDefault,
  } satisfies typeof SymphonyWorkflowLoader.Service;
});

export const SymphonyWorkflowLoaderLive = Layer.effect(
  SymphonyWorkflowLoader,
  makeSymphonyWorkflowLoader,
);
