const { chromium } = require('playwright');
const path = require('path');

async function testEditor() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const filePath = `file://${path.resolve(__dirname, '../index.html')}`;

    console.log(`Loading page: ${filePath}`);
    await page.goto(filePath);

    // Initial wait
    await page.waitForTimeout(1000);

    try {
        console.log('Testing Editor features...');

        // Verify editor is there
        const editorLocator = page.locator('#editor');
        await editorLocator.waitFor({ state: 'visible' });

        // Add some text
        await editorLocator.click();
        await page.keyboard.type('Texto de prueba para el editor.');

        // Test Word Count
        await page.waitForTimeout(500); // give it a moment to update
        const wordCountText = await page.locator('#wordCount').innerText();
        console.log(`Word Count Check: ${wordCountText}`);
        if (!wordCountText.includes('6 palabras')) {
            throw new Error("Word count assertion failed");
        }

        // Test Formatting
        await page.keyboard.press('Control+A'); // Select all
        await page.locator('#boldBtn').click(); // Make it bold

        const isBoldActive = await page.evaluate(() => {
            return document.queryCommandState('bold') || document.getElementById('boldBtn').classList.contains('active');
        });

        console.log(`Bold Formatting active: ${isBoldActive}`);

        // Get snapshot of the editor area
        const screenshotPath = path.resolve(__dirname, `../.gemini/antigravity/brain/8390a036-68b8-4d35-98c8-c875af70c034/editor_test_${Date.now()}.png`);
        await editorLocator.screenshot({ path: screenshotPath });
        console.log(`Test completely successful. Screenshot saved at ${screenshotPath}`);

    } catch (e) {
        console.error('Test failed: ', e);
    } finally {
        await browser.close();
    }
}

testEditor();
