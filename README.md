<div align="center">

<img src="media/icon.png" alt="LLM Context Builder" width="120" />

# LLM Context Builder

**Select files or folders in the VS Code explorer and turn them into a single, clean Markdown context — file tree included — ready to paste into ChatGPT, Claude, Gemini or any other LLM.**

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/perroBlanco0.llm-context-builder?label=Marketplace&logo=visualstudiocode&color=1f6feb)](https://marketplace.visualstudio.com/items?itemName=perroBlanco0.llm-context-builder)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/perroBlanco0.llm-context-builder?color=1f6feb)](https://marketplace.visualstudio.com/items?itemName=perroBlanco0.llm-context-builder)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/perroBlanco0.llm-context-builder?color=1f6feb)](https://marketplace.visualstudio.com/items?itemName=perroBlanco0.llm-context-builder&ssr=false#review-details)
[![CI](https://github.com/perroBlanco0/llm-context-exporter/actions/workflows/ci.yml/badge.svg)](https://github.com/perroBlanco0/llm-context-exporter/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## ✨ Features

- **One right click.** Select any combination of files and folders in the explorer → **Copy for LLM Prompt**.
- **File tree + contents.** The output starts with an ASCII tree of the selection, followed by every file inside a fenced code block with the right language tag.
- **`.gitignore` aware.** Every `.gitignore` between the workspace root and the file is honoured, exactly like git does (nested `.gitignore` files included).
- **No binaries, no noise.** Images, archives, fonts and executables are skipped by extension *and* by content sniffing (NUL bytes / invalid UTF-8).
- **Safe limits.** Per-file size, total size and file-count limits keep you from blowing up your context window by accident.
- **Clipboard or file.** Copy straight to the clipboard, or export a `.md` file you can attach to a chat.
- **Custom prompt header.** Prepend your own instructions to every generated context.

## 🚀 Usage

1. In the **Explorer**, select one or more files/folders (`Ctrl`/`Cmd` + click for multi-select).
2. **Right click → `Copy for LLM Prompt`.**
3. Paste into your LLM of choice.

Other entry points:

| Command | Where | What it does |
| --- | --- | --- |
| `Copy for LLM Prompt` | Explorer context menu, editor tab context menu | Copies the Markdown context to the clipboard |
| `Export for LLM Prompt (Markdown file)` | Explorer context menu | Asks for a location and saves the context as a `.md` file |
| `LLM Context Builder: Copy Workspace for LLM Prompt` | Command Palette (`Ctrl/Cmd+Shift+P`) | Uses the whole workspace as the selection |

After copying, a notification shows how many files were included and lets you **Preview** the result in an editor tab.

### Example output

````markdown
# Project context: my-app

## File tree

```text
my-app/
├── src/
│   ├── core/
│   │   └── util.ts
│   └── index.ts
└── README.md
```

## Files

### `src/index.ts`

```typescript
export const answer = 42;
```

## Summary

- Files included: 3
- Total size: 4.2 KB

<details>
<summary>Skipped files (1)</summary>

- `media/logo.png` — binary file

</details>
````

## ⚙️ Settings

All settings live under `llmContextBuilder.*` (Settings UI → search for “LLM Context Builder”).

| Setting | Default | Description |
| --- | --- | --- |
| `respectGitignore` | `true` | Skip files ignored by the applicable `.gitignore` files |
| `ignoreGlobs` | `.git`, `node_modules`, `dist`, `out`, `build`, `.venv`, `__pycache__`, lockfiles | Extra `.gitignore`-style patterns that are always ignored |
| `binaryExtensions` | ~45 common binary extensions | Extensions whose contents are never inlined |
| `detectBinaryContent` | `true` | Also detect binary files by content, not just by extension |
| `maxFileSizeKb` | `256` | Skip files larger than this (`0` disables the limit) |
| `maxTotalSizeMb` | `5` | Stop adding contents past this total size (`0` disables) |
| `maxFiles` | `500` | Maximum number of files to include (`0` disables) |
| `includeTree` | `true` | Include the ASCII file tree |
| `includeFileContents` | `true` | Include file contents (turn off for a tree-only outline) |
| `includeLineNumbers` | `false` | Prefix each source line with its line number |
| `header` | `""` | Text prepended to the output, e.g. your standing prompt |
| `showSummary` | `true` | Append the summary and the list of skipped files |

Example (`.vscode/settings.json`):

```jsonc
{
  "llmContextBuilder.header": "You are reviewing the following code. Answer in Spanish.",
  "llmContextBuilder.maxFileSizeKb": 128,
  "llmContextBuilder.ignoreGlobs": ["**/node_modules/**", "**/*.snap", "**/fixtures/**"]
}
```

> **Tip:** explicitly selecting a single file always includes it, even if it is gitignored. Ignore rules only prune files discovered while walking a selected folder.

## 🧑‍💻 Development

```bash
git clone https://github.com/perroBlanco0/llm-context-exporter.git
cd llm-context-exporter
npm install

npm run bundle       # build dist/extension.js with esbuild
npm run watch        # rebuild on change
npm run check-types  # tsc --noEmit
npm run lint         # eslint
npm test             # unit tests (node:test)
```

Press <kbd>F5</kbd> in VS Code to launch the **Extension Development Host** with the extension loaded, then try the context menu in the new window.

### Project layout

```text
src/
├── core/          # pure, VS Code-independent logic (fully unit tested)
│   ├── binary.ts     # binary extension/content detection
│   ├── collector.ts  # walks the selection, applies ignores and limits
│   ├── ignore.ts     # .gitignore evaluation (nested files supported)
│   ├── language.ts   # extension → fenced code language
│   ├── markdown.ts   # Markdown rendering
│   ├── paths.ts      # path helpers
│   └── tree.ts       # ASCII tree rendering
├── extension.ts        # command registration and VS Code wiring
├── settings.ts         # configuration reader
└── vscodeFileSystem.ts # FileSystemAdapter backed by vscode.workspace.fs
```

## 📦 Publishing to the VS Code Marketplace

1. **Create a publisher.** Sign in at <https://marketplace.visualstudio.com/manage> with a Microsoft account and create a publisher ID. It must match the `publisher` field in `package.json` (currently `perroBlanco0`).

2. **Create an Azure DevOps Personal Access Token (PAT).** In <https://dev.azure.com> → *User settings* → *Personal access tokens* → *New Token*:
   - **Organization:** `All accessible organizations`
   - **Scopes:** *Custom defined* → **Marketplace → Manage**
   - Copy the token — it is shown only once.

3. **Log in with `vsce`.**

   ```bash
   npx @vscode/vsce login perroBlanco0   # paste the PAT when prompted
   ```

4. **Bump the version and update the changelog.**

   ```bash
   npm version patch   # or minor / major
   ```

5. **Package and inspect the VSIX locally (optional but recommended).**

   ```bash
   npm run package                       # produces llm-context-builder-x.y.z.vsix
   code --install-extension llm-context-builder-*.vsix
   ```

6. **Publish.**

   ```bash
   npm run publish            # vsce publish
   # or, without a stored login:
   npx @vscode/vsce publish -p "$VSCE_PAT"
   ```

   `vsce:prepublish` runs type checking, linting and a minified bundle before anything is uploaded.

7. **Verify.** The extension appears at
   `https://marketplace.visualstudio.com/items?itemName=perroBlanco0.llm-context-builder`
   within a few minutes.

### Publishing to Open VSX (optional)

```bash
npx ovsx publish llm-context-builder-*.vsix -p "$OVSX_TOKEN"
```

### Automated release (optional)

Store the PAT as the `VSCE_PAT` repository secret and publish from CI on every tag:

```yaml
- run: npm ci
- run: npx @vscode/vsce publish -p ${{ secrets.VSCE_PAT }}
```

## 🤝 Contributing

Issues and pull requests are welcome at
<https://github.com/perroBlanco0/llm-context-exporter/issues>.
Please run `npm run lint && npm run check-types && npm test` before opening a PR.

## 📄 License

[MIT](LICENSE) © perroBlanco0
