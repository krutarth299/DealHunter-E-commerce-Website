import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set User-Agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
  
  await page.goto('https://www.firstcry.com/himalaya/himalaya-baby-wipes-72-pieces/9855/product-detail', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'firstcry_debug.png' });
  
  const title = await page.$eval('title', el => el.textContent).catch(() => 'no title');
  const h1 = await page.$eval('h1', el => el.textContent).catch(() => 'no h1');
  console.log('Title:', title);
  console.log('H1:', h1);
  
  await browser.close();
}

run();
