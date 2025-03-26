export function getVectorSearchQuery(
  type: "prd" | "brd" | "uir" | "nfr",
  name: string,
  description: string
): string {
  const queryTemplates: Record<typeof type, string> = {
    prd: `Find the most relevant product requirements document outlining the features, user experience, and technical specifications for "${name}". Context: ${description}.`,
    brd: `Retrieve the most relevant business requirements document detailing the business goals, key functionalities, and expected outcomes for "${name}". Context: ${description}.`,
    uir: `Locate the most relevant user interface requirements document specifying the UI/UX guidelines, accessibility standards, and interface design for "${name}". Context: ${description}.`,
    nfr: `Search for the most relevant non-functional requirements document covering system performance, security constraints, scalability needs, and reliability aspects for "${name}". Context: ${description}.`,
  };

  return queryTemplates[type];
}
