import React from "react";
import Link from "@docusaurus/Link";
import styles from "./styles.module.css";

const QuickGuideCards = [
  {
    title: "Quick Start Guide",
    link: "/current/getting-started",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        <line x1="12" y1="6" x2="12" y2="13"></line>
        <line x1="9" y1="9" x2="15" y2="9"></line>
      </svg>
    ),
    description:
      "Experience Specifai in minutes with our step-by-step setup guide designed for rapid deployment",
    external: false,
  },
  {
    title: "Join the Community",
    link: "https://github.com/presidio-oss/specif-ai",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 22v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
        <path d="M9 18c-5 1.5-5-2.5-7-3"></path>
      </svg>
    ),
    description:
      "Contribute to our open source platform, share ideas, and collaborate with developers worldwide",
    external: true,
  },
  {
    title: "Get Specifai Now",
    link: "https://github.com/presidio-oss/specif-ai/releases",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
    ),
    description:
      "Download the latest release and start accelerating your SDLC process immediately",
    external: true,
  },
];

function QuickGuideCard({ title, link, icon, description, external }) {
  return (
    <div className="col col--4">
      <Link
        to={link}
        target={external ? "_blank" : "_self"}
        rel={external ? "noopener noreferrer" : ""}
        className={styles.quickGuideCard}
      >
        <div className={styles.cardIcon}>{icon}</div>
        <h4 className={styles.cardTitle}>{title}</h4>
        <p className={styles.cardDescription}>{description}</p>
      </Link>
    </div>
  );
}

export default function DemoShowcase() {
  return (
    <section className={styles.demoSection}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>See Specifai in Action</h2>
          <p className={styles.demoOverviewText}>
            Specifai intelligently transforms your requirements into
            comprehensive documentation, automates user story creation,
            generates test cases, and provides powerful visualization tools -
            all with AI-powered assistance at every step.
          </p>
        </div>

        <div className={styles.demoShowcaseContent}>
          <div className={styles.demoImageContainer}>
            <div className={styles.demoImageWrapper}>
              <div className={styles.demoImageGlow}></div>
              <video 
                className={styles.demoImage}
                autoPlay 
                loop 
                muted 
                playsInline
              >
                <source src="/videos/specifai-overview-bg.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          <div className={styles.quickGuideCardsContainer}>
            <div className="row">
              {QuickGuideCards.map((card, idx) => (
                <QuickGuideCard
                  key={idx}
                  title={card.title}
                  link={card.link}
                  icon={card.icon}
                  description={card.description}
                  external={card.external}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
