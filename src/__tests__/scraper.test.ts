// // /__tests__/scraper.test.ts

// import { scrapeProductData } from '../app/api/scrape/route'; // Adjust the import path if needed

// // A diverse list of URLs to test against
// const TEST_URLS = [
//     'https://www.amazon.in/dp/B0CHXB21G5', // Phone: Apple iPhone 15
//     'https://www.amazon.in/dp/0143454953', // Book: 'Do It Today'
//     'https://www.amazon.in/dp/B09G964H2B', // Accessory: Apple AirTag
//     'https://www.amazon.in/dp/B08JABN48Y', // Clothing: Symbol Men's T-Shirt
// ];

// describe('Amazon Scraper Regression Tests', () => {

//   // Scraping is slow, so we give each test a longer timeout (e.g., 60 seconds)
//   jest.setTimeout(60000); 

//   // This will run a separate test for each URL in the list
//   test.each(TEST_URLS)('should successfully scrape key data from %s', async (url) => {
    
//     // Call our newly exported function
//     const data = await scrapeProductData(url);

//     // Assert that critical fields exist and are in the correct format
//     expect(data.title).toBeTruthy(); // Equivalent to not.toBeNull() and not.toBeUndefined()
//     expect(typeof data.title).toBe('string');
//     expect(data.title.length).toBeGreaterThan(10);

//     // Price can be complex, so we just check it was found
//     expect(data.priceBlockText).toBeTruthy();
//     expect(data.priceBlockText).toMatch(/₹/); // Check for the Rupee symbol

//     expect(data.imageUrl).toBeTruthy();
//     expect(data.imageUrl.startsWith('https://')).toBe(true);

//     // For a specific product, we can even test for a known value
//     if (url.includes('B09G964H2B')) {
//         expect(data.title).toContain('AirTag');
//     }
//   });
// });