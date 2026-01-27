const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const fetchGoldData = async () => {
    const url = 'https://anlikaltinfiyatlari.com/altin/bursa';
    console.log('Testing scraper...'); 

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        
        console.log('Waiting 2 seconds for data to update...');
        await new Promise(r => setTimeout(r, 2000));

        const html = await page.content();
        const $ = cheerio.load(html);
        const results = [];

        $('#kapalicarsi_h tr:not(:first-child)').each((_index, element) => {
            const row = $(element);
            const cells = row.find('td');

            if (cells.length < 3) return;

            const nameCell = cells.eq(0).clone();
            nameCell.find('.time').remove();
            nameCell.find('span').remove();
            const name = nameCell.text().trim();

            const buying = cells.eq(1).text().trim();
            const selling = cells.eq(2).find('div').first().text().trim();
            const time = cells.eq(0).find('.time').text().trim();

            const changeContainer = cells.eq(2).find('.fark');
            let status = 'neutral';
            if (changeContainer.hasClass('yukari')) status = 'up';
            else if (changeContainer.hasClass('asagi')) status = 'down';

            const changeRateRaw = changeContainer.find('span[data-percent]').text().trim();
            const changeRate = changeRateRaw ? `%${changeRateRaw}` : '';
            const changeAmount = changeContainer.find('span[data-change]').text().trim();

            if (name) {
                results.push({ name, buying, selling, changeRate, changeAmount, status, time });
            }
        });

        console.log(`✅ Scraped ${results.length} items successfully.`);
        if (results.length > 0) {
            console.log('📊 First item:', results[0]);
        }
        return results;

    } catch (error) {
        console.error('❌ Error fetching data:', error);
        return [];
    } finally {
        if (browser) await browser.close();
    }
};

fetchGoldData().then(data => {
    console.log('🏁 Test completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
});