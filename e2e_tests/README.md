# E2E Tests for Code to Prompt Generator

This directory contains end-to-end tests for the Code to Prompt Generator application using Playwright.

## Test Structure

The tests are organized into the following files:

1. **01-basic-navigation.spec.ts** - Tests basic page loading and navigation
2. **02-file-selection.spec.ts** - Tests file selection functionality
3. **03-tab-navigation.spec.ts** - Tests tab switching and persistence
4. **04-settings-modal.spec.ts** - Tests settings modal functionality
5. **05-auto-select.spec.ts** - Tests automatic file selection feature
6. **06-prompt-generation.spec.ts** - Tests prompt generation and copying
7. **07-actors-generation.spec.ts** - Tests actor generation functionality
8. **08-kanban-board.spec.ts** - Tests Kanban board features
9. **09-todo-list.spec.ts** - Tests TODO list management
10. **10-exclusions.spec.ts** - Tests file exclusion patterns
11. **11-selection-groups.spec.ts** - Tests selection group management
12. **12-error-handling.spec.ts** - Tests error scenarios and handling

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run tests with UI mode
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Debug tests
```bash
npm run test:e2e:debug
```

### Run specific test file
```bash
npx playwright test e2e_tests/01-basic-navigation.spec.ts
```

### Run tests in specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Helpers

The `helpers/test-utils.ts` file contains common utility functions:

- `waitForPageLoad()` - Waits for the page to fully load
- `selectProject()` - Selects a project directory
- `waitForFileTreeLoad()` - Waits for file tree to load
- `selectFileInTree()` - Selects a file in the tree
- `getSelectedFilesCount()` - Gets count of selected files
- `getTotalTokenCount()` - Gets total token count
- `switchTab()` - Switches between tabs
- `openSettingsModal()` - Opens settings modal
- `closeModal()` - Closes any open modal

## Configuration

Tests are configured in `playwright.config.ts`:

- Tests run against `http://localhost:3000`
- The application is started automatically using `npm run local`
- Screenshots are captured on failure
- Videos are retained on failure
- Traces are captured on first retry

## Writing New Tests

When adding new tests:

1. Create a new spec file following the naming pattern: `XX-feature-name.spec.ts`
2. Import necessary helpers from `./helpers/test-utils`
3. Use descriptive test names
4. Follow the existing patterns for selectors and assertions
5. Add appropriate waits for dynamic content

## Debugging Tips

1. Use `page.pause()` to pause execution and inspect the page
2. Use `--debug` flag to run tests in debug mode
3. Check screenshots in `test-results/` directory for failures
4. Use `--ui` mode for interactive test development
5. Add `await page.waitForTimeout(X)` for debugging timing issues