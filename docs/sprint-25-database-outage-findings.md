# Sprint 25, R1 — how `supabase-js` reports a paused / unreachable database

Recorded 27 September 2026 by Dev Team 1. `@supabase/supabase-js` **2.112.3**
(`@supabase/postgrest-js` 2.112.3), Node v22.23.2. Every JSON block below is
the measurement script's output pasted verbatim, not a paraphrase. The
script (source at the end) calls exactly the two operations the app makes —
the `get_reading_by_id` RPC (`app/reading/[id]/page.tsx`, `actions.ts`) and
the `readings` insert (`app/chart/actions.ts`) — through the same
`createClient(url, anonKey)` the app uses, and dumps every own property of
the returned error, including its class name.

## Summary

| Condition | `status` | `error.code` | `error.message` | `details` / `hint` |
|---|---|---|---|---|
| Healthy, uuid not present | 200 | — (`error: null`, `data: []`) | — | — |
| Healthy, malformed id `abc` | 400 | `22P02` | `invalid input syntax for type uuid: "abc"` | `null` / `null` |
| Healthy, insert violating NOT NULL | 400 | `23502` | `null value in column "positions" … violates not-null constraint` | `null` / `null` |
| **Production project paused** | **0** | **`""`** | **`TypeError: fetch failed`** | cause text / `""` |
| Local, DNS failure (`.invalid` host) | 0 | `""` | `TypeError: fetch failed` | cause text / `""` |
| Local, connection refused | 0 | `""` | `TypeError: fetch failed` | cause text / `""` |

Findings:

1. **A paused Supabase project stops resolving in DNS.** It is not an HTTP
   error page and not a special status code: `curl` gets `Could not resolve
   host` (exit 6) and `supabase-js` gets `getaddrinfo ENOTFOUND`. The paused
   shape is therefore byte-identical, apart from the hostname inside
   `details`, to the local DNS-failure run.
2. **`supabase-js` never throws for any of these.** Every failure comes back
   as `{ data: null, error }`; the measurement's `THREW` branch never fired.
3. **Every unreachable mode shares one structure:** `status: 0`, `code: ""`,
   `message: "TypeError: fetch failed"`, and the specific network cause only
   in `details` (`ENOTFOUND`, `ECONNREFUSED`). Every error that reached
   Postgres carries an HTTP status and a SQLSTATE `code`. The classifier
   (R2) keys on that structure, not on the cause text or hostname.
4. The error is a plain `Object`, not a `PostgrestError` class instance, in
   every case recorded — `instanceof` is not usable as a signal.
5. `/api/health/db` while paused: **HTTP 503**, `status: "down"`,
   `error: "TypeError: fetch failed"` — the route already handles this and
   is unchanged by this sprint.
6. Production `/reading/<random well-formed uuid>` while paused returned
   **404** — the misreport this sprint exists to fix, observed live.

**Limit of what was observed:** the DNS behaviour was seen from this
machine's resolver. The production health route's `fetch failed` confirms
Vercel's runtime also got a network-level failure, but not which one. Nothing
downstream depends on it being `ENOTFOUND` specifically.

**Harmlessness of the insert probe:** it omits `positions` (NOT NULL since
`20260816181929`), so against a healthy database Postgres rejects it (23502,
HTTP 400) and no row is written.

**Not recorded:** a `supabase-js` fetch *timeout*. Neither the pause nor the
two local modes produced one, so there is no recording to take a fixture from.

## Raw recordings

### Healthy baseline (production, before pausing)

```json
{
  "recordedAt": "2026-09-27T19:48:37.129Z",
  "supabaseJs": "2.112.3",
  "node": "v22.23.2",
  "target": "rzlojpwlhbcfzpohbwso.supabase.co",
  "mode": "all",
  "results": [
    {
      "label": "rpc get_reading_by_id, random well-formed uuid",
      "ms": 441,
      "status": 200,
      "statusText": "OK",
      "data": [],
      "error": null
    },
    {
      "label": "rpc get_reading_by_id, malformed id 'abc'",
      "ms": 344,
      "status": 400,
      "statusText": "Bad Request",
      "data": null,
      "error": {
        "__class": "Object",
        "code": "22P02",
        "details": null,
        "hint": null,
        "message": "invalid input syntax for type uuid: \"abc\""
      }
    },
    {
      "label": "insert readings, positions omitted (NOT NULL)",
      "ms": 110,
      "status": 400,
      "statusText": "Bad Request",
      "data": null,
      "error": {
        "__class": "Object",
        "code": "23502",
        "details": null,
        "hint": null,
        "message": "null value in column \"positions\" of relation \"readings\" violates not-null constraint"
      }
    }
  ]
}
```

### Production project paused

