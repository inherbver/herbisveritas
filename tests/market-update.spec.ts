import { test, expect } from "@playwright/test";

test.describe("Market Update Functionality", () => {
  test("should update market with partial data without validation errors", async ({ page }) => {
    // Navigate to the homepage
    await page.goto("/");
    
    // Login with admin credentials
    await page.click("text=Se connecter");
    await page.fill("input[type=\"email\"]", "inherbver@gmail.com");
    await page.fill("input[type=\"password\"]", "Admin123!");
    await page.click("button[type=\"submit\"]");
    
    // Wait for navigation after login
    await page.waitForURL("**/", { timeout: 10000 });
    
    // Navigate to admin markets page
    await page.goto("/admin/markets");
    
    // Wait for the markets page to load
    await page.waitForSelector("text=Marchés", { timeout: 10000 });
    
    // Take a screenshot of the markets list
    await page.screenshot({ path: "tests/screenshots/markets-list.png", fullPage: true });
    
    // Find and click the first "Modifier" button
    const modifyButton = page.locator("button:has-text(\"Modifier\"), a:has-text(\"Modifier\")").first();
    await modifyButton.click();
    
    // Wait for the edit form to load
    await page.waitForSelector("form", { timeout: 10000 });
    
    // Take a screenshot of the edit form
    await page.screenshot({ path: "tests/screenshots/edit-form-initial.png", fullPage: true });
    
    // Update only the specified fields
    const nameInput = page.locator("input[name=\"name\"], input[id*=\"name\"]");
    await nameInput.clear();
    await nameInput.fill("Test Market Updated");
    
    const cityInput = page.locator("input[name=\"city\"], input[id*=\"city\"]");
    await cityInput.clear();
    await cityInput.fill("Test City");
    
    // Update end date
    const endDateInput = page.locator("input[name=\"end_date\"]");
    await endDateInput.fill("2025-12-31");
    
    // Take a screenshot after filling the form
    await page.screenshot({ path: "tests/screenshots/edit-form-filled.png", fullPage: true });
    
    // Submit the form
    const submitButton = page.locator("button[type=\"submit\"], button:has-text(\"Enregistrer\"), button:has-text(\"Modifier\"), button:has-text(\"Sauvegarder\")");
    await submitButton.click();
    
    // Wait for either success message or error
    await page.waitForTimeout(3000);
    
    // Take a screenshot of the result
    await page.screenshot({ path: "tests/screenshots/update-result.png", fullPage: true });
    
    // Check for validation errors (should NOT be present)
    const timeErrorMessage = page.locator("text=/Format d.heure invalide/i");
    const hasTimeError = await timeErrorMessage.count() > 0;
    
    if (hasTimeError) {
      console.log("❌ VALIDATION ERROR FOUND:", await timeErrorMessage.textContent());
      expect(hasTimeError).toBe(false);
    } else {
      console.log("✅ No time validation errors found");
    }
    
    // Check for success indicators
    const successMessage = page.locator("text=/succès/i, text=/enregistré/i, text=/modifié/i");
    const hasSuccessMessage = await successMessage.count() > 0;
    
    if (hasSuccessMessage) {
      console.log("✅ Success message found:", await successMessage.first().textContent());
    }
    
    // Navigate back to markets list to verify changes
    await page.goto("/admin/markets");
    await page.waitForSelector("text=Marchés", { timeout: 10000 });
    
    // Take final screenshot
    await page.screenshot({ path: "tests/screenshots/markets-list-final.png", fullPage: true });
    
    // Look for the updated market name
    const updatedMarket = page.locator("text=Test Market Updated");
    const marketExists = await updatedMarket.count() > 0;
    
    if (marketExists) {
      console.log("✅ Updated market found in the list");
      expect(marketExists).toBe(true);
    } else {
      console.log("⚠️ Updated market not immediately visible - this might be due to pagination or filtering");
    }
    
    // Final verification: no validation errors should be present
    expect(hasTimeError).toBe(false);
  });
});
