/**
 * SymphonyWorkflowLoader - Service interface for loading and parsing WORKFLOW.md files.
 *
 * Reads workflow configuration from project WORKFLOW.md files with YAML front matter.
 * Supports file watching for live reload during development.
 *
 * @module SymphonyWorkflowLoader
 */
import type { ProjectId, SymphonyWorkflow, SymphonyWorkflowConfig } from "@t3tools/contracts";
import { ServiceMap } from "effect";
import type { Effect, Stream } from "effect";

import type { SymphonyError } from "../Errors.ts";

/**
 * Parsed workflow file structure.
 */
export interface ParsedWorkflowFile {
  /** Raw YAML front matter (if present) */
  readonly frontMatter: string | null;
  /** Parsed config with defaults applied */
  readonly config: SymphonyWorkflowConfig;
  /** Prompt template body */
  readonly promptTemplate: string;
  /** Full workflow object */
  readonly workflow: SymphonyWorkflow;
}

/**
 * SymphonyWorkflowLoaderShape - Service API for workflow loading.
 */
export interface SymphonyWorkflowLoaderShape {
  /**
   * Load and parse WORKFLOW.md from a project root.
   *
   * Returns default workflow if file doesn't exist.
   */
  readonly load: (
    projectId: ProjectId,
    projectRoot: string,
  ) => Effect.Effect<ParsedWorkflowFile, SymphonyError>;

  /**
   * Watch a project's WORKFLOW.md for changes.
   *
   * Emits the current workflow immediately, then re-emits on file changes.
   */
  readonly watch: (
    projectId: ProjectId,
    projectRoot: string,
  ) => Stream.Stream<ParsedWorkflowFile, SymphonyError>;

  /**
   * Get the default workflow configuration.
   */
  readonly getDefault: () => ParsedWorkflowFile;
}

/**
 * SymphonyWorkflowLoader - Service tag for workflow loading.
 */
export class SymphonyWorkflowLoader extends ServiceMap.Service<
  SymphonyWorkflowLoader,
  SymphonyWorkflowLoaderShape
>()("t3/symphony/Services/SymphonyWorkflowLoader") {}
