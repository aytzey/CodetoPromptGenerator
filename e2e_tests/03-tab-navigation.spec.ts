import { test, expect } from '@playwright/test';
import { 
  waitForPageLoad, 
  selectProject, 
  waitForFileTreeLoad,
  switchTab 
} from './helpers/test-utils';

test.describe('Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    await selectProject(page);
    await waitForFileTreeLoad(page);
  });

  test('should have all main tabs', async ({ page }) => {
    const tabs = ['File Explorer', 'Exclusions', 'Selection Groups', 'Code Map', 'User Stories', 'Kanban', 'Actors', 'TODO'];
    
    for (const tab of tabs) {
      const tabElement = page.locator(`[role="tab"]:has-text("${tab}"), button:has-text("${tab}")`).first();
      await expect(tabElement).toBeVisible();
    }
  });

  test('should switch to Exclusions tab', async ({ page }) => {
    await switchTab(page, 'Exclusions');
    
    const exclusionsContent = page.locator('[data-testid="exclusions-content"], .exclusions-manager').first();
    await expect(exclusionsContent).toBeVisible();
  });

  test('should switch to Selection Groups tab', async ({ page }) => {
    await switchTab(page, 'Selection Groups');
    
    const selectionGroupsContent = page.locator('[data-testid="selection-groups-content"], .selection-groups').first();
    await expect(selectionGroupsContent).toBeVisible();
  });

  test('should switch to Code Map tab', async ({ page }) => {
    await switchTab(page, 'Code Map');
    
    const codeMapContent = page.locator('[data-testid="code-map-content"], .code-map').first();
    await expect(codeMapContent).toBeVisible();
  });

  test('should switch to User Stories tab', async ({ page }) => {
    await switchTab(page, 'User Stories');
    
    const userStoriesContent = page.locator('[data-testid="user-stories-content"], .user-stories').first();
    await expect(userStoriesContent).toBeVisible();
  });

  test('should switch to Kanban tab', async ({ page }) => {
    await switchTab(page, 'Kanban');
    
    const kanbanContent = page.locator('[data-testid="kanban-content"], .kanban-board').first();
    await expect(kanbanContent).toBeVisible();
  });

  test('should switch to Actors tab', async ({ page }) => {
    await switchTab(page, 'Actors');
    
    const actorsContent = page.locator('[data-testid="actors-content"], .actors-list').first();
    await expect(actorsContent).toBeVisible();
  });

  test('should switch to TODO tab', async ({ page }) => {
    await switchTab(page, 'TODO');
    
    const todoContent = page.locator('[data-testid="todo-content"], .todo-list').first();
    await expect(todoContent).toBeVisible();
  });

  test('should persist tab selection', async ({ page }) => {
    await switchTab(page, 'Kanban');
    await page.reload();
    await waitForPageLoad(page);
    await selectProject(page);
    await waitForFileTreeLoad(page);
    
    const activeTab = page.locator('[role="tab"][aria-selected="true"], .tab-active').first();
    await expect(activeTab).toContainText('Kanban');
  });
});