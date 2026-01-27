import { chromium } from "playwright";

const url = process.env.APP_URL ?? "http://localhost:8081";
const out = process.env.OUT ?? "dashboard-mentor-response.png";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 720 } });

const failures = [];
page.on("requestfailed", (req) => {
  failures.push({
    url: req.url(),
    failure: req.failure()?.errorText,
    method: req.method(),
    resourceType: req.resourceType(),
  });
});

const consoleMsgs = [];
page.on("console", (msg) => {
  if (msg.type() === "error" || msg.type() === "warning") {
    consoleMsgs.push({ type: msg.type(), text: msg.text() });
  }
});

const pageErrors = [];
page.on("pageerror", (err) => pageErrors.push(String(err)));

// 웹(react-native-web)에서는 AsyncStorage가 localStorage를 사용하므로
// 프로필을 심어 Start 단계를 건너뛰고 Dashboard로 진입시킴
async function seedProfileAndReload() {
  await page.evaluate(() => {
    try {
      const key = "@my-everything/profile";
      const profile = { isAnonymous: true, createdAtISO: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(profile));
    } catch {
      // ignore
    }
  });
  await page.reload({ waitUntil: "domcontentloaded" });
}

await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
await seedProfileAndReload();
await page.waitForTimeout(3500);

// AI 멘토 섹션으로 스크롤
await Promise.race([
  page.waitForSelector("text=AI 멘토", { timeout: 15000 }),
  page.waitForSelector("text=AI mentor", { timeout: 15000 }),
  page.waitForSelector("text=AIメンター", { timeout: 15000 }),
]).catch(() => {});

await page.locator("text=AI 멘토").first().scrollIntoViewIfNeeded().catch(() => {});

// 입력 + 조언받기 클릭(기본 ko 기준)
await page.getByPlaceholder(/지금 고민을|Write your concern|いまの悩み/).fill("오늘 하루를 돌아보며 조언을 해줘").catch(() => {});
await page.getByText(/조언받기|Get advice|アドバイス/).first().click().catch(() => {});

// 응답이 뜰 때까지 잠깐 대기
await Promise.race([
  page.waitForSelector("text=멘토 응답", { timeout: 15000 }),
  page.waitForSelector("text=MVP", { timeout: 15000 }),
]).catch(() => {});

const debug = await page.evaluate(() => {
  const text = (document.body?.innerText ?? "").trim();
  return {
    url: location.href,
    title: document.title,
    innerTextLen: text.length,
    innerTextHead: text.slice(0, 300),
    childCount: document.body?.querySelectorAll("*").length ?? 0,
  };
});

console.log("DEBUG:", JSON.stringify(debug, null, 2));
console.log("CONSOLE:", JSON.stringify(consoleMsgs.slice(0, 20), null, 2));
console.log("PAGE_ERRORS:", JSON.stringify(pageErrors.slice(0, 20), null, 2));
console.log("REQUEST_FAILURES:", JSON.stringify(failures.slice(0, 20), null, 2));

await page.screenshot({ path: out, fullPage: false });
await browser.close();

console.log(`Saved screenshot: ${out}`);

