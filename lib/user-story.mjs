/**
 * Build a user story nanopublication in the shape the published ones already use.
 *
 * The reference is the F2A series, for example
 * https://w3id.org/np/RALqg4tIq3qA_3gbkvlFUHv6O2J7Y8QKyrFhLlQKctlfo: the type, the
 * predicates, the namespaces, the provenance and the publication info are copied from
 * those, so a story typed into a web form is the same kind of thing as a story written by
 * hand, and the published queries find it. Only the words are the contributor's.
 *
 * Note the namespace: `https://w3id.org/fff/req/`, which is what everything published uses
 * and what the "get all user stories" query asks for. The current User Story template
 * writes `https://w3id.org/fff/` without `req/`; nothing resolves there and no query looks
 * for it, so this follows the published practice until that template is corrected.
 */

export const TEMPLATE = "https://w3id.org/np/RACciFqZEUYYrteZnGikqUEV8ZRVYfJNB3bzy98X5s_qw";
export const FREQ = "https://w3id.org/fff/req/";
export const TERMS = "https://w3id.org/fff/terms/";

/** What the form may send. The three sentences and the name are the contributor's words. */
export const FIELDS = {
  id: { required: false, max: 60, kind: "name" },        // the local name, e.g. F2A-CS2-US4
  label: { required: true, max: 200, kind: "text" },
  user: { required: true, max: 300, kind: "text" },      // as-a
  action: { required: true, max: 600, kind: "text" },    // i-want-to
  purpose: { required: true, max: 600, kind: "text" },   // so-that
  role: { required: false, kind: "uri", many: true },    // has-role
  activity: { required: false, kind: "uri", many: true },// has-action
  outcome: { required: false, kind: "uri", many: true }, // has-purpose
  solution: { required: false, kind: "uri", many: true },// has-solution-path
  input: { required: false, kind: "uri", many: true },   // wf:hasInput, a digital object analysis
  informedBy: { required: false, kind: "uri", many: true },
  authorName: { required: false, max: 200, kind: "text" },
  authorOrcid: { required: false, kind: "orcid" },
};

//: a test says so in the publication itself, rather than leaving rubbish that reads as real
export const EXAMPLE = "http://purl.org/nanopub/x/ExampleNanopub";

const ORCID = /^https:\/\/orcid\.org\/\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

const asList = (value) => (value === undefined || value === null ? []
  : Array.isArray(value) ? value.filter((v) => v !== "" && v !== null && v !== undefined) : [value]);

/** A local name of the same kind the published stories use: letters, digits and dashes. */
export const localName = (text) => String(text).normalize("NFKD")
  .replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "user-story";

/** Turn whatever the form posted into the values we will write, or explain what is wrong. */
export function validate(input = {}) {
  const errors = [];
  const values = {};

  if (input.website) errors.push("rejected");       // a honeypot field: people leave it empty
  const example = input.example === true || input.example === "true" || input.example === 1;

  for (const [name, rule] of Object.entries(FIELDS)) {
    const given = asList(input[name]).map((v) => String(v).trim()).filter(Boolean);
    if (!given.length) {
      if (rule.required) errors.push(`${name} is required`);
      continue;
    }
    if (!rule.many && given.length > 1) errors.push(`${name} takes a single value`);
    for (const value of given) {
      if (rule.max && value.length > rule.max) errors.push(`${name} is longer than ${rule.max} characters`);
      if (rule.kind === "uri" && !/^https?:\/\/[^\s"<>]+$/.test(value)) errors.push(`${name} must be a URL`);
      if (rule.kind === "orcid" && !ORCID.test(value)) errors.push("authorOrcid must look like https://orcid.org/0000-0002-1825-0097");
      if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) errors.push(`${name} contains control characters`);
    }
    values[name] = rule.many ? given : given[0];
  }

  // Anything the form sent that this shape cannot express is reported rather than dropped
  // in silence: the published stories have no place for it yet.
  const known = new Set([...Object.keys(FIELDS), "example", "website"]);
  values.ignored = Object.keys(input).filter((key) => !known.has(key) && asList(input[key]).length);
  if (example) values.example = true;
  return { values, errors };
}

const quote = (text) => `"${String(text).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
const uri = (value) => `<${String(value).replace(/[<>"]/g, "")}>`;

/**
 * The nanopublication, unsigned. The assertion is the contributor's; `agent` is whoever
 * runs this service, recorded as the tool that created the publication, the way the FIP
 * wizard is recorded on the stories it made.
 */
export function buildNanopub(values, agent, now = new Date()) {
  const base = "http://purl.org/nanopub/temp/mynanopub#";   // the signer replaces this
  const name = localName(values.id || values.label);
  const author = values.authorOrcid || agent.signer || agent.orcid;

  const statements = [
    `  sub:${name} a ${uri(FREQ + "User-Story")}`,
    `    rdfs:label ${quote(values.label)}`,
    `    ${uri(FREQ + "as-a")} ${quote(values.user)}`,
    `    ${uri(FREQ + "i-want-to")} ${quote(values.action)}`,
    `    ${uri(FREQ + "so-that")} ${quote(values.purpose)}`,
  ];
  for (const [predicate, list] of [
    [FREQ + "has-role", values.role],
    [FREQ + "has-action", values.activity],
    [FREQ + "has-purpose", values.outcome],
    [FREQ + "has-solution-path", values.solution],
    ["http://purl.org/wf4ever/wfdesc#hasInput", values.input],
    ["http://www.w3.org/ns/prov#wasInformedBy", values.informedBy],
  ]) {
    for (const value of asList(list)) statements.push(`    ${uri(predicate)} ${uri(value)}`);
  }

  const provenance = [`  sub:assertion dct:creator ${uri(author)}`];
  if (values.authorName) provenance.push(`  ${uri(author)} foaf:name ${quote(values.authorName)}`);
  if (!values.authorOrcid) provenance.push(`  sub:assertion prov:wasGeneratedBy ${uri(agent.service)}`);

  const marks = values.example ? `  : a npx:ExampleNanopub .\n` : "";

  return `@prefix : <${base}> .
@prefix sub: <${base}> .
@prefix np: <http://www.nanopub.org/nschema#> .
@prefix npx: <http://purl.org/nanopub/x/> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix nt: <https://w3id.org/np/o/ntemplate/> .
@prefix freq: <${FREQ}> .
@prefix wf: <http://purl.org/wf4ever/wfdesc#> .

sub:Head {
  : np:hasAssertion sub:assertion;
    np:hasProvenance sub:provenance;
    np:hasPublicationInfo sub:pubinfo;
    a np:Nanopublication .
}

sub:assertion {
${statements.join(";\n")} .
}

sub:provenance {
${provenance.join(" .\n")} .
}

sub:pubinfo {
${marks}  : dct:created "${now.toISOString()}"^^xsd:dateTime;
    dct:creator ${uri(agent.service)};
    dct:license <https://creativecommons.org/publicdomain/zero/1.0/>;
    rdfs:label ${quote(values.label)};
    npx:introduces sub:${name};
    nt:wasCreatedFromTemplate ${uri(TEMPLATE)} .
}
`;
}
