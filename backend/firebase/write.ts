// The client-side functions are no longer needed
import { db } from "./firebase.js";

async function updateItem() {
  // Use the Admin SDK's method for creating a document reference
  const docRef = db.collection("metal-scraper").doc("itemTable");

  // Use the 'update' method directly on the document reference
  await docRef.update({
    itemName: "gold",
    lastUpdated: new Date(), // You can add new fields too
  });

  console.log("Document updated successfully");
}

updateItem();
