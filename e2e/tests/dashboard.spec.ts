import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show dashboard for authenticated users', async ({ page }) => {
    // This test assumes a test user exists - in a real scenario you'd seed the DB
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/accounts/i)).toBeVisible();
  });
});
