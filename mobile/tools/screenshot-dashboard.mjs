import { chromium } from "playwright";

const url = process.env.APP_URL ?? "http://localhost:8081";
const out = process.env.OUT ?? "dashboard-language.png";
const outViewport = process.env.OUT_VIEWPORT ?? "dashboard-language-viewport.png";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });

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

// 앱 로드
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);

// 웹(react-native-web)에서는 AsyncStorage가 localStorage를 사용하므로
// 프로필을 심어 Start 단계를 건너뛰고 Dashboard로 진입시킴
await page.evaluate(() => {
  try {
    const key = "@my-everything/profile";
    const profile = {
      isAnonymous: true,
      createdAtISO: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(profile));
  } catch {
    // ignore
  }
});

await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(7000);

// 대시보드 제목 또는 언어 라벨이 뜰 때까지 대기(최대 15초)
await Promise.race([
  page.waitForSelector("text=대시보드", { timeout: 15000 }),
  page.waitForSelector("text=Dashboard", { timeout: 15000 }),
  page.waitForSelector("text=ダッシュボード", { timeout: 15000 }),
  page.waitForSelector("text=언어", { timeout: 15000 }),
  page.waitForSelector("text=Language", { timeout: 15000 }),
  page.waitForSelector("text=言語", { timeout: 15000 }),
]).catch(() => {});

const debug = await page.evaluate(() => {
  const text = (document.body?.innerText ?? "").trim();
  return {
    url: location.href,
    title: document.title,
    innerTextLen: text.length,
    innerTextHead: text.slice(0, 200),
    childCount: document.body?.querySelectorAll("*").length ?? 0,
  };
});
console.log("DEBUG:", JSON.stringify(debug, null, 2));
console.log("CONSOLE:", JSON.stringify(consoleMsgs.slice(0, 20), null, 2));
console.log("PAGE_ERRORS:", JSON.stringify(pageErrors.slice(0, 20), null, 2));
console.log("REQUEST_FAILURES:", JSON.stringify(failures.slice(0, 20), null, 2));

await page.screenshot({ path: outViewport, fullPage: false });
await page.screenshot({ path: out, fullPage: true });
await browser.close();

console.log(`Saved screenshot: ${out}`);

