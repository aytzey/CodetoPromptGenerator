export type ModelPresetId =
  | "gemini_3_1_pro"
  | "gemini_3_flash"
  | "chatgpt_5_2_pro"
  | "opus_4_6";
export type ApiProvider = "google" | "openrouter";

export interface ModelPresetBudget {
  contextWindowTokens: number;
  maxOutputTokens: number;
  safeInputCapTokens: number;
  maxTreeTokens: number;
}

export interface ModelPreset {
  id: ModelPresetId;
  label: string;
  shortDescription: string;
  modelByProvider: {
    google?: string;
    openrouter?: string;
  };
  budget: ModelPresetBudget;
  masterPromptGuide: string;
  sourceLinks: string[];
}

export const DEFAULT_MODEL_PRESET_ID: ModelPresetId = "gemini_3_1_pro";
export const SMART_SELECT_GOOGLE_MODEL = "gemini-3-flash-preview";

export const MODEL_PRESETS: Record<ModelPresetId, ModelPreset> = {
  gemini_3_1_pro: {
    id: "gemini_3_1_pro",
    label: "Gemini 3.1 Pro",
    shortDescription: "High-accuracy deep reasoning for final answer quality and long-context synthesis.",
    modelByProvider: {
      google: "gemini-3.1-pro-preview",
    },
    budget: {
      contextWindowTokens: 2_097_152,
      maxOutputTokens: 131_072,
      safeInputCapTokens: 1_350_000,
      maxTreeTokens: 120_000,
    },
    masterPromptGuide: [
      "State the exact objective, hard constraints, and acceptance criteria at the top.",
      "Separate immutable requirements from preferences and keep each instruction atomic.",
      "Provide all critical code/context first, then ask for output in a strict format.",
      "When ambiguity exists, require explicit assumptions instead of hidden guessing.",
      "Demand verifiable output: concrete changes, edge-case handling, and concise validation notes.",
    ].join("\n"),
    sourceLinks: [
      "https://ai.google.dev/gemini-api/docs/models",
      "https://ai.google.dev/gemini-api/docs/prompting-intro",
      "https://ai.google.dev/gemini-api/docs/deprecations",
    ],
  },
  gemini_3_flash: {
    id: "gemini_3_flash",
    label: "Gemini 3 Flash",
    shortDescription: "Fast high-throughput reasoning for Smart Select and prompt-refine execution.",
    modelByProvider: {
      google: "gemini-3-flash-preview",
    },
    budget: {
      contextWindowTokens: 1_048_576,
      maxOutputTokens: 65_536,
      safeInputCapTokens: 700_000,
      maxTreeTokens: 80_000,
    },
    masterPromptGuide: [
      "Use explicit, direct instructions and keep constraints unambiguous.",
      "Lead with complete code context, then place the concrete task and expected output format.",
      "For broad tasks, request end-to-end coverage; for narrow tasks, request strict scope control.",
      "Require assumptions to be stated when context is missing instead of silent guessing.",
      "Demand actionable output (patch-ready code, precise file references, and ordered next steps).",
    ].join("\n"),
    sourceLinks: [
      "https://ai.google.dev/gemini-api/docs/models",
      "https://ai.google.dev/gemini-api/docs/prompting-intro",
      "https://ai.google.dev/gemini-api/docs/prompting-strategies",
    ],
  },
  chatgpt_5_2_pro: {
    id: "chatgpt_5_2_pro",
    label: "ChatGPT 5.2 Pro",
    shortDescription: "High-precision reasoning with strict output contracts and deterministic structure.",
    modelByProvider: {
      openrouter: "openai/gpt-5.2-pro",
    },
    budget: {
      contextWindowTokens: 400_000,
      maxOutputTokens: 128_000,
      safeInputCapTokens: 280_000,
      maxTreeTokens: 40_000,
    },
    masterPromptGuide: [
      "State the objective, constraints, and acceptance criteria in explicit numbered steps.",
      "Provide exact output schema/format and forbid extra narrative outside that format.",
      "Ask for internally careful reasoning but concise final output focused on decisions and evidence.",
      "Prioritize correctness over verbosity; request verification steps and edge-case handling.",
      "If ambiguity exists, require a short assumptions block before implementation details.",
    ].join("\n"),
    sourceLinks: [
      "https://platform.openai.com/docs/guides/gpt-5-2",
      "https://platform.openai.com/docs/guides/reasoning-best-practices",
      "https://platform.openai.com/docs/models/gpt-5.2-pro",
    ],
  },
  opus_4_6: {
    id: "opus_4_6",
    label: "Claude Opus 4.6",
    shortDescription: "Deep coding analysis with rich context handling and rigorous self-checking.",
    modelByProvider: {
      openrouter: "anthropic/claude-opus-4.6",
    },
    budget: {
      contextWindowTokens: 200_000,
      maxOutputTokens: 128_000,
      safeInputCapTokens: 130_000,
      maxTreeTokens: 24_000,
    },
    masterPromptGuide: [
      "Put key instructions at the top and use clear tagged sections for task, context, and constraints.",
      "Be explicit about success criteria, failure modes, and what must not be changed.",
      "Include concrete examples of expected output style when strict formatting matters.",
      "Require a brief validation checklist before final answer to reduce regressions.",
      "Prefer concise but complete answers grounded in the provided artifacts, not external assumptions.",
    ].join("\n"),
    sourceLinks: [
      "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices",
      "https://docs.anthropic.com/en/docs/about-claude/models/overview",
      "https://www.anthropic.com/news/claude-4-6",
    ],
  },
};

export function listModelPresets(): ModelPreset[] {
  return [
    MODEL_PRESETS.gemini_3_1_pro,
    MODEL_PRESETS.gemini_3_flash,
    MODEL_PRESETS.chatgpt_5_2_pro,
    MODEL_PRESETS.opus_4_6,
  ];
}

export function getModelPreset(presetId?: string): ModelPreset {
  if (!presetId) return MODEL_PRESETS[DEFAULT_MODEL_PRESET_ID];
  if (presetId in MODEL_PRESETS) {
    return MODEL_PRESETS[presetId as ModelPresetId];
  }
  return MODEL_PRESETS[DEFAULT_MODEL_PRESET_ID];
}

export function detectProviderFromApiKey(apiKey: string): ApiProvider | null {
  const trimmed = apiKey.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("AIza")) return "google";
  return "openrouter";
}

export function resolvePresetModelForApiKey(
  presetId: string,
  apiKey: string,
): string | undefined {
  const preset = getModelPreset(presetId);
  const provider = detectProviderFromApiKey(apiKey);
  if (!provider) return preset.modelByProvider.google ?? preset.modelByProvider.openrouter;
  if (provider === "google") return preset.modelByProvider.google;
  return preset.modelByProvider.openrouter;
}

export function resolveSmartSelectModelForApiKey(apiKey: string): string | undefined {
  const provider = detectProviderFromApiKey(apiKey);
  if (provider !== "google") return undefined;
  return SMART_SELECT_GOOGLE_MODEL;
}
