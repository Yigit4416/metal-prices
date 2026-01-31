import { db } from "./firebase.js";

async function addNewMetal() {
  // This adds a NEW document to the "metal-scraper" collection with a random ID
  const docRef = await db.collection("metal-scraper").add({
    itemId: 2,
    itemName: "copper",
    price: 4.5,
  });

  console.log("New metal added with ID: ", docRef.id);
}

addNewMetal();