```json
{
  "recordedAt": "2026-09-27T19:59:12.431Z",
  "supabaseJs": "2.112.3",
  "node": "v22.23.2",
  "target": "rzlojpwlhbcfzpohbwso.supabase.co",
  "mode": "all",
  "results": [
    {
      "label": "rpc get_reading_by_id, random well-formed uuid",
      "ms": 62,
      "status": 0,
      "statusText": "",
      "data": null,
      "error": {
        "__class": "Object",
        "message": "TypeError: fetch failed",
        "details": "TypeError: fetch failed\n\nCaused by: Error: getaddrinfo ENOTFOUND rzlojpwlhbcfzpohbwso.supabase.co (ENOTFOUND)\nError: getaddrinfo ENOTFOUND rzlojpwlhbcfzpohbwso.supabase.co\n    at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:122:26)",
        "hint": "",
        "code": ""
      }
    },
    {
      "label": "rpc get_reading_by_id, malformed id 'abc'",
      "ms": 34,
      "status": 0,
      "statusText": "",
      "data": null,
      "error": {
        "__class": "Object",
        "message": "TypeError: fetch failed",
        "details": "TypeError: fetch failed\n\nCaused by: Error: getaddrinfo ENOTFOUND rzlojpwlhbcfzpohbwso.supabase.co (ENOTFOUND)\nError: getaddrinfo ENOTFOUND rzlojpwlhbcfzpohbwso.supabase.co\n    at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:122:26)",
        "hint": "",
        "code": ""
      }
    },
    {
      "label": "insert readings, positions omitted (NOT NULL)",
      "ms": 31,
      "status": 0,
      "statusText": "",
      "data": null,
      "error": {
        "__class": "Object",
        "message": "TypeError: fetch failed",
        "details": "TypeError: fetch failed\n\nCaused by: Error: getaddrinfo ENOTFOUND rzlojpwlhbcfzpohbwso.supabase.co (ENOTFOUND)\nError: getaddrinfo ENOTFOUND rzlojpwlhbcfzpohbwso.supabase.co\n    at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:122:26)",
        "hint": "",
        "code": ""
      }
    }
  ]
}
```

Raw `curl` of the RPC endpoint while paused (anon key omitted):

```
$ curl -sS -i -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/get_reading_by_id" \
    -H "apikey: …" -H "Content-Type: application/json" \
    -d '{"reading_id":"00000000-0000-0000-0000-000000000000"}'
curl: (6) Could not resolve host: rzlojpwlhbcfzpohbwso.supabase.co
```

`/api/health/db` while paused:

```
HTTP/2 503 
…
{"status":"down","connected":false,"migrationVersion":null,"error":"TypeError: fetch failed","commit":{"sha":"f8b122c6babb671a11e414ac5b6cc60f6dcf41ba","short":"f8b122c","isLocal":false}}
```

