/**
 * Sign and publish a user story that a web form collected.
 *
 * A page served from static hosting cannot hold a signing key, so the form posts here and
 * this signs with the key in the environment. That makes this endpoint the one place where
 * anyone can publish under that key: keep the key for this service alone, so it can be
 * revoked without touching any other identity, and read what it publishes.
 *
 *   POST /.netlify/functions/user-story   {label, user, action, purpose, ...}
 *   POST /.netlify/functions/user-story?dry=1   returns the RDF without signing it
 */

import { identity } from "../../lib/profile.mjs";
import { buildNanopub, validate } from "../../lib/user-story.mjs";

const ALLOWED = (process.env.ALLOWED_ORIGINS || "https://annefou.github.io").split(",").map((o) => o.trim());

const cors = (origin) => ({
  "Access-Control-Allow-Origin": ALLOWED.includes("*") || ALLOWED.includes(origin) ? (origin || "*") : ALLOWED[0],
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
});

const reply = (status, body, origin) =>
  new Response(JSON.stringify(body), { status, headers: cors(origin) });

export default async function handler(request) {
  const origin = request.headers.get("origin") || "";
  if (request.method === "OPTIONS") return new Response("", { status: 204, headers: cors(origin) });
  if (request.method !== "POST") return reply(405, { error: "post a user story here" }, origin);
  if (origin && !ALLOWED.includes("*") && !ALLOWED.includes(origin)) {
    return reply(403, { error: "this form is not allowed to publish here" }, origin);
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return reply(400, { error: "expected JSON" }, origin);
  }

  const { values, errors } = validate(input);
  if (errors.length) return reply(400, { error: errors.join("; ") }, origin);

  // Who signs and who is accountable are two different identities: the key may belong to an
  // agent while a person stays the creator, which is how these are published already.
  const agent = identity(process.env);
  const dry = Boolean(new URL(request.url).searchParams.get("dry"));
  if (agent.missing.length) {
    if (!dry) return reply(500, { error: `this service is missing ${agent.missing.join(" and ")}` }, origin);
    agent.orcid = agent.orcid || "https://orcid.org/0000-0000-0000-0000";   // a dry run still shows the shape
    agent.signer = agent.signer || agent.orcid;
  }

  const rdf = buildNanopub(values, agent);
  if (dry) return reply(200, { rdf, published: false }, origin);

  try {
    const { Nanopub, NpProfile, getNpServer } = await import("@nanopub/sign");
    const profile = new NpProfile(agent.key, agent.orcid, agent.name, agent.intro);
    const published = await new Nanopub(rdf).publish(profile, getNpServer(false));
    const info = published.info();
    return reply(200, { published: true, uri: info.published || info.uri, info }, origin);
  } catch (error) {
    return reply(502, { error: `could not publish: ${error?.message || error}` }, origin);
  }
}
