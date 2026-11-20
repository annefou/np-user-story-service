// Sign a sample story with the claude-ai-agent profile on this machine. Nothing is published.
import { readFileSync } from "fs";
import { Nanopub, NpProfile } from "@nanopub/sign";
import { buildNanopub, validate } from "../lib/user-story.mjs";

const dir = process.argv[2] || "/opt/vth/OpenAIRE_Alien_AI_Hackathon/ai-profile";
const key = readFileSync(`${dir}/aiagent_rsa`, "utf-8").replace(/\s+/g, "");
const agent = {
  signer: "https://w3id.org/np/RAIA9ECaN2ypOVvl4YeNjT6nbpwko9xMcctxB_uYscLG4/claude-ai-agent",
  orcid: "https://orcid.org/0000-0002-1784-2920",
  name: "claude-ai-agent",
  intro: "https://w3id.org/np/RAIA9ECaN2ypOVvl4YeNjT6nbpwko9xMcctxB_uYscLG4/claude-ai-agent",
  service: "https://w3id.org/fair2adapt/matchmaker-form",
};
const { values, errors } = validate({
  label: "Knowledge broker finds the stories for a region",
  user: "knowledge broker at a regional agency",
  action: "find the adaptation stories relevant to a region, hazard or learning",
  purpose: "I can point people to what already exists",
  domain: ["http://aims.fao.org/aos/agrovoc/c_10967"],
});
if (errors.length) throw new Error(errors.join("; "));
const signed = new Nanopub(buildNanopub(values, agent)).sign(new NpProfile(key, agent.orcid, agent.name, agent.intro));
const rdf = signed.rdf();
console.log(rdf.split("\n").filter((l) => /signedBy|creator|hasPublicKey|wasAttributedTo|wasGeneratedBy|hasAlgorithm/.test(l)).join("\n"));
const info = signed.info();
console.log("\nuri:", info.uri?.value || JSON.stringify(info.uri));
console.log("valid:", Boolean(signed.check()));
