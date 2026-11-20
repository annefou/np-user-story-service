/**
 * Read a nanopub profile the way the Python tooling does: name, orcid_id, public_key,
 * private_key. One secret instead of four.
 *
 * Two things differ in the cloud. There is no file to point `private_key` at, so the key
 * has to be inline, and the signing library refuses an `orcid_id` that is not an
 * `https://orcid.org/...` URI. An agent profile puts the agent's URI there instead, which
 * is correct for the Python library, so this keeps both: the agent URI becomes the
 * introduction that names the publisher, and the ORCID comes from the profile when it is
 * one, or from NANOPUB_ORCID beside it.
 */

import { existsSync, readFileSync } from "fs";

const ORCID = /^https:\/\/orcid\.org\/\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

/** A flat `key: value` document, which is all a nanopub profile is. */
export function parseProfile(text) {
  const profile = {};
  for (const line of String(text).split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_]+)\s*:\s*(.*?)\s*$/.exec(line);
    if (match && !line.trim().startsWith("#")) profile[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return profile;
}

/** Resolve a key given inline, or in a file beside the profile when we are on a machine. */
function keyFrom(value, dir) {
  if (!value) return "";
  const path = value.startsWith("/") ? value : (dir ? `${dir}/${value}` : null);
  if (path && existsSync(path)) return readFileSync(path, "utf-8").replace(/\s+/g, "");
  return value.replace(/\s+/g, "");
}

/**
 * The identity this service publishes with, from a profile, from separate variables, or
 * from both. Returns what the rest of the code needs, and says what is missing.
 */
export function identity(env = process.env, dir = null) {
  const profile = env.NANOPUB_PROFILE ? parseProfile(env.NANOPUB_PROFILE) : {};
  const stated = profile.orcid_id || "";
  const agent = ORCID.test(stated) ? "" : stated;          // a profile that names an agent

  const found = {
    name: env.NANOPUB_NAME || profile.name || "FAIR Climate Matchmaker",
    orcid: env.NANOPUB_ORCID || (ORCID.test(stated) ? stated : ""),
    intro: env.NANOPUB_INTRO || agent,
    key: keyFrom(env.NANOPUB_PRIVATE_KEY || profile.private_key, dir),
    service: env.SERVICE_URI || "https://w3id.org/fair2adapt/matchmaker-form",
  };
  found.signer = found.intro || found.orcid;               // who the agent-less story is attributed to
  found.missing = [
    !found.orcid && "an ORCID (NANOPUB_ORCID, or orcid_id in the profile)",
    !found.key && "a private key (NANOPUB_PRIVATE_KEY, or private_key in the profile)",
  ].filter(Boolean);
  return found;
}
