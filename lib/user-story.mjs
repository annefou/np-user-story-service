/**
 * Build a user story nanopublication from the FAIR2Adapt User Story template.
 *
 * The template (https://w3id.org/np/RAFwCQ_DZmx01WR4yzhzghLYK5xafhG6KmNB0Dy8jShZg) is the
 * reference, and its vocabulary is Barbara Magagna's FAIRification Framework Ontology,
 * `https://w3id.org/fff/`, where `fff:User-Story`, `fff:Challenge` and `fff:Exposed-Entity`
 * are defined. The statements below are the ones the template declares, written out so
 * that what gets signed can be read in one screen; a form fills the blanks.
 *
 * Stories published earlier with the FIP wizard use `https://w3id.org/fff/req/` instead,
 * which is not defined anywhere. Queries that should find both have to ask for both.
 */

// v2 (RAFwCQ_…, 21 Nov 2026): v1 with a climate-adaptation domain list; statements unchanged
export const TEMPLATE = "https://w3id.org/np/RAFwCQ_DZmx01WR4yzhzghLYK5xafhG6KmNB0Dy8jShZg";
export const FFF = "https://w3id.org/fff/";
export const DECLARED_FOR = "https://w3id.org/fair/fip/terms/declared-for-digital-object-type";

/**
 * What the form may send, named after the template's placeholders. The template requires
 * at least one domain, risk (challenge) and exposed sector; the digital object type is
 * optional. `labels` carries the names of picked terms, recorded as Nanodash does.
 */
export const FIELDS = {
  id: { required: false, max: 60, kind: "name" },        // the local name, e.g. F2A-CS2-US4
  label: { required: true, max: 200, kind: "text" },
  user: { required: true, max: 300, kind: "text" },      // as-a
  action: { required: true, max: 1000, kind: "text" },   // i-want-to
  purpose: { required: true, max: 1000, kind: "text" },  // so-that
  domain: { required: true, kind: "uri", many: true },   // covers-domain
  challenge: { required: true, kind: "uri", many: true },// faces-challenge
  exposed: { required: true, kind: "uri", many: true },  // exposed-entity
  DO: { required: false, kind: "uri", many: true },      // declared-for-digital-object-type
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

  // Names of picked terms: kept only for terms the story uses, and only plain text
  if (input.labels && typeof input.labels === "object" && !Array.isArray(input.labels)) {
    const used = new Set([...(values.domain || []), ...(values.challenge || []),
      ...(values.exposed || []), ...(values.DO || [])]);
    values.labels = Object.fromEntries(Object.entries(input.labels)
      .filter(([term, name]) => used.has(term) && typeof name === "string" && name.trim()
        && name.length <= 200 && !/[\u0000-\u001f]/.test(name))
      .map(([term, name]) => [term, name.trim()]));
  }

  // Anything the form sent that this shape cannot express is reported rather than dropped
  // in silence: the published stories have no place for it yet.
  const known = new Set([...Object.keys(FIELDS), "example", "website", "labels"]);
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

  // The template's statements, st01 to st09
  const statements = [
    `  sub:${name} a ${uri(FFF + "User-Story")}`,
    `    rdfs:label ${quote(values.label)}`,
    `    ${uri(FFF + "as-a")} ${quote(values.user)}`,
    `    ${uri(FFF + "i-want-to")} ${quote(values.action)}`,
    `    ${uri(FFF + "so-that")} ${quote(values.purpose)}`,
  ];
  for (const [predicate, list] of [
    [FFF + "covers-domain", values.domain],
    [FFF + "faces-challenge", values.challenge],
    [FFF + "exposed-entity", values.exposed],
    [DECLARED_FOR, values.DO],
  ]) {
    for (const value of asList(list)) statements.push(`    ${uri(predicate)} ${uri(value)}`);
  }

  const provenance = [`  sub:assertion dct:creator ${uri(author)}`];
  if (values.authorName) provenance.push(`  ${uri(author)} foaf:name ${quote(values.authorName)}`);
  if (!values.authorOrcid) provenance.push(`  sub:assertion prov:wasGeneratedBy ${uri(agent.service)}`);

  const marks = values.example ? `  : a npx:ExampleNanopub .\n` : "";
  const labels = Object.entries(values.labels || {})
    .map(([term, label]) => `  ${uri(term)} nt:hasLabelFromApi ${quote(label)} .\n`).join("");

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
@prefix fff: <${FFF}> .

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
${marks}${labels}  : dct:created "${now.toISOString()}"^^xsd:dateTime;
    dct:creator ${uri(agent.service)};
    dct:license <https://creativecommons.org/publicdomain/zero/1.0/>;
    rdfs:label ${quote(values.label)};
    npx:introduces sub:${name};
    nt:wasCreatedFromTemplate ${uri(TEMPLATE)} .
}
`;
}
