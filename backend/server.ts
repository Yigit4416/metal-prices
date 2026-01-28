import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import { type Server } from "bun";

// --- DATABASE IMPORT ---
import { db } from "./db.js";

// --- CONFIGURATION ---
const PORT = 3000;
const GOLD_PRICES_CHANNEL = "gold-prices"; // Channel name for WebSocket broadcasts

// A more secure CORS configuration
const allowedOrigins = [
  "https://metal.ojrd.space", // The production domain
  "http://localhost:4200", // For local Angular development
];

// --- TYPE DEFINITION ---
interface GoldData {
  name: string;
  buying: string;
  selling: string;
  changeRate: string;
  changeAmount: string;
  status: "up" | "down" | "neutral";
  time: string;
}

// --- PUPPETEER SCRAPER (This function remains unchanged) ---
const fetchGoldData = async (): Promise<GoldData[]> => {
  const url = "https://anlikaltinfiyatlari.com/altin/bursa";
  console.log("Launching browser to fetch data...");
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );
    await page.goto(url, { waitUntil: "domcontentloaded" });
    // 3. Wait for a random "human-like" interval
    const minWait = 3000;
    const maxWait = 7000;
    const randomWait =
      Math.floor(Math.random() * (maxWait - minWait + 1)) + minWait;
    console.log(
      `Waiting for a random interval of ${randomWait / 1000} seconds...`,
    );
    await new Promise((r) => setTimeout(r, randomWait));
    const html = await page.content();
    const $ = cheerio.load(html);
    const results: GoldData[] = [];

    $("#kapalicarsi_h tr:not(:first-child)").each((_index, element) => {
      const row = $(element);
      const cells = row.find("td");
      if (cells.length < 3) return;
      const nameCell = cells.eq(0).clone();
      nameCell.find(".time").remove();
      nameCell.find("span").remove();
      const name = nameCell.text().trim();
      const buying = cells.eq(1).text().trim();
      const selling = cells.eq(2).find("div").first().text().trim();
      const time = cells.eq(0).find(".time").text().trim();
      const changeContainer = cells.eq(2).find(".fark");
      let status: "up" | "down" | "neutral" = "neutral";
      if (changeContainer.hasClass("yukari")) status = "up";
      else if (changeContainer.hasClass("asagi")) status = "down";
      const changeRateRaw = changeContainer
        .find("span[data-percent]")
        .text()
        .trim();
      const changeRate = changeRateRaw ? `%${changeRateRaw}` : "";
      const changeAmount = changeContainer
        .find("span[data-change]")
        .text()
        .trim();
      if (name) {
        results.push({
          name,
          buying,
          selling,
          changeRate,
          changeAmount,
          status,
          time,
        });
      }
    });

    console.log(`Scraped ${results.length} items successfully.`);
    return results;
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  } finally {
    if (browser) await browser.close();
  }
};

// --- STATE MANAGEMENT ---
let activeUsers = 0;
let isFetching = false;
// The server instance is made optional to handle the forward-reference from startLiveFeed.
let serverInstance: Server<undefined> | undefined;

// --- THE LIVE FEED LOOP ---
const startLiveFeed = async () => {
  if (activeUsers === 0) {
    console.log("No active users. Stopping live feed.");
    isFetching = false;
    return;
  }

  isFetching = true;
  const data = await fetchGoldData();

  // Also save data to the database
  if (data.length > 0) {
    const insert = db.prepare(
      "INSERT INTO gold_prices (name, buying, selling, status, changeRate, changeAmount, time) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    for (const item of data) {
      insert.run(
        item.name,
        item.buying,
        item.selling,
        item.status,
        item.changeRate,
        item.changeAmount,
        item.time,
      );
    }
    console.log(`Saved ${data.length} items to the database.`);
  }

  if (activeUsers > 0) {
    // Instead of io.emit, we use server.publish to broadcast to a channel
    const message = JSON.stringify({ type: "gold-update", data: data });

    // Check if the server instance is assigned before using it.
    if (serverInstance) {
      serverInstance.publish(GOLD_PRICES_CHANNEL, message);
    }

    const randomDelay = Math.floor(Math.random() * (1500 - 500 + 1)) + 500; // 0.5 to 1.5 seconds
    console.log(`Next fetch in ${randomDelay / 1000}s`);
    setTimeout(startLiveFeed, randomDelay);
  } else {
    isFetching = false;
  }
};

// --- BUN NATIVE SERVER ---
console.log(`Bun Server starting on http://localhost:${PORT}`);

serverInstance = Bun.serve({
  port: PORT,

  // This 'fetch' function handles all incoming HTTP requests (like Express)
  fetch(req, server) {
    const url = new URL(req.url);
    const origin = req.headers.get("Origin");

    // --- CORS Helper ---
    // Explicitly type the headers object to allow adding new properties.
    const corsHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (origin && allowedOrigins.includes(origin)) {
      corsHeaders["Access-Control-Allow-Origin"] = origin;
    }

    // --- HTTP ROUTING ---
    // Listen on the /api/history path
    if (url.pathname === "/api/history") {
      try {
        const query = db.query(
          "SELECT * FROM gold_prices ORDER BY scrapedAt DESC LIMIT 100",
        );
        const data = query.all();
        return new Response(JSON.stringify(data), { headers: corsHeaders });
      } catch (error) {
        return new Response(JSON.stringify({ message: "Database error" }), {
          status: 500,
        });
      }
    }

    // --- WEBSOCKET UPGRADE ---
    // Only try to upgrade connections on the /ws path
    if (url.pathname === "/ws" && server.upgrade(req)) {
      return; // Bun takes over
    }

    // --- FALLBACK ---
    return new Response("Not Found", { status: 404 });
  },

  // This 'websocket' object handles all WebSocket lifecycle events
  websocket: {
    // Called when a client successfully connects
    open(ws) {
      activeUsers++;
      console.log(`WebSocket connected. Total users: ${activeUsers}`);
      ws.subscribe(GOLD_PRICES_CHANNEL); // Join the broadcast channel

      if (activeUsers === 1 && !isFetching) {
        startLiveFeed();
      }
    },

    // Called when a client sends a message
    message(ws, message) {
      console.log("Received message:", message);
      // Not used in this app, but you could handle client messages here
    },

    // Called when a client disconnects
    close(ws, code, reason) {
      activeUsers--;
      console.log(`WebSocket disconnected. Total users: ${activeUsers}`);
      ws.unsubscribe(GOLD_PRICES_CHANNEL); // Leave the broadcast channel
    },
  },
});
