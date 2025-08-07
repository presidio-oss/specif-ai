import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

const ModuleList = [
  {
    title: "Requirements Management",
    link: "/current/core-features#-requirements-document-types-and-best-practices",
    icon: (
      <svg
        className={styles["module-card__icon"]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <line x1="10" y1="9" x2="8" y2="9"></line>
      </svg>
    ),
    description: (
      <>
        Create and manage comprehensive BRDs, PRDs, NFRs, and UIRs that align 
        business goals with technical implementation. Specifai helps you maintain 
        structured documentation that adheres to industry best practices.
      </>
    ),
  },
  {
    title: "Test Case Automation",
    link: "/current/core-features#-automating-test-case-generation",
    icon: (
      <svg
        className={styles["module-card__icon"]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    ),
    description: (
      <>
        Generate comprehensive test cases directly from user stories with AI assistance. 
        Ensure quality with functional, integration, edge-case, and negative test scenarios that 
        maintain full traceability to source requirements.
      </>
    ),
  },
  {
    title: "Strategic Initiatives",
    link: "/current/core-features#-automating-strategic-initiative-generation",
    icon: (
      <svg
        className={styles["module-card__icon"]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
    ),
    description: (
      <>
        Define high-level organizational objectives that align technical efforts with business goals. 
        Leverage external research URLs for enhanced context and drive multiple solutions with 
        clear vision, business drivers, and success metrics.
      </>
    ),
  },
  {
    title: "Business Process Visualization",
    link: "/current/core-features#-visualizing-business-workflows",
    icon: (
      <svg
        className={styles["module-card__icon"]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
    ),
    description: (
      <>
        Visualize complex business processes with AI-generated flow diagrams that 
        provide clarity for stakeholders. Identify bottlenecks, optimize workflows, 
        and maintain clear documentation of your critical business operations.
      </>
    ),
  },
  {
    title: "AI Assistant Interface",
    link: "/current/core-features#-ai-chat-interface",
    icon: (
      <svg
        className={styles["module-card__icon"]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    ),
    description: (
      <>
        Engage with your intelligent SDLC assistant through natural language chat and 
        inline editing. Receive smart suggestions, enhance requirement clarity, and 
        standardize content with AI assistance that fits into your workflow.
      </>
    ),
  },
  {
    title: "Enterprise Integrations",
    link: "/current/integrations-setup",
    icon: (
      <svg
        className={styles["module-card__icon"]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="2" width="9" height="9" rx="2"></rect>
        <rect x="13" y="2" width="9" height="9" rx="2"></rect>
        <rect x="2" y="13" width="9" height="9" rx="2"></rect>
        <rect x="13" y="13" width="9" height="9" rx="2"></rect>
      </svg>
    ),
    description: (
      <>
        Seamlessly connect Specifai with JIRA, Azure DevOps, and other enterprise tools
        to enhance your workflow. Sync requirements, push generated artifacts, and maintain
        traceability across your development ecosystem.
      </>
    ),
  },
];

function ModuleItem({ title, description, icon, link }) {
  return (
    <div className={clsx("col col--4", styles["module-section__column"])}>
      <Link to={link} style={{ textDecoration: "none", color: "inherit" }}>
        <div className={styles["module-card"]}>
          <div className={styles["module-card__shine"]}></div>
          <div className={styles["module-card__header"]}>
            {icon}
            <h3 className={styles["module-card__title"]}>{title}</h3>
          </div>
          <div className={styles["module-card__content"]}>
            <p className={styles["module-card__description"]}>{description}</p>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function ModuleInfoCards() {
  return (
    <section className={styles["modules-section"]}>
      <div className="container">
        <div className={styles["section-header"]}>
          <h2 className={styles["section-title"]}>Explore Our Modules</h2>
          <p className={styles["section-subtitle"]}>
            Discover the comprehensive suite of tools designed to streamline your SDLC process
          </p>
        </div>
        <div className="row">
          {ModuleList.map((props, idx) => (
            <ModuleItem key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
