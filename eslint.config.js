t.config.js
New
+82
-0

import ts from "typescript";

const createTsProcessor = () => ({
  preprocess(text) {
    const { outputText } = ts.transpileModule(text, {
      compilerOptions: {
        allowJs: true,
        jsx: ts.JsxEmit.Preserve,
        target: ts.ScriptTarget.ES2021,
        module: ts.ModuleKind.ESNext,
      },
      reportDiagnostics: false,
    });
    return [outputText];
  },
  postprocess(messages) {
    return messages[0] ?? [];
  },
  supportsAutofix: true,
});

const tsStripPlugin = {
  processors: {
    ts: createTsProcessor(),
    tsx: createTsProcessor(),
  },
};

const browserGlobals = {
  window: "readonly",
  document: "readonly",
  console: "readonly",
  navigator: "readonly",
  requestAnimationFrame: "readonly",
  cancelAnimationFrame: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  localStorage: "readonly",
  URL: "readonly",
};

const baseConfig = {
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
    globals: browserGlobals,
  },
  rules: {},
};

export default [
  {
    ignores: ["dist", "node_modules", "src/renderUtils.ts"],
  },
  {
    ...baseConfig,
    files: ["**/*.{js,jsx}"],
  },
  {
    ...baseConfig,
    files: ["**/*.ts"],
    plugins: {
      "ts-strip": tsStripPlugin,
    },
    processor: "ts-strip/ts",
  },
  {
    ...baseConfig,
    files: ["**/*.tsx"],
    plugins: {
      "ts-strip": tsStripPlugin,
    },
    processor: "ts-strip/tsx",
  },
];