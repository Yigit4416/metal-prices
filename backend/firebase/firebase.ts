import admin, { type ServiceAccount } from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

// This imports your service account key using the updated 'with' syntax
import serviceAccountJSON from "./metal-scraper-3f3c3-firebase-adminsdk-fbsvc-b6b2f0af54.json" with { type: "json" };

// Cast the imported JSON to the ServiceAccount type for type safety
const serviceAccount = serviceAccountJSON as ServiceAccount;

// Initialize the Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // The databaseURL is derived from your project ID
  databaseURL: "https://metal-scraper-3f3c3.firebaseio.com",
});

// Export the Firestore database instance with admin privileges
export const db = getFirestore();
