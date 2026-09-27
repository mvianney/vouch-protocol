import puppeteer from "puppeteer";

async function testApp() {
  console.log("[test-app] Launching Puppeteer browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });

  page.on("console", (msg) => console.log(`[browser console] ${msg.type()}: ${msg.text()}`));
  page.on("pageerror", (err) => console.log(`[browser pageerror] ${err.toString()}`));

  console.log("[test-app] Navigating to http://localhost:3000/app...");
  await page.goto("http://localhost:3000/app", { waitUntil: "networkidle2" });

  const headerText = await page.$eval("h1", (el) => el.textContent);
  console.log(`[test-app] Page header: "${headerText}"`);

  const taskQuery = "check the SOL balance of this wallet: 4FonJM4jRekrbi3kzrSjEdvUuXFtQB5Rz9J6RnNczCJT";
  await page.type("input[type='text']", taskQuery);
  console.log(`[test-app] Entered task query: "${taskQuery}"`);

  console.log("[test-app] Clicking Dispatch Task button...");
  await page.click("button[type='submit']");

  // Track progress every 5 seconds
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const labels = await page.$$eval(".terminal-label", (els) => els.map((el) => el.textContent.trim())).catch(() => []);
    const errorCard = await page.$eval(".terminal-card [class*='red']", (el) => el.textContent).catch(() => null);
    const tablePresent = await page.$("table.compare-table").then((el) => !!el);
    console.log(`[test-app ${i * 5 + 5}s] Cards visible: ${labels.length} (${labels.join(", ")}), Error: ${errorCard}, Table: ${tablePresent}`);
    if (tablePresent) {
      break;
    }
  }

  // Check ComparisonTable rows
  const tableRows = await page.$$eval("table.compare-table tbody tr", (trs) =>
    trs.map((tr) => {
      const tds = Array.from(tr.querySelectorAll("td")).map((td) => td.textContent.trim());
      return { label: tds[0], before: tds[1], after: tds[2], delta: tds[3] };
    })
  ).catch(() => []);
  console.log("[test-app] ComparisonTable rows:", JSON.stringify(tableRows, null, 2));

  await browser.close();
  console.log("[test-app] Test completed!");
}

testApp().catch((err) => {
  console.error("[test-app] Test error:", err);
  process.exit(1);
});
