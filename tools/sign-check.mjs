// Sign the sample with a throwaway key and check it. Nothing is published.
import { KeyPair, Nanopub, NpProfile } from "@nanopub/sign";
import { buildNanopub, validate } from "../lib/user-story.mjs";

const { values, errors } = validate({
  label: "Knowledge broker finds the stories for a region",
  user: "knowledge broker at a regional agency",
  action: "find the adaptation stories relevant to a region, hazard or learning",
  purpose: "I can point people to what already exists instead of starting again",
  domain: ["http://aims.fao.org/aos/agrovoc/c_10967"],
  challenge: ["http://connectivity-hub.com/terms/58d1c857-2638-477d-bc96-ce5b3afc0ee0"],   // Flood
  exposed: ["http://connectivity-hub.com/terms/ecccbc3a-8dd7-4000-8785-4391407fae2c"],   // Health
  labels: { "http://connectivity-hub.com/terms/58d1c857-2638-477d-bc96-ce5b3afc0ee0": "Flood", "http://connectivity-hub.com/terms/ecccbc3a-8dd7-4000-8785-4391407fae2c": "Health" },
  authorOrcid: "https://orcid.org/0000-0002-1784-2920",
  authorName: "Anne Fouilloux",
});
if (errors.length) throw new Error(errors.join("; "));

const keys = new KeyPair();
const kp = keys.toJs();
console.log("keypair fields:", Object.keys(kp));
const profile = new NpProfile(kp.private, "https://orcid.org/0009-0007-7713-900X", "Test agent", "");
const signed = new Nanopub(buildNanopub(values, {
  orcid: "https://orcid.org/0009-0007-7713-900X", name: "Test agent",
  service: "https://w3id.org/fair2adapt/matchmaker-form",
})).sign(profile);
const info = signed.info();
console.log("signed:", info.uri || info.published);
console.log("trusty hash present:", /RA[A-Za-z0-9_-]{40,}/.test(JSON.stringify(info)));
console.log(signed.check().info().uri ? "check: valid" : "check: no uri");
