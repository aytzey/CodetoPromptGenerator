import { test, expect } from '@playwright/test';
import { 
  waitForPageLoad, 
  selectProject, 
  waitForFileTreeLoad,
  selectFileInTree
} from './helpers/test-utils';

test.describe('Prompt Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    await selectProject(page);
    await waitForFileTreeLoad(page);
  });

  test('should have prompt display area', async ({ page }) => {
    await selectFileInTree(page, 'Lyra.txt');
    await page.waitForTimeout(1000);

    const promptArea = page.locator('[data-testid="prompt-display"], .prompt-content, textarea[readonly]').first();
    await expect(promptArea).toBeVisible();
  });

  test('should generate prompt from selected files', async ({ page }) => {
    await selectFileInTree(page, 'Lyra.txt');
    await page.waitForTimeout(1000);

    const promptArea = page.locator('[data-testid="prompt-display"], .prompt-content, textarea[readonly]').first();
    const promptContent = await promptArea.textContent();
    
    expect(promptContent).toBeTruthy();
    expect(promptContent!.length).toBeGreaterThan(10);
  });

  test('should have copy button', async ({ page }) => {
    await selectFileInTree(page, 'Lyra.txt');
    await page.waitForTimeout(1000);

    const copyButton = page.locator('button:has-text("Copy"), [data-testid="copy-button"]').first();
    await expect(copyButton).toBeVisible();
    await expect(copyButton).toBeEnabled();
  });

  test('should copy prompt to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-write', 'clipboard-read']);
    
    await selectFileInTree(page, 'Lyra.txt');
    await page.waitForTimeout(1000);

    const copyButton = page.locator('button:has-text("Copy"), [data-testid="copy-button"]').first();
    await copyButton.click();
    
    await expect(copyButton).toContainText(/Copied|✓/);
  });

  test('should show instructions input', async ({ page }) => {
    const instructionsInput = page.locator('textarea[placeholder*="instructions"], [data-testid="instructions-input"]').first();
    await expect(instructionsInput).toBeVisible();
    await expect(instructionsInput).toBeEditable();
  });

  test('should update prompt with instructions', async ({ page }) => {
    await selectFileInTree(page, 'Lyra.txt');
    await page.waitForTimeout(1000);

    const instructionsInput = page.locator('textarea[placeholder*="instructions"], [data-testid="instructions-input"]').first();
    await instructionsInput.fill('Please analyze this code for security vulnerabilities');
    await page.waitForTimeout(500);

    const promptArea = page.locator('[data-testid="prompt-display"], .prompt-content, textarea[readonly]').first();
    const promptContent = await promptArea.textContent();
    
    expect(promptContent).toContain('Please analyze this code for security vulnerabilities');
  });

  test('should show token count', async ({ page }) => {
    await selectFileInTree(page, 'Lyra.txt');
    await page.waitForTimeout(1000);

    const tokenCount = page.locator('[data-testid="token-count"], span:has-text("tokens")').first();
    await expect(tokenCount).toBeVisible();
    
    const tokenText = await tokenCount.textContent();
    expect(tokenText).toMatch(/\d+\s*tokens?/);
  });
});