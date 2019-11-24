const puppeteer = require("puppeteer");
const fs = require('fs');

async function get_companies(page) {
  companies = {}
  try{
    for(let j = 1; ; j+=1){
      const name = await page.$eval(`#holdingDetailsEquity > div:nth-child(3) > div > div.vuiScrollingTableRightSide > div > table > tbody > tr:nth-child(${j}) > td.name`, el => el.innerText.trim() );
      if(name != 'Total'){
        const ratio = await page.$eval(`#holdingDetailsEquity > div:nth-child(3) > div > div.vuiScrollingTableRightSide > div > table > tbody > tr:nth-child(${j}) > td.vuiTextAlignRight.marketValPercent`, el => el.innerText.trim() );
        companies[name.toString()] = parseFloat(ratio.replace('%', ''))
      }
    }
  }catch(err){
  }
  try{
    for(let j = 1; ; j += 1){
      const name = await page.$eval(`#portfolio-data-tab > div > div:nth-child(6) > div.gridContainer > div.grid9.respWholeMed > div:nth-child(1) > div > div > div:nth-child(3) > div.vuiScrollingTables > div.vuiScrollingTableRightSide > div > table > tbody > tr:nth-child(${j}) > td:nth-child(1)`, el => el.innerText.trim() );
      if(name != 'Total'){
        const ratio = await page.$eval(`#portfolio-data-tab > div > div:nth-child(6) > div.gridContainer > div.grid9.respWholeMed > div:nth-child(1) > div > div > div:nth-child(3) > div.vuiScrollingTables > div.vuiScrollingTableRightSide > div > table > tbody > tr:nth-child(${j}) > td.alignRgt`, el => el.innerText.trim() );
        companies[name.toString()] = parseFloat(ratio.replace('%', ''))
      }
    }
  }catch(err){

  }
  return companies
}

const escapeXpathString = str => {
  const splitedQuotes = str.replace(/'/g, `', "'", '`);
  return `concat('${splitedQuotes}', '')`;
};

async function get_stock_info(page, link) {
  await page.goto(link, {timeout: 105000, waitUntil: 'networkidle0'})
  let ret = {}
  const name = await page.$eval('#main-content > div > h1 > span:nth-child(1)', el => el.innerText.replace(/^\s+|^-+|\s+$|-+$/gm,'') )
  const type = await page.$eval('#main-content > div > h1 > span:nth-child(2)', el => el.innerText.replace(/^\s+|^-+|\s+$|-+$/gm,'') )

  ret['name'] = name
  ret['type'] = type
  ret['companies'] = {}

  try {
    while(true){
        ret['companies'] = await get_companies(page)
        ret['companies'] = Object.assign({}, ret['companies'], await get_companies(page))

        const button = (await page.$x(`//button[contains(., 'Next')]`))[0];
        const is_disabled = await (await button.getProperty('aria-disabled')).jsonValue()
        if(is_disabled){
          break
        }
        await button.click();
    }
  } catch (err) {
    console.log(err)
  }
  console.log(ret)

  return ret

}
async function get_links(page) {
  await page.goto('https://www.vanguardinvestor.co.uk/what-we-offer/all-products', {timeout: 105000, waitUntil: 'networkidle0'})
  await page.click('#bannerButton')
  const source = await page.content()
  const matches = source.match(/investments\/\S+_link/g)
  let links = []
  for(ali of matches){
    const k = ali.indexOf('?')
    const good_link = ali.substring(0, k)
    const portfolio = good_link + '/portfolio-data'
    links.push(`https://www.vanguardinvestor.co.uk/${portfolio}`)
  }
  return new Set(links)
}

puppeteer.launch({
        headless: false,
        defaultViewport: null,
        devtools: true
    }).then(async browser => {
  const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3239.108 Safari/537.36';
  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENT);
  const links = await get_links(page)
  let box = {}
  for (link of links){
    link = 'https://www.vanguardinvestor.co.uk/investments/vanguard-global-balanced-gbp-accumulation-shares/portfolio-data';
    const info = await get_stock_info(page, link)
    box[`${info['name']}-${info['type']}`]
    break
  }
  fs.writeFile("/Users/gguli/Desktop/crawlpupeteer/zz", JSON.stringify(box), function(err) {

    if(err) {
        return console.log('saving error', err);
    }

    console.log("The file was saved!");
  });

  await browser.close();
});
