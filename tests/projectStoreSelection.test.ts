import test from "node:test";
import assert from "node:assert/strict";
import {
  filterPromptSelectablePaths,
  isExcludedByPatterns,
  isPromptSelectionExcludedPath,
  normalizeExclusionPatterns,
} from "../lib/selectionFilters";
import { flattenExclusionCandidates, inferExclusionCandidateType } from "../lib/exclusionCandidates";
import { useProjectStore } from "../stores/useProjectStore";

test("prompt selection excludes nested env and ignore dotfiles", () => {
  const selectable = filterPromptSelectablePaths([
    "src/app.ts",
    ".env",
    "packages/api/.env.example",
    "packages/api/.env.production.local",
    "packages/api/.dockerignore",
    "packages/api/.gitignore",
    "packages/api/.eslintignore",
    "packages/api/.eslintrc.js",
    "src-tauri/target/debug/build.rs",
    "docs/assets/hero.png",
    "public/logo.svg",
    "package-lock.json",
  ]);

  assert.deepEqual(selectable, ["src/app.ts", "packages/api/.eslintrc.js"]);
});

test("selectAllFiles strips protected prompt files from any subfolder", () => {
  useProjectStore.setState({ selectedFilePaths: [], filesData: [] });

  useProjectStore.getState().selectAllFiles(
    [
      "src/app.ts",
      "src/.env",
      "src/config/.env.example",
      "src/config/.dockerignore",
      "src/config/.gitignore",
      "src/config/.npmignore",
      "src/config/settings.ts",
    ],
    new Set(),
    new Set(),
  );

  assert.deepEqual(useProjectStore.getState().selectedFilePaths, [
    "src/app.ts",
    "src/config/settings.ts",
  ]);
});

test("selection exclusions also apply to path segments from configured exclusions", () => {
  assert.equal(isPromptSelectionExcludedPath("apps/web/.env.local"), true);

  useProjectStore.setState({ selectedFilePaths: [], filesData: [] });
  useProjectStore.getState().selectAllFiles(
    ["src/app.ts", "src/.secrets/key.txt", "src/visible/key.txt"],
    new Set([".secrets"]),
    new Set(),
  );

  assert.deepEqual(useProjectStore.getState().selectedFilePaths, [
    "src/app.ts",
    "src/visible/key.txt",
  ]);
});

test("exclusion matcher supports gitignore-style segment and path patterns", () => {
  const patterns = normalizeExclusionPatterns([
    "",
    "# comment",
    "node_modules",
    "src-tauri/target/",
    "out/*",
    "*.log",
    "!out/.gitkeep",
    "node_modules",
  ]);

  assert.deepEqual(patterns, ["node_modules", "src-tauri/target", "out/*", "*.log", "!out/.gitkeep"]);
  assert.equal(isExcludedByPatterns("packages/app/node_modules/react/index.js", patterns), true);
  assert.equal(isExcludedByPatterns("src-tauri/target/debug/build.json", patterns), true);
  assert.equal(isExcludedByPatterns("out/index.html", patterns), true);
  assert.equal(isExcludedByPatterns("out/nested/index.html", patterns), true);
  assert.equal(isExcludedByPatterns("out/.gitkeep", patterns), false);
  assert.equal(isExcludedByPatterns("logs/runtime.log", patterns), true);
  assert.equal(isExcludedByPatterns("src-tauri/src/main.rs", patterns), false);
});

test("exclusion normalizer collapses duplicate slashes and backslashes", () => {
  assert.deepEqual(normalizeExclusionPatterns(["src\\\\generated//types", "src/generated/types/"]), [
    "src/generated/types",
  ]);
});

test("project exclusion candidates include both files and directories", () => {
  const candidates = flattenExclusionCandidates([
    {
      name: "src",
      relativePath: "src",
      absolutePath: "/repo/src",
      type: "directory",
      children: [
        {
          name: "app.ts",
          relativePath: "src/app.ts",
          absolutePath: "/repo/src/app.ts",
          type: "file",
        },
      ],
    },
  ]);

  assert.deepEqual(candidates, [
    { path: "src", type: "directory" },
    { path: "src/app.ts", type: "file" },
  ]);
});

test("project ignore patterns can be shown as exclusion candidates", () => {
  assert.equal(inferExclusionCandidateType("graphify-out/"), "directory");
  assert.equal(inferExclusionCandidateType("out/*"), "pattern");
  assert.equal(inferExclusionCandidateType("src/generated.ts"), "file");
  assert.equal(inferExclusionCandidateType("!out/.gitkeep"), "pattern");
});
