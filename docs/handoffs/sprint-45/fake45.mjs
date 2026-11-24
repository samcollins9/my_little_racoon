// Sprint 45 manual check: stand-in for Supabase's PostgREST RPCs. Every call
// is logged; get_recent_reading_dates is deliberately unknown (404), so the
// log shows whether the app still asks for it. ADJACENT=down makes the
// adjacent lookup fail like an outage (500).
//   node fake45.mjs <port> <rows.json>
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
const [port, rowsFile] = process.argv.slice(2);
createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const rows = JSON.parse(readFileSync(rowsFile, "utf8"));
    const args = body ? JSON.parse(body) : {};
    const name = (req.url.match(/\/rest\/v1\/rpc\/([a-z_]+)/) || [])[1];
    let out;
    if (name === "get_reading_by_date") out = rows.byDate[args.reading_date] ? [rows.byDate[args.reading_date]] : [];
    else if (name === "get_adjacent_reading_dates") {
      if (process.env.ADJACENT === "down") { console.log("RPC", name, body, "-> 500"); res.writeHead(500, { "content-type": "application/json" }); return res.end('{"code":"XX000","message":"stand-in outage"}'); }
      out = [{ previous_date: "1961-04-12", next_date: "2001-09-11" }];
    }
    console.log("RPC", name, body, "->", out ? out.length : "404");
    if (!out) { res.writeHead(404, { "content-type": "application/json" }); return res.end('{"message":"unknown"}'); }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(out));
  });
}).listen(+port, "127.0.0.1");
