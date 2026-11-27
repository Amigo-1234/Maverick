// Startup file for cPanel "Setup Node.js App" (Phusion Passenger) on AfeesHost.
// Passenger starts this file and routes the domain's traffic to whatever it listens on.
// Run `npm run build` first; this serves the production build.
const { createServer } = require("node:http");
const next = require("next");

const port = process.env.PORT || 3000; // Passenger supplies PORT (may be a socket path, not a number)
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => handle(req, res)).listen(port, () => {
      console.log(`MAVERICK ready on ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start MAVERICK:", err);
    process.exit(1);
  });
