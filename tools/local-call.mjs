// Call the function the way Netlify will, without Netlify. Dry by default: nothing is published.
import handler from "../netlify/functions/user-story.mjs";
const body = {
  label: "Knowledge broker finds the stories for a region",
  user: "knowledge broker at a regional agency",
  action: "find the adaptation stories relevant to a region, hazard or learning",
  purpose: "I can point people to what already exists",
  domain: ["http://aims.fao.org/aos/agrovoc/c_10967"],
  challenge: ["http://connectivity-hub.com/terms/58d1c857-2638-477d-bc96-ce5b3afc0ee0"],   // Flood
  exposed: ["http://connectivity-hub.com/terms/ecccbc3a-8dd7-4000-8785-4391407fae2c"],   // Health
  labels: { "http://connectivity-hub.com/terms/58d1c857-2638-477d-bc96-ce5b3afc0ee0": "Flood", "http://connectivity-hub.com/terms/ecccbc3a-8dd7-4000-8785-4391407fae2c": "Health" },
};
const dry = !process.argv.includes("--publish");
const response = await handler(new Request(
  `https://example.netlify.app/.netlify/functions/user-story${dry ? "?dry=1" : ""}`,
  { method: "POST", headers: { "content-type": "application/json", origin: "https://annefou.github.io" },
    body: JSON.stringify(body) }));
console.log(response.status, await response.text());
