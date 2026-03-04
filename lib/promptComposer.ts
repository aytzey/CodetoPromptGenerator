import type { FileData } from "@/types";
import { getModelPreset, type ModelPreset, type ModelPresetId } from "@/lib/modelPresets";

const BUDGET_SAFETY_MARGIN = 1_200;

function estimateTokens(text = ""): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length + (text.match(/[.,;:!?(){}\[\]<>]/g) || []).length;
}

function extensionToLanguage(path: string): string {
  const extension = (path.split(".").pop() || "").toLowerCase();
  switch (extension) {
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
    case "json":
    case "md":
    case "html":
      return extension;
    case "py":
      return "python";
    case "rb":
      return "ruby";
    case "php":
      return "php";
    case "yml":
    case "yaml":
      return "yaml";
    case "css":
    case "scss":
      return "css";
    case "sh":
      return "bash";
    default:
      return "";
  }
}

function truncateByTokenBudget(text: string, tokenBudget: number): { text: string; usedTokens: number; truncated: boolean } {
  if (!text.trim() || tokenBudget <= 0) return { text: "", usedTokens: 0, truncated: false };

  const lines = text.split("\n");
  const out: string[] = [];
  let used = 0;

  for (const line of lines) {
    const lineTokens = estimateTokens(line);
    if (used + lineTokens > tokenBudget) break;
    out.push(line);
    used += lineTokens;
  }

  const joined = out.join("\n").trimEnd();
  return {
    text: joined,
    usedTokens: used,
    truncated: joined.length < text.trimEnd().length,
  };
}

function renderTree(treeText: string): string {
  if (!treeText.trim()) return "";
  return `\`\`\`text\n${treeText.trimEnd()}\n\`\`\``;
}

function renderFiles(files: FileData[]): string {
  return files
    .map((file) => {
      const lang = extensionToLanguage(file.path);
      return `\`\`\`${lang} ${file.path}\n${file.content.trimEnd()}\n\`\`\``;
    })
    .join("\n\n");
}

function modelPresetSystemBlock(preset: ModelPreset, metaPrompt: string): string {
  const lines: string[] = [];
  if (metaPrompt.trim()) {
    lines.push(metaPrompt.trim());
    lines.push("");
  }
  lines.push("# MASTER PROMPT PRESET");
  lines.push(`Target model preset: ${preset.label}`);
  if (preset.modelByProvider.google) {
    lines.push(`Target model id (Google API): ${preset.modelByProvider.google}`);
  }
  if (preset.modelByProvider.openrouter) {
    lines.push(`Target model id (OpenRouter): ${preset.modelByProvider.openrouter}`);
  }
  lines.push(`Safe input cap: ${preset.budget.safeInputCapTokens.toLocaleString()} tokens`);
  lines.push("");
  lines.push("# EXECUTION RULES");
  lines.push("1. Use only provided context; do not invent missing code or facts.");
  lines.push("2. If critical context is missing, state assumptions explicitly.");
  lines.push("3. Keep output actionable, technically precise, and ready to apply.");
  lines.push("4. Preserve intent and constraints from the user instructions.");
  lines.push("5. Prefer correctness and verifiability over verbosity.");
  lines.push("");
  lines.push("# MODEL-SPECIFIC GUIDANCE");
  for (const [index, rawLine] of preset.masterPromptGuide.split("\n").entries()) {
    lines.push(`${index + 1}. ${rawLine.trim()}`);
  }
  return lines.join("\n");
}

function chooseFilesForBudget(files: FileData[], fileBudget: number): {
  included: FileData[];
  omitted: FileData[];
  usedTokens: number;
} {
  const included: FileData[] = [];
  const omitted: FileData[] = [];
  let used = 0;

  for (const file of files) {
    const fileTokens = Math.max(1, file.tokenCount || estimateTokens(file.content));
    if (used + fileTokens <= fileBudget) {
      included.push(file);
      used += fileTokens;
      continue;
    }
    omitted.push(file);
  }

  if (!included.length && files.length > 0 && fileBudget > 350) {
    const first = files[0];
    const truncated = truncateByTokenBudget(first.content, fileBudget - 80);
    if (truncated.text.trim()) {
      included.push({
        ...first,
        content: `${truncated.text}\n\n... [FILE TRUNCATED FOR TOKEN CAP]`,
        tokenCount: truncated.usedTokens,
      });
      return {
        included,
        omitted: files.slice(1),
        usedTokens: truncated.usedTokens,
      };
    }
  }

  return { included, omitted, usedTokens: used };
}

