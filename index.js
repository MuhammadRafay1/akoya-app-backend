// index.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch"; // if Node < 18, else you can use global fetch
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "https://akoya-app.netlify.app";

app.use(cors({
  origin: FRONTEND_ORIGIN,                // restrict to your frontend origin
  methods: ["GET","HEAD","PUT","PATCH","POST","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
  credentials: false,                     // set true only if you send cookies
}));

// explicitly respond to OPTIONS preflight (some middlewares/frameworks need this)
app.options("*", cors({
  origin: FRONTEND_ORIGIN,
  methods: ["GET","HEAD","PUT","PATCH","POST","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
}));

function mask(val = "") {
  if (!val) return "<empty>";
  if (val.length <= 6) return "*".repeat(val.length);
  return `${val.slice(0, 3)}...${val.slice(-3)} (len=${val.length})`;
}

const TOKEN_ENDPOINT = process.env.TOKEN_ENDPOINT || "https://sandbox-idp.ddp.akoya.com/token";
const CLIENT_ID = process.env.CLIENT_ID || "";
const CLIENT_SECRET = process.env.CLIENT_SECRET || "";
const REDIRECT_URI = process.env.REDIRECT_URI || ""; // the frontend redirect URI you registered in Akoya



app.post("/exchange", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "missing_code" });

  try {
    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    const bodyParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    });

    console.log("=== DEBUG /exchange request ===");
console.log("CLIENT_ID =", CLIENT_ID);
console.log("CLIENT_SECRET =", mask(CLIENT_SECRET));
console.log("REDIRECT_URI =", REDIRECT_URI);
console.log("TOKEN_ENDPOINT =", TOKEN_ENDPOINT);
console.log("Authorization Header =", "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"));
console.log("Body Params =", {
  grant_type: "authorization_code",
  code: code ? "<present>" : "<missing>",
  redirect_uri: REDIRECT_URI,
});
console.log("=== END DEBUG ===");


    const tokenResp = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: bodyParams.toString()
    });

    const data = await tokenResp.json();
    if (!tokenResp.ok) {
      return res.status(tokenResp.status).json(data);
    }
    return res.json(data);
  } catch (err) {
    console.error("exchange error", err);
    return res.status(500).json({ error: "exchange_failed", detail: String(err) });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend listening on port ${port}`));
