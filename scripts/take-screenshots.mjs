import puppeteer from "puppeteer";
import path from "path";

async function run() {
  console.log("Launching headless browser...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });

  console.log("Navigating to http://localhost:3000 ...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle0" });

  // 1. Capture Hero Screenshot
  console.log("Capturing updated hero screenshot...");
  const heroPath = path.resolve(
    "/home/mickey/.gemini/antigravity-cli/brain/820235ab-63e4-4ae5-a627-2256b32a415c/updated_hero.png"
  );
  await page.screenshot({
    path: heroPath,
    clip: { x: 0, y: 0, width: 1280, height: 720 },
  });
  console.log("✓ Hero screenshot saved to:", heroPath);

  // 2. Trigger scroll reveals down the page
  console.log("Scrolling through sections to trigger animations...");
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < bodyHeight; y += 400) {
    await page.evaluate((scrollPos) => window.scrollTo(0, scrollPos), y);
    await new Promise((r) => setTimeout(r, 100));
  }
  await page.evaluate(() => window.scrollTo(0, 0));

  // Wait 2.5s for AnimatedCounters and ScrollReveals to complete ease-out
  await new Promise((r) => setTimeout(r, 2500));

  // 3. Capture Full Scroll-Through Screenshot
  console.log("Capturing full scroll-through screenshot...");
  const fullPagePath = path.resolve(
    "/home/mickey/.gemini/antigravity-cli/brain/820235ab-63e4-4ae5-a627-2256b32a415c/full_page_landing.png"
  );
  await page.screenshot({
    path: fullPagePath,
    fullPage: true,
  });
  console.log("✓ Full scroll-through screenshot saved to:", fullPagePath);

  await browser.close();
  console.log("Done!");
}

run().catch((err) => {
  console.error("Screenshot error:", err);
  process.exit(1);
});
