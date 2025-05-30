# Project Agents.md Guide for OpenAI Codex

This Agents.md file provides comprehensive guidance for OpenAI Codex and other AI agents working with this codebase.

## Project Structure for OpenAI Codex Navigation

- `/`: The root directory of the monorepo.
  - `.codex`: Contains setup scripts for the development environment.
  - `components`: React components, including UI primitives from `shadcn/ui`.
    - `components/ui`: Reusable, low-level UI components (e.g., `button.tsx`, `dialog.tsx`).
  - `docs`: Documentation files, including API references and architecture descriptions.
  - `electron`: Electron-specific files for the desktop application wrapper.
  - `lib`: Frontend utility functions and custom React hooks.
    - `lib/hooks`: Custom React hooks (e.g., `useUndoRedo.ts`, `useHomePageLogic.ts`).
  - `pages`: Next.js page components, defining routes.
  - `public`: Static assets (images, fonts, etc.). OpenAI Codex should not modify these directly.
  - `python_backend`: The Flask backend application and its modules.
    - `python_backend/controllers`: Flask blueprints defining API endpoints.
    - `python_backend/models`: Pydantic/dataclass models for API request/response validation.
    - `python_backend/repositories`: Data access layer, primarily for file-based persistence.
    - `python_backend/services`: Business logic for the backend features.
    - `python_backend/tests`: Backend test files.
    - `python_backend/utils`: Backend utility functions (e.g., response formatting, path handling).
  - `sample_project`: Contains sample data, including meta prompts.
    - `sample_project/meta_prompts`: Example meta prompt text files.
  - `scripts`: Various utility scripts for development, testing, and building.
  - `services`: Frontend service hooks for interacting with the backend API.
  - `stores`: Zustand stores for global state management on the frontend.
  - `styles`: Global CSS and Tailwind CSS configuration.
  - `types`: TypeScript type definitions and Zod schemas used across the frontend and backend.
  - `views`: Larger, feature-specific React components that compose UI primitives and interact with state/services.
    - `views/layout`: Core layout components (e.g., header, main layout, panels).
- `.env.local`: Environment variables for local development.
- `.eslintrc.js`: ESLint configuration for linting JavaScript/TypeScript.
- `.gitignore`: Specifies intentionally untracked files to ignore.
- `ignoreDirs.txt`: Global exclusion patterns for file tree scanning.
- `next.config.js`: Next.js configuration.
- `package.json`: Node.js project metadata and scripts.
- `ports.ini`: Configuration for development server ports.
- `postcss.config.js`: PostCSS configuration, typically for Tailwind CSS.
- `README.md`: Project overview and setup instructions.
- `tailwind.config.js`: Tailwind CSS configuration.
- `tsconfig.json`: TypeScript compiler configuration.

## Coding Conventions for OpenAI Codex

### General Conventions for Agents.md Implementation

- Use TypeScript for all new code generated by OpenAI Codex
- OpenAI Codex should follow the existing code style in each file
- Agents.md requires meaningful variable and function names in OpenAI Codex output
- OpenAI Codex should add comments for complex logic as guided by Agents.md

### React Components Guidelines for OpenAI Codex

- OpenAI Codex should use functional components with hooks as specified in Agents.md
- Keep components generated by OpenAI Codex small and focused
- Agents.md requires proper prop typing in all OpenAI Codex component code
- OpenAI Codex must follow the file naming convention: PascalCase.tsx

### CSS/Styling Standards for OpenAI Codex

- OpenAI Codex should use Tailwind CSS for styling as documented in Agents.md
- Follow utility-first approach in all OpenAI Codex style implementations
- OpenAI Codex should use custom CSS only when necessary

## Testing Requirements for OpenAI Codex

OpenAI Codex should run tests with the following commands:

```bash
# Run all integration tests with OpenAI Codex
npm test
Pull Request Guidelines for OpenAI Codex

When OpenAI Codex helps create a PR, please ensure it:

    Includes a clear description of the changes as guided by Agents.md

    References any related issues that OpenAI Codex is addressing

    Ensures all tests pass for code generated by OpenAI Codex

    Includes screenshots for UI changes implemented with OpenAI Codex

    Keeps PRs focused on a single concern as specified in Agents.md

Programmatic Checks for OpenAI Codex

Before submitting changes generated by OpenAI Codex, run:

      
# Lint check for OpenAI Codex code
npm run lint

# Type check for OpenAI Codex TypeScript
npm run type-check

# Build check for OpenAI Codex implementations
npm run build

    

IGNORE_WHEN_COPYING_START
Use code with caution. Bash
IGNORE_WHEN_COPYING_END

All checks must pass before OpenAI Codex generated code can be merged. Agents.md helps ensure OpenAI Codex follows these requirements.