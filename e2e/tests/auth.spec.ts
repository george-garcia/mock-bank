import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Mock Bank/i);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('should show register page', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
  });

  test('should navigate between login and register', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });
});
