/**
 * Make a key for this service, and publish the introduction that ties it to an ORCID.
 *
 *   node tools/new-identity.mjs                 # key only, nothing published
 *   node tools/new-identity.mjs --publish       # also publish the introduction nanopublication
 *
 * The private key is printed once and never stored here: put it straight into the Netlify
 * environment as NANOPUB_PRIVATE_KEY. A key of its own means this form can be revoked
 * without touching any other identity.
 */
import { KeyPair, NpProfile, Nanopub, getNpServer } from "@nanopub/sign";

const orcid = process.env.NANOPUB_ORCID || "https://orcid.org/0000-0002-1784-2920";
const name = process.env.NANOPUB_NAME || "FAIR Climate Matchmaker form";

const keys = new KeyPair().toJs();
console.log(`\nORCID:  ${orcid}\nname:   ${name}\n`);
console.log("NANOPUB_PRIVATE_KEY (copy into Netlify, keep nowhere else):\n");
console.log(keys.private);
console.log("\npublic key:\n");
console.log(keys.public);

if (process.argv.includes("--publish")) {
  const profile = new NpProfile(process.env.NANOPUB_PRIVATE_KEY || keys.private, orcid, name, "");
  const intro = await Nanopub.publish_intro(profile, getNpServer(false));
  const info = intro.info();
  console.log("\nNANOPUB_INTRO:", info.published?.value || info.uri?.value || JSON.stringify(info));
} else {
  console.log("\nNo introduction published. Re-run with --publish once you are ready,");
  console.log("passing the same key through NANOPUB_PRIVATE_KEY, or publish it from Nanodash.");
}
