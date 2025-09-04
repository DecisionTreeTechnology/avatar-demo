#!/bin/bash

echo "Fixing Playwright tests for refactored UI..."

# Fix 1: Replace 'Loading avatar...' with the new UI text
echo "1. Updating 'Loading avatar...' references..."
find tests -name "*.spec.ts" -exec sed -i '' 's/Loading avatar\.\.\./💝 Your Caring Assistant/g' {} \;

# Fix 2: Replace button:has-text("Ask") with data-testid
echo "2. Updating Ask button selectors..."
find tests -name "*.spec.ts" -exec sed -i '' 's/button:has-text("Ask")/[data-testid="ask-button"]/g' {} \;

# Fix 3: Replace page.locator('button:has-text("Ask")') in page.waitForFunction calls
echo "3. Fixing waitForFunction selectors..."
find tests -name "*.spec.ts" -exec sed -i '' 's/document\.querySelector('\''button:has-text("Ask")'\''/document.querySelector('\''[data-testid="ask-button"]'\'')/g' {} \;

# Fix 4: Update "Thinking..." and "Speaking..." button states 
echo "4. Updating button state selectors..."
find tests -name "*.spec.ts" -exec sed -i '' 's/button:has-text("Thinking\.\.\.")/[data-testid="ask-button"]:has-text("Thinking...")/g' {} \;
find tests -name "*.spec.ts" -exec sed -i '' 's/button:has-text("Speaking\.\.\.")/[data-testid="ask-button"]:has-text("Speaking...")/g' {} \;

echo "Test fixes applied!"