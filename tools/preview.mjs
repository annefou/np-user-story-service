// Print what the service would sign, for a sample story. No key, no network.
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
  authorName: "Anne Fouilloux",
  authorOrcid: "https://orcid.org/0000-0002-1784-2920",
});
if (errors.length) { console.error("errors:", errors); process.exit(1); }
console.log(buildNanopub(values, {
  orcid: "https://orcid.org/0009-0007-7713-900X",
  name: "FAIR Climate Matchmaker",
  service: "https://w3id.org/fair2adapt/matchmaker-form",
}, new Date("2026-11-24T09:00:00Z")));