function renderBudgetReport(
  preset: ModelPreset,
  estimatedTokens: number,
  treeTruncated: boolean,
  includedFiles: FileData[],
  omittedFiles: FileData[],
): string {
  const omittedPreview = omittedFiles
    .slice(0, 6)
    .map((file) => file.path)
    .join(", ");

  return [
    "<|TOKEN_BUDGET|>",
    `preset=${preset.label}`,
    `safe_input_cap_tokens=${preset.budget.safeInputCapTokens}`,
    `estimated_input_tokens=${estimatedTokens}`,
    `included_files=${includedFiles.length}`,
    `omitted_files=${omittedFiles.length}`,
    `tree_truncated=${treeTruncated ? "yes" : "no"}`,
    omittedPreview ? `omitted_examples=${omittedPreview}` : "",
    "<|END|>",
  ]
    .filter(Boolean)
    .join("\n");
}

export interface PromptBuildInput {
  presetId: ModelPresetId;
  metaPrompt: string;
  instructions: string;
  treeText: string;
  files: FileData[];
}

export interface PromptBuildResult {
  prompt: string;
  preset: ModelPreset;
  estimatedInputTokens: number;
  safeInputCapTokens: number;
  includedFiles: number;
  omittedFiles: number;
  treeTruncated: boolean;
}

export function buildPromptForPreset(input: PromptBuildInput): PromptBuildResult {
  const preset = getModelPreset(input.presetId);
  const systemBlock = modelPresetSystemBlock(preset, input.metaPrompt);
  const instructionBlock = input.instructions.trim();

  const baseWithoutContext = [
    `<|SYSTEM|>\n${systemBlock}\n<|END|>`,
    instructionBlock ? `<|USER|>\n${instructionBlock}\n<|END|>` : "",
    "<|CODE_CONTEXT|>\n<|END|>",
  ]
    .filter(Boolean)
    .join("\n\n");

  const baseTokens = estimateTokens(baseWithoutContext);
  const availableContextTokens = Math.max(
    0,
    preset.budget.safeInputCapTokens - baseTokens - BUDGET_SAFETY_MARGIN,
  );

  const treeTokenCap = input.treeText.trim()
    ? Math.min(preset.budget.maxTreeTokens, Math.floor(availableContextTokens * 0.22))
    : 0;
  const treeCut = truncateByTokenBudget(input.treeText, treeTokenCap);
  const treeBlock = renderTree(treeCut.text);
  const fileBudget = Math.max(0, availableContextTokens - treeCut.usedTokens);
  const fileSelection = chooseFilesForBudget(input.files, fileBudget);

  const contextParts: string[] = [];
  if (treeBlock) contextParts.push(`# PROJECT TREE\n${treeBlock}`);
  if (fileSelection.included.length > 0) {
    contextParts.push(`# SOURCE FILES\n${renderFiles(fileSelection.included)}`);
  }

  const promptBlocks: string[] = [];
  promptBlocks.push(`<|SYSTEM|>\n${systemBlock}\n<|END|>`);
  if (instructionBlock) {
    promptBlocks.push(`<|USER|>\n${instructionBlock}\n<|END|>`);
  }
  if (contextParts.length > 0) {
    promptBlocks.push(`<|CODE_CONTEXT|>\n${contextParts.join("\n\n")}\n<|END|>`);
  }

  let prompt = promptBlocks.join("\n\n");
  let estimated = estimateTokens(prompt);
  let dynamicIncluded = [...fileSelection.included];
  let dynamicOmitted = [...fileSelection.omitted];

  while (estimated > preset.budget.safeInputCapTokens && dynamicIncluded.length > 0) {
    const removed = dynamicIncluded.pop();
    if (removed) dynamicOmitted.unshift(removed);

    const dynamicContext: string[] = [];
    if (treeBlock) dynamicContext.push(`# PROJECT TREE\n${treeBlock}`);
    if (dynamicIncluded.length > 0) dynamicContext.push(`# SOURCE FILES\n${renderFiles(dynamicIncluded)}`);

    const loopBlocks: string[] = [];
    loopBlocks.push(`<|SYSTEM|>\n${systemBlock}\n<|END|>`);
    if (instructionBlock) loopBlocks.push(`<|USER|>\n${instructionBlock}\n<|END|>`);
    if (dynamicContext.length > 0) {
      loopBlocks.push(`<|CODE_CONTEXT|>\n${dynamicContext.join("\n\n")}\n<|END|>`);
    }
    prompt = loopBlocks.join("\n\n");
    estimated = estimateTokens(prompt);
  }

  const budgetReport = renderBudgetReport(
    preset,
    estimated,
    treeCut.truncated,
    dynamicIncluded,
    dynamicOmitted,
  );

  prompt = `${budgetReport}\n\n${prompt}`;
  estimated = estimateTokens(prompt);

  return {
    prompt,
    preset,
    estimatedInputTokens: estimated,
    safeInputCapTokens: preset.budget.safeInputCapTokens,
    includedFiles: dynamicIncluded.length,
    omittedFiles: dynamicOmitted.length,
    treeTruncated: treeCut.truncated,
  };
}
