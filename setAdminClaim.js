// setAdminClaim.js
const admin = require('firebase-admin');
const serviceAccount = require('./config/taskplay-8d1c5-firebase-adminsdk-fbsvc-23392e589b.json'); // <-- Update this path!

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const targetUid = 'EEuT9CX8JfPlEI5jix5A4KaxoPP2'; // <-- REPLACE THIS WITH THE ACTUAL UID OF YOUR ADMIN USER

async function setAdminClaim(uid) {
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    // Force refresh the ID token on the client-side for immediate effect.
    // Revoking refresh tokens forces the client to get a new ID token next time.
    await admin.auth().revokeRefreshTokens(uid);
    console.log(`Custom claim 'admin: true' set for user ${uid}.`);
    console.log(`User's refresh tokens revoked. Please sign out and sign back in on the frontend to get a new token.`);
  } catch (error) {
    console.error('Error setting custom user claim:', error);
  }
  process.exit(); // Exit the script
}

setAdminClaim(targetUid);