`GET https://my-little-racoon.vercel.app/reading/9b2f3c1e-4d5a-4b6c-8d7e-0f1a2b3c4d5e`
while paused: **404** (today's code, before this sprint).

### After restore (production, reads only)

```json
{
  "recordedAt": "2026-09-27T20:11:28.334Z",
  "supabaseJs": "2.112.3",
  "node": "v22.23.2",
  "target": "rzlojpwlhbcfzpohbwso.supabase.co",
  "mode": "rpc-only",
  "results": [
    {
      "label": "rpc get_reading_by_id, random well-formed uuid",
      "ms": 499,
      "status": 200,
      "statusText": "OK",
      "data": [],
      "error": null
    },
    {
      "label": "rpc get_reading_by_id, malformed id 'abc'",
      "ms": 204,
      "status": 400,
      "statusText": "Bad Request",
      "data": null,
      "error": {
        "__class": "Object",
        "code": "22P02",
        "details": null,
        "hint": null,
        "message": "invalid input syntax for type uuid: \"abc\""
      }
    }
  ]
}
```

### Local: DNS failure

```json
{
  "recordedAt": "2026-09-27T19:32:54.450Z",
  "supabaseJs": "2.112.3",
  "node": "v22.23.2",
  "target": "no-such-project.invalid",
  "mode": "all",
  "results": [
    {
      "label": "rpc get_reading_by_id, random well-formed uuid",
      "ms": 59,
      "status": 0,
      "statusText": "",
      "data": null,
      "error": {
        "__class": "Object",
        "message": "TypeError: fetch failed",
        "details": "TypeError: fetch failed\n\nCaused by: Error: getaddrinfo ENOTFOUND no-such-project.invalid (ENOTFOUND)\nError: getaddrinfo ENOTFOUND no-such-project.invalid\n    at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:122:26)",
        "hint": "",
        "code": ""
      }
    },
    {
      "label": "rpc get_reading_by_id, malformed id 'abc'",
      "ms": 21,
      "status": 0,
      "statusText": "",
      "data": null,
      "error": {
        "__class": "Object",
        "message": "TypeError: fetch failed",
        "details": "TypeError: fetch failed\n\nCaused by: Error: getaddrinfo ENOTFOUND no-such-project.invalid (ENOTFOUND)\nError: getaddrinfo ENOTFOUND no-such-project.invalid\n    at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:122:26)",
        "hint": "",
        "code": ""
      }
    },
    {
      "label": "insert readings, positions omitted (NOT NULL)",
      "ms": 24,
      "status": 0,
      "statusText": "",
      "data": null,
      "error": {
        "__class": "Object",
        "message": "TypeError: fetch failed",
        "details": "TypeError: fetch failed\n\nCaused by: Error: getaddrinfo ENOTFOUND no-such-project.invalid (ENOTFOUND)\nError: getaddrinfo ENOTFOUND no-such-project.invalid\n    at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:122:26)",
        "hint": "",
        "code": ""
      }
    }
  ]
}
```

### Local: connection refused

```json
{
  "recordedAt": "2026-09-27T19:33:01.137Z",
  "supabaseJs": "2.112.3",
  "node": "v22.23.2",
  "target": "127.0.0.1:54399",
  "mode": "all",
  "results": [
    {
      "label": "rpc get_reading_by_id, random well-formed uuid",
      "ms": 7,
      "status": 0,
      "statusText": "",
      "data": null,
      "error": {
        "__class": "Object",
        "message": "TypeError: fetch failed",
        "details": "TypeError: fetch failed\n\nCaused by: Error: connect ECONNREFUSED 127.0.0.1:54399 (ECONNREFUSED)\nError: connect ECONNREFUSED 127.0.0.1:54399\n    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1638:16)",
        "hint": "",
        "code": ""
      }
    },
    {
      "label": "rpc get_reading_by_id, malformed id 'abc'",
      "ms": 1,
      "status": 0,
      "statusText": "",
      "data": null,
      "error": {
        "__class": "Object",
        "message": "TypeError: fetch failed",
        "details": "TypeError: fetch failed\n\nCaused by: Error: connect ECONNREFUSED 127.0.0.1:54399 (ECONNREFUSED)\nError: connect ECONNREFUSED 127.0.0.1:54399\n    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1638:16)",
        "hint": "",
        "code": ""
      }
    },
    {
      "label": "insert readings, positions omitted (NOT NULL)",
      "ms": 1,
      "status": 0,
      "statusText": "",
      "data": null,
      "error": {
        "__class": "Object",
        "message": "TypeError: fetch failed",
        "details": "TypeError: fetch failed\n\nCaused by: Error: connect ECONNREFUSED 127.0.0.1:54399 (ECONNREFUSED)\nError: connect ECONNREFUSED 127.0.0.1:54399\n    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1638:16)",
        "hint": "",
        "code": ""
      }
    }
  ]
}
```

An earlier local attempt used `http://127.0.0.1:1` and got `Error: bad port`
rather than a refusal — undici rejects port 1 before connecting (it is on the
Fetch spec's blocked-port list). Discarded as not a connection failure and
rerun against a closed port.

## Measurement script

```js
// Sprint 25, R1: record the exact { data, error } supabase-js returns for the
// two operations the app performs (get_reading_by_id RPC, readings insert),
// against whatever NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
// point at. Run from the repo root so @supabase/supabase-js resolves to the
// app's own installed version.
//
//   MODE=rpc-only node measure-supabase.mjs   -- reads only, never inserts
//   MODE=all      node measure-supabase.mjs   -- also attempts the insert
//
// The insert deliberately omits `positions` (NOT NULL since
// 20260816181929), so against a healthy database it is rejected and writes
// nothing -- which also yields a real constraint-violation fixture (R5).
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";

const require = createRequire(process.cwd() + "/package.json");
const { createClient } = require("@supabase/supabase-js");
const version = require("@supabase/supabase-js/package.json").version;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const mode = process.env.MODE ?? "rpc-only";
if (!url || !key) throw new Error("set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");

// Everything an error object carries, not just what JSON.stringify sees.
function dump(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(dump);
  const out = { __class: value.constructor?.name };
  for (const k of Object.getOwnPropertyNames(value)) {
    if (k === "stack") continue;
    out[k] = dump(value[k]);
  }
  return out;
}

async function run(label, fn) {
  const started = Date.now();
  try {
    const res = await fn();
    return {
      label,
      ms: Date.now() - started,
      status: res.status,
      statusText: res.statusText,
      data: res.data,
      error: dump(res.error),
    };
  } catch (thrown) {
    return { label, ms: Date.now() - started, THREW: dump(thrown) };
  }
}

const anon = createClient(url, key);
const results = [
  await run("rpc get_reading_by_id, random well-formed uuid", () =>
    anon.rpc("get_reading_by_id", { reading_id: randomUUID() })
  ),
  await run("rpc get_reading_by_id, malformed id 'abc'", () =>
    anon.rpc("get_reading_by_id", { reading_id: "abc" })
  ),
];
if (mode === "all") {
  results.push(
    await run("insert readings, positions omitted (NOT NULL)", () =>
      anon.from("readings").insert({ id: randomUUID(), event_date: "1969-07-20", events: null })
    )
  );
}

console.log(
  JSON.stringify(
    { recordedAt: new Date().toISOString(), supabaseJs: version, node: process.version, target: new URL(url).host, mode, results },
    null,
    2
  )
);
```
