import { test, expect } from '@playwright/test';
import { 
  waitForPageLoad, 
  selectProject, 
  waitForFileTreeLoad,
  openSettingsModal,
  closeModal
} from './helpers/test-utils';

test.describe('Settings Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    await selectProject(page);
    await waitForFileTreeLoad(page);
  });

  test('should open settings modal', async ({ page }) => {
    await openSettingsModal(page);
    
    const modal = page.locator('[role="dialog"], .dialog-content').first();
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(/Settings/i);
  });

  test('should have API key input field', async ({ page }) => {
    await openSettingsModal(page);
    
    const apiKeyInput = page.locator('input[type="password"], input[placeholder*="API"]').first();
    await expect(apiKeyInput).toBeVisible();
  });

  test('should save API key', async ({ page }) => {
    await openSettingsModal(page);
    
    const apiKeyInput = page.locator('input[type="password"], input[placeholder*="API"]').first();
    await apiKeyInput.fill('test-api-key-123');
    
    const saveButton = page.locator('button:has-text("Save")').first();
    await saveButton.click();
    
    await page.waitForTimeout(500);
    const modal = page.locator('[role="dialog"], .dialog-content').first();
    await expect(modal).not.toBeVisible();
  });

  test('should close modal with escape key', async ({ page }) => {
    await openSettingsModal(page);
    
    const modal = page.locator('[role="dialog"], .dialog-content').first();
    await expect(modal).toBeVisible();
    
    await closeModal(page);
    await expect(modal).not.toBeVisible();
  });

  test('should close modal with close button', async ({ page }) => {
    await openSettingsModal(page);
    
    const closeButton = page.locator('[aria-label="Close"], button:has-text("×")').first();
    await closeButton.click();
    
    const modal = page.locator('[role="dialog"], .dialog-content').first();
    await expect(modal).not.toBeVisible();
  });

  test('should have model selection dropdown', async ({ page }) => {
    await openSettingsModal(page);
    
    const modelSelect = page.locator('select, [role="combobox"]').first();
    await expect(modelSelect).toBeVisible();
  });

  test('should have temperature slider', async ({ page }) => {
    await openSettingsModal(page);
    
    const temperatureInput = page.locator('input[type="range"], input[type="number"][step="0.1"]').first();
    await expect(temperatureInput).toBeVisible();
  });
});