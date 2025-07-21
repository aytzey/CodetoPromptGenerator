import { test, expect } from '@playwright/test';
import { waitForPageLoad, selectProject, waitForFileTreeLoad } from './helpers/test-utils';

test.describe('Basic Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test('should load the home page', async ({ page }) => {
    await expect(page).toHaveTitle(/Code → Prompt Generator/);
    await expect(page.locator('h1, .text-xl').first()).toContainText(/Code.*Prompt/i);
  });

  test('should display project selection card', async ({ page }) => {
    const projectCard = page.locator('.card, [data-testid="project-selection"]').first();
    await expect(projectCard).toBeVisible();
    await expect(projectCard).toContainText(/Project Selection/i);
  });

  test('should have folder picker input', async ({ page }) => {
    const folderInput = page.locator('input[placeholder*="project path"]');
    await expect(folderInput).toBeVisible();
    await expect(folderInput).toBeEditable();
  });

  test('should load file tree after selecting a project', async ({ page }) => {
    await selectProject(page);
    await waitForFileTreeLoad(page);
    
    const fileTree = page.locator('[data-testid="file-tree"], .file-tree').first();
    await expect(fileTree).toBeVisible();
  });

  test('should show header buttons', async ({ page }) => {
    await selectProject(page);
    await waitForFileTreeLoad(page);

    const settingsButton = page.locator('[data-testid="settings-button"], button[aria-label*="Settings"]').first();
    await expect(settingsButton).toBeVisible();

    const autoSelectButton = page.locator('button:has-text("Auto Select")').first();
    await expect(autoSelectButton).toBeVisible();
  });

  test('should display footer', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText(/Code to Prompt Generator/);
    await expect(footer).toContainText(/Aytzey/);
  });
});