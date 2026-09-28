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
| **Production project paused — pause 1 (19:59Z, this recording)** | **0** | **`""`** | **`TypeError: fetch failed`** | cause text / `""` |
| **Production project paused — pause 2 (~20:53Z, LiveQA round 1; see correction below)** | not captured | not captured | health route reported `Project paused. Please unpause the project before proceeding.` | not captured |
| **Production project paused — pause 3 (19:27:20Z, R1b; mixed)** | 0 and **530** | `""` and absent | `TypeError: fetch failed` and Cloudflare 530 "Origin DNS error" HTML | cause text and absent |
| Local, DNS failure (`.invalid` host) | 0 | `""` | `TypeError: fetch failed` | cause text / `""` |
| Local, connection refused | 0 | `""` | `TypeError: fetch failed` | cause text / `""` |

Findings:

1. **Corrected after LiveQA round 1: this recording is one of at least two
   paused states observed.** During *this* pause (19:59Z) the project stopped
   resolving in DNS: `curl` got `Could not resolve host` (exit 6) and
   `supabase-js` got `getaddrinfo ENOTFOUND`, byte-identical apart from the
   hostname to the local DNS-failure run. During the next pause (LiveQA's,
   ~20:53Z) Supabase answered with an HTTP response instead — see
   **Correction (LiveQA round 1)** below. Originally this finding read "A
   paused Supabase project stops resolving in DNS", as if that were the only
   shape; that generalised from one pause and was wrong.
2. **`supabase-js` never throws for any of these.** Every failure comes back
   as `{ data: null, error }`; the measurement's `THREW` branch never fired.
3. **Every unreachable mode shares one structure:** `status: 0`, `code: ""`,
   `message: "TypeError: fetch failed"`, and the specific network cause only
   in `details` (`ENOTFOUND`, `ECONNREFUSED`). Every error that reached
   Postgres carries an HTTP status and a SQLSTATE `code`. *Round 1's
   classifier keyed on that structure as the definition of an outage; the
   second pause showed a paused project can also answer over HTTP, so the
   amended classifier (R2) instead lists what is **not** an outage (`22P02`
   for the lookup, SQLSTATE class 22/23 for the insert) and treats every
   other error as unavailable.*
4. The error is a plain `Object`, not a `PostgrestError` class instance, in
   every case recorded — `instanceof` is not usable as a signal.
5. `/api/health/db` while paused: **HTTP 503**, `status: "down"`,
   `error: "TypeError: fetch failed"` — the route already handles this and
   is unchanged by this sprint.
6. Production `/reading/<random well-formed uuid>` while paused returned
   **404** — the misreport this sprint exists to fix, observed live.

**Limit of what was observed:** the DNS behaviour was seen from this
machine's resolver. The production health route's `fetch failed` confirms
Vercel's runtime also got a network-level failure during this pause, but not
which one.

## Correction (LiveQA round 1)

Source: LiveQA's round-1 verdict, recorded in commit `5a874f9`
(`docs/sprints/state/sprint-25.json`, 27 Sep 2026 21:02Z).

- **Window:** the user paused production from about **20:53Z**; restored,
  with `/api/health/db` back to `ok`, at **21:01:25Z**.
- **The only captured evidence of the shape** is production's own
  `/api/health/db` during that window: **HTTP 503**,
  `{"status":"down","connected":false,"migrationVersion":null,"error":"Project paused. Please unpause the project before proceeding.",…}`.
  That route passes `error.message` through from `supabase-js` (via the
  admin client). *Inference, not observed:* a failed fetch reads `TypeError:
  fetch failed` (finding 5), so this message most likely came from an HTTP
  response Supabase sent.
- **Not captured:** the HTTP status `supabase-js` saw, `error.code`,
  `details`, `hint`. LiveQA's direct Supabase REST probe was denied by its
  permission layer, and the app only logged the message. The amended R8 now
  logs the whole error object and status, so the next occurrence is captured
  in full.
- **Effect:** round 1's classifier did not recognise it. On production,
  `/reading/<real id>` returned 404, the save showed "Save failed, try
  again.", and the horoscope action redirected to a 404 — all three exactly
  as before the sprint.
