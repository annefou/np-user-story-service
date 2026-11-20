/**
 * Build the RDF of a user story nanopublication.
 *
 * The shape follows the FAIR2Adapt User Story template
 * (https://w3id.org/np/RACciFqZEUYYrteZnGikqUEV8ZRVYfJNB3bzy98X5s_qw): a form fills the
 * blanks, this writes the statements the template declares. It is written out here rather
 * than instantiated from the template, deliberately, so that what gets signed can be read
 * in one screen. A second template means a second builder, or a general instantiator.
 */

export const TEMPLATE = "https://w3id.org/np/RACciFqZEUYYrteZnGikqUEV8ZRVYfJNB3bzy98X5s_qw";
export const FFF = "https://w3id.org/fff/";
export const FIP = "https://w3id.org/fair/fip/terms/";

/** What the form may send, and how long each part may be. */
export const FIELDS = {
  label: { required: true, max: 200, kind: "text" },
  user: { required: true, max: 200, kind: "text" },     // As a ...
  action: { required: true, max: 500, kind: "text" },   // I want to ...
  purpose: { required: true, max: 500, kind: "text" },  // so that ...
  domain: { required: false, kind: "uri", many: true },
  challenge: { required: false, kind: "uri", many: true },
  exposed: { required: false, kind: "uri", many: true },
  objectType: { required: false, kind: "uri", many: true },
  authorName: { required: false, max: 200, kind: "text" },
  authorOrcid: { required: false, kind: "orcid" },
  organisation: { required: false, max: 200, kind: "text" },
};

const ORCID = /^https:\/\/orcid\.org\/\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

const asList = (value) => (value === undefined || value === null ? []
  : Array.isArray(value) ? value.filter((v) => v !== "" && v !== null && v !== undefined) : [value]);

/** Turn whatever the form posted into the values we will write, or explain what is wrong. */
export function validate(input = {}) {
  const errors = [];
  const values = {};

  if (input.website) errors.push("rejected");       // a honeypot field: people leave it empty

  // The form posts the template's own placeholder names; one of them is spelled differently here.
  if (input.DO !== undefined && input.objectType === undefined) input = { ...input, objectType: input.DO };

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
  return { values, errors };
}

const quote = (text) => `"${String(text).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
const uri = (value) => `<${String(value).replace(/[<>"]/g, "")}>`;

/**
 * The nanopublication, unsigned. `agent` is whoever runs this service: its ORCID signs the
 * publication, while the assertion is attributed to the person who wrote the story when they
 * identify themselves, and to the agent when they do not. Nobody is made to say anything.
 */
export function buildNanopub(values, agent, now = new Date()) {
  const base = "http://purl.org/nanopub/temp/mynanopub#";   // the signer replaces this with the trusty URI
  const author = values.authorOrcid || agent.orcid;
  const statements = [
    `  sub:userstory a ${uri(FFF + "User-Story")}`,
    `    rdfs:label ${quote(values.label)}`,
    `    ${uri(FFF + "as-a")} ${quote(values.user)}`,
    `    ${uri(FFF + "i-want-to")} ${quote(values.action)}`,
    `    ${uri(FFF + "so-that")} ${quote(values.purpose)}`,
  ];
  const repeats = [
    [FFF + "covers-domain", values.domain],
    [FFF + "faces-challenge", values.challenge],
    [FFF + "exposed-entity", values.exposed],
    [FIP + "declared-for-digital-object-type", values.objectType],
  ];
  for (const [predicate, list] of repeats) {
    for (const value of asList(list)) statements.push(`    ${uri(predicate)} ${uri(value)}`);
  }

  const provenance = [`  sub:assertion prov:wasAttributedTo ${uri(author)}`];
  if (values.authorName) provenance.push(`  ${uri(author)} foaf:name ${quote(values.authorName)}`);
  if (values.organisation) provenance.push(`  sub:assertion prov:wasAttributedTo ${quote(values.organisation)}`);
  if (!values.authorOrcid) {
    // Said by someone who did not identify themselves: the agent reports it, and says so.
    provenance.push(`  sub:assertion prov:wasQuotedFrom ${uri(TEMPLATE)}`);
  }

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
  : dct:created "${now.toISOString()}"^^xsd:dateTime;
    dct:creator ${uri(agent.orcid)};
    dct:license <https://creativecommons.org/licenses/by/4.0/>;
    rdfs:label ${quote(values.label)};
    npx:introduces sub:userstory;
    npx:wasCreatedAt ${uri(agent.service)};
    nt:wasCreatedFromTemplate ${uri(TEMPLATE)} .
}
`;
}
