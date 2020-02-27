const fs = require("fs");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const PORT = 5000;
const RESPONSES_PATH = __dirname + "/responses";
const corsOptions = { credentials: true };
const app = express();

app.use(bodyParser.json({ type: "text/plain" }));

function handleInteract(req, res) {
  const configId = req.query.configId;
  const responsePath = `${RESPONSES_PATH}/${configId}.json`;
  const origin = req.header("Origin");

  console.log("Origin", origin);
  console.log("request", req.body.events);
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Timing-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  if (!fs.existsSync(responsePath)) {
    console.log("Response JSON does not exist", responsePath);
    res.send("{}");
    return;
  }

  fs.createReadStream(responsePath).pipe(res);
}

app.post("/ee/v1/interact", cors(corsOptions), function(req, res) {
  handleInteract(req, res);
});

app.post("/ee/v1/collect", cors(corsOptions), function(req, res) {
  res.status(204);
  res.send();
});
app.listen(PORT, function() {
  console.log("CORS-enabled web server listening on port " + PORT);
});