- **Why the two pauses differed** (time since pausing, DNS caching, something
  on Supabase's side) is unconfirmed. The amended classifier doesn't depend
  on knowing: every unlisted error is unavailable. R1b: Dev Team re-runs the
  measurement script at the start of the round-2 retest pause, before LiveQA
  begins, and adds whatever it records here. **Done:** see **Round-2 retest
  pause (R1b)** below.

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

## Round-2 retest pause (R1b), 28 September 2026

Recorded by Dev Team 1 at the start of the round-2 retest pause, before
LiveQA began. Same script and versions as above (`supabase-js` 2.112.3,
Node v22.23.2). Production was running the round-1 fix (`c6ce307`, shipping
`eee2be7`).

- **19:26:42Z:** the pause had not taken effect yet. A probe run found
  the project healthy and returned the same results as the baseline (empty
  result, `22P02`, `23502`), and `/api/health/db` was `ok`. That run's output
  file was later overwritten, so it is not reproduced here.
- **19:27:08Z:** `/api/health/db` first reported `down`.
- **19:27:20Z (paused, run 1): mixed within one second.** The random-uuid
  lookup and the insert got the pause-1 shape (`status: 0`, `code: ""`,
  `ENOTFOUND`). The `abc` lookup got **HTTP 530**: Cloudflare's "Origin DNS
  error" page (error 1016), 8295 bytes of HTML returned as `message`, with
  no `code`, `details` or `hint` at all. `supabase-js` omitted them, so they
  are absent from the JSON, not empty. A raw `curl` a moment later got the
  same 530.
- **19:27:31Z (paused, run 2):** all three were back to `status: 0` /
  `ENOTFOUND`.

**A pause has now produced three shapes:** DNS failure (pause 1, and most of
this one), a Cloudflare 530 HTML page (this one, briefly), and an HTTP
response whose message was `Project paused. Please unpause the project
before proceeding.` (LiveQA round 1, fields not captured). The pause
evidently moves through states over time, and which one a request hits
depends on timing. This is why the amended classifier doesn't enumerate
outage shapes. None of the three carries `22P02` or a class 22/23 SQLSTATE,
so all three classify as unavailable. The 530 is now a real recorded example
of "non-zero HTTP status, no SQLSTATE", the case previously covered only by
the synthetic unit-test fixture.

### Paused, run 1 (19:27:20Z)

```json
{
  "recordedAt": "2026-09-28T19:27:20.156Z",
  "supabaseJs": "2.112.3",
  "node": "v22.23.2",
  "target": "rzlojpwlhbcfzpohbwso.supabase.co",
  "mode": "all",
  "results": [
    {
      "label": "rpc get_reading_by_id, random well-formed uuid",
      "ms": 57,
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
      "ms": 265,
      "status": 530,
      "statusText": "<none>",
      "data": null,
      "error": {
        "__class": "Object",
        "message": "<!doctype html>\n<!--[if lt IE 7]> <html class=\"no-js ie6 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 7]>    <html class=\"no-js ie7 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 8]>    <html class=\"no-js ie8 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if gt IE 8]><!-->\n<html class=\"no-js\" lang=\"en-US\">\n    <!--<![endif]-->\n    <head>\n        <title>Origin DNS error | rzlojpwlhbcfzpohbwso.supabase.co | Cloudflare</title>\n        <meta charset=\"UTF-8\" />\n<meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\" />\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=Edge\" />\n<meta name=\"robots\" content=\"noindex, nofollow\" />\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />\n<link rel=\"stylesheet\" id=\"cf_styles-css\" href=\"/cdn-cgi/styles/main.css\" /> <script>\n  (function(){if(document.addEventListener&&window.XMLHttpRequest&&JSON&&JSON.stringify){var e=function(a){var c=document.getElementById(\"error-feedback-survey\"),d=document.getElementById(\"error-feedback-success\"),b=new XMLHttpRequest;a={event:\"feedback clicked\",properties:{errorCode: 1016 },helpful:a,version: 1 };b.open(\"POST\",\"https://sparrow.cloudflare.com/api/v1/event\");b.setRequestHeader(\"Content-Type\",\"application/json\");b.setRequestHeader(\"Sparrow-Source-Key\",\"c771f0e4b54944bebf4261d44bd79a1e\");\nb.send(JSON.stringify(a));c.classList.add(\"feedback-hidden\");d.classList.remove(\"feedback-hidden\")};document.addEventListener(\"DOMContentLoaded\",function(){var a=document.getElementById(\"error-feedback\"),c=document.getElementById(\"feedback-button-yes\"),d=document.getElementById(\"feedback-button-no\");\"classList\"in a&&(a.classList.remove(\"feedback-hidden\"),c.addEventListener(\"click\",function(){e(!0)}),d.addEventListener(\"click\",function(){e(!1)}))})}})();\n</script>\n        <script\n            defer\n            src=\"https://performance.radar.cloudflare.com/beacon.js\"\n        ></script>\n    </head>\n    <body>\n        <div id=\"cf-wrapper\">\n            <div\n                class=\"cf-alert cf-alert-error cf-cookie-error hidden\"\n                id=\"cookie-alert\"\n                data-translate=\"enable_cookies\"\n            >\n                Please enable cookies.\n            </div>\n            <div id=\"cf-error-details\" class=\"p-0\">\n                <header\n                    class=\"mx-auto pt-10 lg:pt-6 lg:px-8 w-240 lg:w-full mb-15 antialiased\"\n                >\n                    <h1\n                        class=\"inline-block md:block mr-2 md:mb-2 font-light text-60 md:text-3xl text-black-dark leading-tight\"\n                    >\n                        <span data-translate=\"error\">Error</span>\n                        <span>1016</span>\n                    </h1>\n                    <span\n                        class=\"inline-block md:block heading-ray-id font-mono text-15 lg:text-sm lg:leading-relaxed\"\n                        >Ray ID: a42525154b4fda26 &bull;</span\n                    >\n                    <span\n                        class=\"inline-block md:block heading-ray-id font-mono text-15 lg:text-sm lg:leading-relaxed\"\n                        >2026-09-28 19:27:19 UTC</span\n                    >\n                    <h2\n                        class=\"text-gray-600 leading-1.3 text-3xl lg:text-2xl font-light\"\n                    >\n                        Origin DNS error\n                    </h2>\n                </header>\n                \n                \n                <section class=\"w-240 lg:w-full mx-auto mb-8 lg:px-8\">\n                    <div id=\"what-happened-section\" class=\"w-1/2 md:w-full\">\n                        <h2\n                            class=\"text-3xl leading-tight font-normal mb-4 text-black-dark antialiased\"\n                            data-translate=\"what_happened\"\n                        >\n                            What happened?\n                        </h2>\n                        \n                            <p>You've requested a page on a website (rzlojpwlhbcfzpohbwso.supabase.co) that is on the <a href=\"https://www.cloudflare.com/5xx-error-landing/\" target=\"_blank\">Cloudflare</a> network. Cloudflare is currently unable to resolve your requested domain (rzlojpwlhbcfzpohbwso.supabase.co).</p>\n                        \n                        \n                        <p>\n                            Please see\n                            <a\n                                rel=\"noopener noreferrer\"\n                                href=\"https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1016/\"\n                                target=\"_blank\"\n                                >https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1016/</a\n                            >\n                            for more details.\n                        </p>\n                        \n                    </div>\n\n                    \n                    <div\n                        id=\"resolution-copy-section\"\n                        class=\"w-1/2 mt-6 text-15 leading-normal\"\n                    >\n                        <h2\n                            class=\"text-3xl leading-tight font-normal mb-4 text-black-dark antialiased\"\n                            data-translate=\"what_can_i_do\"\n                        >\n                            What can I do?\n                        </h2>\n                        <p><strong>If you are a visitor of this website:</strong><br />Please try again in a few minutes.</p><p><strong>If you are the owner of this website:</strong><br />Check your DNS settings. If you are using a CNAME origin record, make sure it is valid and resolvable. <a rel=\"noopener noreferrer\" href=\"https://support.cloudflare.com/hc/en-us/articles/234979888-Error-1016-Origin-DNS-error\">Additional troubleshooting information here.</a></p>\n                    </div>\n                    \n                </section>\n                \n\n                <div class=\"feedback-hidden py-8 text-center\" id=\"error-feedback\">\n    <div id=\"error-feedback-survey\" class=\"footer-line-wrapper\">\n        Was this page helpful?\n        <button\n            class=\"border border-solid bg-white cf-button cursor-pointer ml-4 px-4 py-2 rounded\"\n            id=\"feedback-button-yes\"\n            type=\"button\"\n        >\n            Yes\n        </button>\n        <button\n            class=\"border border-solid bg-white cf-button cursor-pointer ml-4 px-4 py-2 rounded\"\n            id=\"feedback-button-no\"\n            type=\"button\"\n        >\n            No\n        </button>\n    </div>\n    <div class=\"feedback-success feedback-hidden\" id=\"error-feedback-success\">\n        Thank you for your feedback!\n    </div>\n</div> <div class=\"cf-error-footer cf-wrapper w-240 lg:w-full py-10 sm:py-4 sm:px-8 mx-auto text-center sm:text-left border-solid border-0 border-t border-gray-300\">\n    <p class=\"text-13\">\n      <span class=\"cf-footer-item sm:block sm:mb-1\">Cloudflare Ray ID: <strong class=\"font-semibold\">a42525154b4fda26</strong></span>\n      <span class=\"cf-footer-separator sm:hidden\">&bull;</span>\n      <span id=\"cf-footer-item-ip\" class=\"cf-footer-item hidden sm:block sm:mb-1\">\n        Your IP:\n        <button type=\"button\" id=\"cf-footer-ip-reveal\" class=\"cf-footer-ip-reveal-btn\">Click to reveal</button>\n        <span class=\"hidden\" id=\"cf-footer-ip\">73.132.231.167</span>\n        <span class=\"cf-footer-separator sm:hidden\">&bull;</span>\n      </span>\n      <span class=\"cf-footer-item sm:block sm:mb-1\"><span>Performance &amp; security by</span> <a rel=\"noopener noreferrer\" href=\"https://www.cloudflare.com/5xx-error-landing\" id=\"brand_link\" target=\"_blank\">Cloudflare</a></span>\n      \n    </p>\n    <script>(function(){function d(){var b=a.getElementById(\"cf-footer-item-ip\"),c=a.getElementById(\"cf-footer-ip-reveal\");b&&\"classList\"in b&&(b.classList.remove(\"hidden\"),c.addEventListener(\"click\",function(){c.classList.add(\"hidden\");a.getElementById(\"cf-footer-ip\").classList.remove(\"hidden\")}))}var a=document;document.addEventListener&&a.addEventListener(\"DOMContentLoaded\",d)})();</script>\n  </div><!-- /.error-footer -->\n            </div>\n            <!-- /#cf-error-details -->\n        </div>\n        <!-- /#cf-wrapper -->\n\n         <script>\n    window._cf_translation = {};\n    \n    \n  </script> \n        \n    </body>\n</html>"
      }
    },
    {
      "label": "insert readings, positions omitted (NOT NULL)",
      "ms": 35,
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

### Paused, run 2 (19:27:31Z)

```json
{
  "recordedAt": "2026-09-28T19:27:31.441Z",
  "supabaseJs": "2.112.3",
  "node": "v22.23.2",
  "target": "rzlojpwlhbcfzpohbwso.supabase.co",
  "mode": "all",
  "results": [
    {
      "label": "rpc get_reading_by_id, random well-formed uuid",
      "ms": 38,
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
      "ms": 24,
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
      "ms": 52,
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

Raw `curl` of the RPC endpoint during run 1 (anon key and the Cloudflare
`set-cookie` value omitted; body summarised: 8295 bytes of HTML, title
`Origin DNS error | rzlojpwlhbcfzpohbwso.supabase.co | Cloudflare`,
Cloudflare error code 1016):

```
HTTP/2 530 
date: Mon, 28 Sep 2026 19:27:20 GMT
content-type: text/plain
content-length: 8295
cf-ray: a42525173b633d1c-IAD
cache-control: private, max-age=0, no-store, no-cache, must-revalidate, post-check=0, pre-check=0
expires: Thu, 01 Jan 1970 00:00:01 GMT
server: cloudflare
content-security-policy: default-src 'none'; sandbox
x-content-type-options: nosniff
referrer-policy: same-origin
sb-gateway-version: 1
sb-project-ref: rzlojpwlhbcfzpohbwso
sb-request-id: 01a0e97c-6a87-7a40-8d2c-8688237d3ddd
x-frame-options: SAMEORIGIN
strict-transport-security: max-age=31536000; includeSubDomains; preload
alt-svc: h3=":443"; ma=86400
```

`/api/health/db` during run 1 (first 300 characters of the body):

```
HTTP/2 503 
…
{"status":"down","connected":false,"migrationVersion":null,"error":"<!doctype html>\n<!--[if lt IE 7]> <html class=\"no-js ie6 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 7]>    <html class=\"no-js ie7 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 8]>    <html class=\"no-js ie8 oldie\" lang=…
```

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
