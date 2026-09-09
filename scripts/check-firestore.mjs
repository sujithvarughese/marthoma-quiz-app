// Health check for the Firestore backend. Loads env the same way Next.js does
// (so .env.local is respected) and attempts a read of the game document.
//   Run: node scripts/check-firestore.mjs
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  QUIZ_GAME_ID,
} = process.env;

const key = FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

console.log("FIREBASE_PROJECT_ID :", FIREBASE_PROJECT_ID || "MISSING");
console.log("FIREBASE_CLIENT_EMAIL:", FIREBASE_CLIENT_EMAIL || "MISSING");
console.log(
  "FIREBASE_PRIVATE_KEY :",
  FIREBASE_PRIVATE_KEY ? `set (${FIREBASE_PRIVATE_KEY.length} chars)` : "MISSING",
);
console.log("  begins with PEM header:", !!key?.startsWith("-----BEGIN PRIVATE KEY-----"));
console.log("  ends with PEM footer  :", !!key?.trimEnd().endsWith("-----END PRIVATE KEY-----"));
console.log("  parsed line count     :", key ? key.split("\n").length : 0, "(should be ~28)");

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !key) {
  console.error("\n❌ One or more variables are missing. Fix .env.local and retry.");
  process.exit(1);
}

const { cert, initializeApp } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");

try {
  const app = initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: key,
    }),
  });
  const gameId = QUIZ_GAME_ID || "default";
  const snap = await getFirestore(app).collection("quizGames").doc(gameId).get();
  console.log(`\n✅ Connected to Firestore.`);
  console.log(`   quizGames/${gameId} exists: ${snap.exists}`);
  if (snap.exists) console.log(`   updatedAt:`, snap.data()?.updatedAt?.toDate?.() ?? snap.data()?.updatedAt);
  else console.log("   (no saved game yet — it will be created on first save)");
  process.exit(0);
} catch (err) {
  console.error("\n❌ Firestore connection failed:");
  console.error("  ", err.message);
  process.exit(1);
}
