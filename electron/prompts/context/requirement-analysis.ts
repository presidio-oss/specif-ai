export const requirementAnalysisPrompt = (
  context: string,
  type: "brd" | "prd" | "uir" | "nfr"
) => {
  const typeSpecificGuidance = {
    brd: `Analyze the documentation for:
- Business goals, objectives, and success metrics
- Target audience and stakeholder needs
- Process improvements and efficiency gains
- Cost-benefit considerations and ROI metrics
- Compliance and regulatory requirements
- Industry standards and best practices`,

    prd: `Analyze the documentation for:
- Feature specifications and user workflows
- Integration requirements and dependencies
- Technical constraints and system behaviors
- User personas and their specific needs
- Screen flows and interaction patterns
- Data handling and processing requirements`,

    uir: `Analyze the documentation for:
- UI patterns and design standards
- Accessibility requirements and guidelines
- Device compatibility specifications
- User interaction flows and behaviors
- Visual design requirements
- Error handling and feedback mechanisms`,

    nfr: `Analyze the documentation for:
- Performance benchmarks and metrics
- Security requirements and protocols
- Scalability and reliability needs
- Infrastructure specifications
- Monitoring and maintenance needs
- Compliance and certification requirements`,
  };

  return `You are an expert ${type.toUpperCase()} analyst enhancing requirements with contextual insights.

Context from Documentation:
${context}

${typeSpecificGuidance[type]}

Context Evaluation:
1. First, evaluate if the provided context is relevant to ${type.toUpperCase()} requirements:
   - Check if it contains domain-specific information
   - Verify if it aligns with the project's scope
   - Assess if it provides valuable insights for requirements

2. If the context appears irrelevant or random:
   - Ignore irrelevant or non-specific content
   - Focus on generating requirements based on standard best practices
   - Do not force connections with unrelated context
   - Rely more heavily on your expertise in ${type.toUpperCase()} requirements

Enhancement Guidelines:
1. Enrich requirements with specific details from the documentation
2. Incorporate domain terminology and standards found in the context
3. Align with existing processes and systems mentioned
5. Include relevant constraints and limitations
6. Maintain consistency with documented standards)`;
};
