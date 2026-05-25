import { expect, test } from '@playwright/test';

test('landing page renders core sections', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /verified pharmacies/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /^sign in$/i })).toBeVisible();
  await expect(page.getByText(/Strictly B2B/i)).toBeVisible();
});

test('navigates to products', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('link', { name: /products/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole('heading', { name: /therapeutic portfolio/i })).toBeVisible();
});
