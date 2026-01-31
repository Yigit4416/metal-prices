import { db } from "./firebase.js";

async function readItemTable() {
  // Reference the specific document using the Admin SDK syntax
  const docRef = db.collection("metal-scraper").doc("itemTable");
  const docSnap = await docRef.get();

  if (docSnap.exists) {
    console.log("Document data:", docSnap.data());
    // Output should be: { itemId: 1, itemName: "silver" }
  } else {
    console.log("No such document!");
  }
}

readItemTable();
