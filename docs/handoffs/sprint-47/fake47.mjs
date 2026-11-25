// Sprint 47 manual check: Sprint 46's PostgREST stand-in (../sprint-46/
// fake46.mjs) plus get_recent_reading_dates. Its pool deliberately holds
// the page's own date (1969-07-20) and a future date (2031-01-01), so the
// random link's filter is exercised in the browser too. RECENT=down makes
// that lookup fail like an outage (500).
//   node fake47.mjs <port> <rows.json>
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
const [port, rowsFile] = process.argv.slice(2);
const RECENT = ["2031-01-01", "1969-07-20", "1912-04-15", "1961-04-12", "2001-09-11", "1989-11-09"];
createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const rows = JSON.parse(readFileSync(rowsFile, "utf8"));
    const args = body ? JSON.parse(body) : {};
    const name = (req.url.match(/\/rest\/v1\/rpc\/([a-z_]+)/) || [])[1];
    let out;
    if (name === "get_reading_by_date") out = rows.byDate[args.reading_date] ? [rows.byDate[args.reading_date]] : [];
    else if (name === "get_reading_by_id") out = Object.values(rows.byDate).filter((r) => r.id === args.reading_id);
    else if (name === "get_recent_reading_dates") {
      if (process.env.RECENT === "down") {
        console.log("RPC", name, body, "-> 500");
        res.writeHead(500, { "content-type": "application/json" });
        return res.end('{"code":"XX000","message":"stand-in outage"}');
      }
      out = RECENT.map((event_date) => ({ event_date }));
    }
    console.log("RPC", name, body, "->", out ? out.length : "404");
    if (!out) { res.writeHead(404, { "content-type": "application/json" }); return res.end('{"message":"unknown"}'); }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(out));
  });
}).listen(+port, "127.0.0.1");
