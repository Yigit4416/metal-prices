import express, { type Request, type Response } from "express";
// import axios from 'axios'; <--- Removed
import puppeteer from "puppeteer"; // <--- NEW
import * as cheerio from "cheerio";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const PORT = 3000;

// A more secure CORS configuration for production
const allowedOrigins = [
  "https://metal.ojrd.space", // The production domain
  "http://localhost:4200", // For local Angular development
];

const corsOptions = {
  origin: (origin, callback) => {
    // If there's no origin (like for same-origin requests or server-to-server), allow it.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST"],
};

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: corsOptions,
});

app.use(cors(corsOptions));

interface GoldData {
  name: string;
  buying: string;
  selling: string;
  changeRate: string;
  changeAmount: string;
  status: "up" | "down" | "neutral";
  time: string;
}

// --- NEW SCRAPER FUNCTION WITH PUPPETEER ---
const fetchGoldData = async (): Promise<GoldData[]> => {
  const url = "https://anlikaltinfiyatlari.com/altin/bursa";
  console.log("Launching browser to fetch data...");

  let browser;
  try {
    // 1. Launch the hidden browser
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"], // Safe args for Linux/Servers
    });

    const page = await browser.newPage();

    // Set User Agent so we look like a real person
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    // 2. Go to the URL
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // 3. THE MAGIC WAIT: Pause for 2 seconds to let the site update itself
    console.log("Waiting 2 seconds for data to update...");
    await new Promise((r) => setTimeout(r, 2000));

    // 4. Get the final HTML
    const html = await page.content();

    // 5. Load into Cheerio (Same as before)
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
    // 6. ALWAYS close the browser to free up RAM
    if (browser) await browser.close();
  }
};

// --- STATE MANAGEMENT ---
let activeUsers = 0;
let isFetching = false;

// --- THE LIVE LOOP ---
const startLiveFeed = async () => {
  if (activeUsers === 0) {
    console.log("No active users. Stopping live feed.");
    isFetching = false;
    return;
  }

  isFetching = true;
  const data = await fetchGoldData();

  if (activeUsers > 0) {
    io.emit("gold-update", data);
    // Since Puppeteer is slower, we can increase the delay slightly (e.g., 10-15s)
    const randomDelay = Math.floor(Math.random() * (15000 - 10000 + 1) + 10000);
    console.log(`Next fetch in ${randomDelay / 1000}s`);
    setTimeout(startLiveFeed, randomDelay);
  } else {
    isFetching = false;
  }
};

// --- SOCKET CONNECTION ---
io.on("connection", (socket) => {
  activeUsers++;
  console.log(`User connected. Total: ${activeUsers}`);

  // If feed isn't running, start it
  if (activeUsers === 1 && !isFetching) {
    startLiveFeed();
  }

  // Note: I removed the "Immediate Fetch" for new users because
  // launching Puppeteer takes a few seconds anyway. They will get data
  // when the main loop finishes its first run.

  socket.on("disconnect", () => {
    activeUsers--;
    console.log(`User disconnected. Total: ${activeUsers}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Smart Server running on http://localhost:${PORT}`);
});
