import { test, expect } from '@playwright/test';
import { 
  waitForPageLoad, 
  selectProject, 
  waitForFileTreeLoad,
  switchTab
} from './helpers/test-utils';

test.describe('Actors Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    await selectProject(page);
    await waitForFileTreeLoad(page);
  });

  test('should have generate actors button', async ({ page }) => {
    const generateActorsButton = page.locator('button:has-text("Generate Actors")').first();
    await expect(generateActorsButton).toBeVisible();
    await expect(generateActorsButton).toBeEnabled();
  });

  test('should trigger actors generation', async ({ page }) => {
    const generateActorsButton = page.locator('button:has-text("Generate Actors")').first();
    await generateActorsButton.click();

    await page.waitForSelector('.loading, [data-loading="true"]', { state: 'visible', timeout: 5000 }).catch(() => {});
    await expect(generateActorsButton).toBeDisabled();
    
    await page.waitForSelector('.loading, [data-loading="true"]', { state: 'hidden', timeout: 60000 }).catch(() => {});
    await expect(generateActorsButton).toBeEnabled();
  });

  test('should navigate to actors tab after generation', async ({ page }) => {
    const generateActorsButton = page.locator('button:has-text("Generate Actors")').first();
    await generateActorsButton.click();

    await page.waitForSelector('.loading, [data-loading="true"]', { state: 'hidden', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const activeTab = page.locator('[role="tab"][aria-selected="true"], .tab-active').first();
    await expect(activeTab).toContainText('Actors');
  });

  test('should display generated actors', async ({ page }) => {
    await switchTab(page, 'Actors');
    
    const actorsList = page.locator('[data-testid="actors-list"], .actors-list').first();
    await expect(actorsList).toBeVisible();
    
    const generateActorsButton = page.locator('button:has-text("Generate Actors")').first();
    await generateActorsButton.click();
    
    await page.waitForSelector('.loading, [data-loading="true"]', { state: 'hidden', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const actorItems = page.locator('[data-testid^="actor-"], .actor-item');
    const actorCount = await actorItems.count();
    expect(actorCount).toBeGreaterThan(0);
  });

  test('should allow editing actor', async ({ page }) => {
    await switchTab(page, 'Actors');
    
    const firstActor = page.locator('[data-testid^="actor-"], .actor-item').first();
    const editButton = firstActor.locator('button:has-text("Edit"), [aria-label*="Edit"]').first();
    
    if (await editButton.isVisible()) {
      await editButton.click();
      
      const editModal = page.locator('[role="dialog"], .dialog-content').first();
      await expect(editModal).toBeVisible();
      await expect(editModal).toContainText(/Edit.*Actor/i);
    }
  });

  test('should allow deleting actor', async ({ page }) => {
    await switchTab(page, 'Actors');
    
    const actorItems = page.locator('[data-testid^="actor-"], .actor-item');
    const initialCount = await actorItems.count();
    
    if (initialCount > 0) {
      const firstActor = actorItems.first();
      const deleteButton = firstActor.locator('button:has-text("Delete"), [aria-label*="Delete"]').first();
      
      await deleteButton.click();
      await page.waitForTimeout(500);
      
      const afterDeleteCount = await actorItems.count();
      expect(afterDeleteCount).toBeLessThan(initialCount);
    }
  });
});