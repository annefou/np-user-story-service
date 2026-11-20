# np-user-story-service

Publishes a FAIR2Adapt **user story** as a signed nanopublication, for a web form that
cannot hold a key.

The form lives in the FAIR Climate Matchmaker dashboard
([annefou/fdo-compose](https://github.com/annefou/fdo-compose)), which is served from
GitHub Pages. A static page cannot sign anything, so it collects the answers and posts them
here; this signs them with the key in the environment and publishes them to the
nanopublication network.

The statements follow the
[User Story template](https://w3id.org/np/RACciFqZEUYYrteZnGikqUEV8ZRVYfJNB3bzy98X5s_qw).
They are written out in `lib/user-story.mjs` rather than instantiated from the template, so
that what gets signed can be read in one screen. A second template means a second builder,
or a general instantiator.

## Endpoint

```
POST /.netlify/functions/user-story
{
  "label":     "Knowledge broker finds the stories for a region",
  "user":      "knowledge broker at a regional agency",       // As a ...
  "action":    "find the stories relevant to a region",       // I want to ...
  "purpose":   "I can point people to what exists",           // so that ...
  "domain":    ["http://aims.fao.org/aos/agrovoc/c_10967"],   // optional, repeatable
  "challenge": ["https://w3id.org/fff/..."],                  // optional, repeatable
  "exposed":   ["https://w3id.org/fff/..."],                  // optional, repeatable
  "DO":        ["https://w3id.org/..."],                      // optional, repeatable
  "authorName":  "Jane Doe",                                  // optional
  "authorOrcid": "https://orcid.org/0000-0002-1825-0097"      // optional
}
→ { "published": true, "uri": "https://w3id.org/np/RA..." }
```

Add `?dry=1` to get the RDF back without signing or publishing it. Useful for checking a
change before it reaches the network.

**Attribution.** With an ORCID, the assertion is attributed to that person. Without one, it
is attributed to the agent whose key signs it, and the publication says it was collected
through this form. The service never claims that someone signed something they did not.

## Deploying

1. Create a Netlify site from this repository. The function is `netlify/functions/user-story.mjs`.
2. Set the identity on the site. Either paste a nanopub profile into one variable:

   | Variable | What it is |
   | --- | --- |
   | `NANOPUB_PROFILE` | the contents of a `profile.yml`: `name`, `orcid_id`, `public_key`, `private_key`. There is no file system to point `private_key` at here, so the key must be **inline**, not a path. |
   | `NANOPUB_ORCID` | needed when the profile's `orcid_id` names an agent rather than a person, as an agent profile does. The signing library accepts only `https://orcid.org/...` as the identity, and the agent is named through its introduction instead. |

   Or set the parts separately:

   | Variable | What it is |
   | --- | --- |
   | `NANOPUB_PRIVATE_KEY` | RSA private key, base64 as in a nanopub profile, inline. A key of its own can be revoked without touching another identity; an agent's key cannot. |
   | `NANOPUB_ORCID` | the ORCID that stays accountable, recorded as `dct:creator` on everything published here. The library insists this is an `https://orcid.org/...` URI. |
   | `NANOPUB_NAME` | the name that goes with the key, e.g. `claude-ai-agent` |
   | `NANOPUB_INTRO` | URI of the introduction nanopublication that declares the key. This is what makes an agent, rather than the person, the publisher: a story nobody signed for is then attributed to the agent. |

   Signing with an existing agent, rather than a new key: take the key from that agent's
   profile (for `claude-ai-agent`, the file `aiagent_rsa` beside its `profile.yml`), set
   `NANOPUB_INTRO` to the agent's URI, and leave `NANOPUB_ORCID` as the person's ORCID.
   `node tools/sign-as-agent.mjs <profile-dir>` signs a sample that way without publishing it.

   To make a key of its own instead:

   ```sh
   node tools/new-identity.mjs              # prints a key, publishes nothing
   NANOPUB_PRIVATE_KEY=<that key> node tools/new-identity.mjs --publish   # publishes the introduction
   ```

   The key is printed once and stored nowhere: copy it straight into Netlify.
   | `SERVICE_URI` | a URI naming this service, recorded in each publication |
   | `ALLOWED_ORIGINS` | comma separated, default `https://annefou.github.io` |

3. Point the dashboard at it: one annotation on the Research Object,
   `cca:page5Panel1Service`, holding the function URL. Nothing is rebuilt.

## What to watch

Anyone who finds the URL can publish under this key, and nanopublications cannot be
withdrawn. The defences here are modest on purpose: an origin check, a honeypot field,
length limits, and a key that belongs to nothing else. If the form starts attracting
rubbish, add a captcha and a queue that you approve before publishing.

## Checking it locally

```sh
npm install
node tools/preview.mjs     # print the RDF for a sample story
node tools/sign-check.mjs  # sign it with a throwaway key and validate; publishes nothing
```
