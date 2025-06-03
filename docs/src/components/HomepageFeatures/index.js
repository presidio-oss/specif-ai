import React from 'react';
import clsx from 'clsx';
import styles from './feature-cards.module.css';

const FeatureList = [
  {
    title: 'AI-Powered Document Generation',
    icon: (
      <svg
        className={styles['feature-card__icon']}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h8" />
        <path d="M8 9h2" />
      </svg>
    ),
    description: (
      <>
        Transform ideas into comprehensive SDLC documentation instantly.
        Generate precise BRDs, PRDs, and technical specs with intelligent
        assistance.
      </>
    ),
  },
  {
    title: 'Intuitive Requirements Management',
    icon: (
      <svg
        className={styles['feature-card__icon']}
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
    title: 'Seamless Enterprise Integrations',
    icon: (
      <svg
        className={styles['feature-card__icon']}
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
        Enhance your workflow with Jira, AWS Bedrock KB, and custom MCP servers.
        Leverage enterprise knowledge for smarter AI suggestions.
      </>
    ),
  },
];

function Feature({ title, description, icon }) {
  return (
    <div className={clsx('col col--4')}>
      <div className={styles['feature-card']}>
        <div className={styles['feature-card__shine']}></div>
        <div className='text--center'>
          {icon}
          <h3 className={styles['feature-card__title']}>{title}</h3>
        </div>
        <p className={styles['feature-card__description']}>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles['features-section']}>
      <div className='container'>
        <div className='row'>
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
