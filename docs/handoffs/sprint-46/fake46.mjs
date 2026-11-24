// Sprint 46 manual check: Sprint 45's PostgREST stand-in (../sprint-45/
// fake45.mjs), plus get_reading_by_id, so /reading/<id> renders its real
// page against the one saved row instead of the error page.
//   node fake46.mjs <port> <rows.json>
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
    else if (name === "get_reading_by_id") out = Object.values(rows.byDate).filter((r) => r.id === args.reading_id);
    else if (name === "get_adjacent_reading_dates") out = [{ previous_date: "1961-04-12", next_date: "2001-09-11" }];
    console.log("RPC", name, body, "->", out ? out.length : "404");
    if (!out) { res.writeHead(404, { "content-type": "application/json" }); return res.end('{"message":"unknown"}'); }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(out));
  });
}).listen(+port, "127.0.0.1");
