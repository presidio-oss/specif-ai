import React from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import styles from "./styles.module.css";

const FeatureList = [
  {
    title: "AI-Powered Document Generation",
    link: "/current/core-features#-solution-creation",
    icon: (
      <svg
        className={styles["feature-card__icon"]}
        viewBox="0 0 32 32"
        fill="currentColor"
      >
        <path d="M9.5 9.625l-0.906 2.906-0.875-2.906-2.906-0.906 2.906-0.875 0.875-2.938 0.906 2.938 2.906 0.875zM14.563 8.031l-0.438 1.469-0.5-1.469-1.438-0.469 1.438-0.438 0.5-1.438 0.438 1.438 1.438 0.438zM0.281 24l17.906-17.375c0.125-0.156 0.313-0.25 0.531-0.25 0.281-0.031 0.563 0.063 0.781 0.281 0.094 0.063 0.219 0.188 0.406 0.344 0.344 0.313 0.719 0.688 1 1.063 0.125 0.188 0.188 0.344 0.188 0.5 0.031 0.313-0.063 0.594-0.25 0.781l-17.906 17.438c-0.156 0.156-0.344 0.219-0.563 0.25-0.281 0.031-0.563-0.063-0.781-0.281-0.094-0.094-0.219-0.188-0.406-0.375-0.344-0.281-0.719-0.656-0.969-1.063-0.125-0.188-0.188-0.375-0.219-0.531-0.031-0.313 0.063-0.563 0.281-0.781zM14.656 11.375l1.313 1.344 4.156-4.031-1.313-1.375zM5.938 13.156l-0.406 1.438-0.438-1.438-1.438-0.469 1.438-0.438 0.438-1.469 0.406 1.469 1.5 0.438zM20.5 12.063l0.469 1.469 1.438 0.438-1.438 0.469-0.469 1.438-0.469-1.438-1.438-0.469 1.438-0.438z" />
      </svg>
    ),
    description: (
      <>
        Transform ideas into SDLC documentation instantly. Generate precise
        BRDs, PRDs, and technical specs with intelligent assistance.
      </>
    ),
  },
  {
    title: "Intuitive Requirements Management",
    link: "/current/core-features#-requirements-document-types-and-best-practices",
    icon: (
      <svg
        className={styles["feature-card__icon"]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="7" y1="8" x2="17" y2="8" />
        <line x1="7" y1="12" x2="17" y2="12" />
        <line x1="7" y1="16" x2="17" y2="16" />
      </svg>
    ),
    description: (
      <>
        Streamline project requirements with powerful visualization tools.
        Generate user stories and manage tasks with AI-driven precision.
      </>
    ),
  },
  {
    title: "Seamless Enterprise Integrations",
    link: "/current/integrations-setup",
    icon: (
      <svg
        className={styles["feature-card__icon"]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    description: (
      <>
        Enhance your workflow with Jira, ADO, AWS Bedrock KB, and custom MCP
        servers. Leverage enterprise knowledge for smarter AI suggestions.
      </>
    ),
  },
];

function Feature({ title, description, icon, link }) {
  return (
    <div className={clsx("col col--4", styles["feature-section__column"])}>
      <Link to={link} style={{ textDecoration: "none", color: "inherit" }}>
        <div className={styles["feature-card"]}>
          <div className={styles["feature-card__shine"]}></div>
          <div className="text--center">
            {icon}
            <h3 className={styles["feature-card__title"]}>{title}</h3>
          </div>
          <p className={styles["feature-card__description"]}>{description}</p>
        </div>
      </Link>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles["features-section"]}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
