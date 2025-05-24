var admin = require("firebase-admin");

var serviceAccount = require("./spaceroom-8caed-firebase-adminsdk-fbsvc-9688d67917.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
module.exports = { admin };