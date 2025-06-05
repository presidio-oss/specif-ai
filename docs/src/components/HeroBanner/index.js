import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

export default function HeroBanner() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles['hero-banner'])}>
      <div className="container">
        <div className={styles['hero-banner__content']}>
          <div className={styles['hero-banner__image-wrapper']}>
            <div className={styles['hero-banner__image-glow']}></div>
            <img 
              src="/img/hai-human-ai-logo.svg"
              alt="HAI Human-AI Logo"
              className={styles['hero-banner__image']}
            />
          </div>
          <div className={styles['hero-banner__text']}>
            <h1>
              <div className={styles['hero-banner__product-name']}>{siteConfig.title}</div>
              <div className={styles['hero-banner__title']}>
                {siteConfig.tagline}
              </div>
            </h1>
            <p className={styles['hero-banner__description']}>
              {siteConfig.customFields.subTagline}
            </p>
            <div className={styles['hero-banner__buttons']}>
              <Link
                className={`${styles['hero-banner__button']} ${styles['hero-banner__button--primary']}`}
                to="/current/getting-started">
                <span className={styles['hero-banner__button-shine']}></span>
                Get Started
              </Link>
              <Link
                className={`${styles['hero-banner__button']} ${styles['hero-banner__button--secondary']}`}
                to="https://github.com/presidio-oss/specif-ai"
                target="_blank"
                rel="noopener noreferrer">
                <span className={styles['hero-banner__button-shine']}></span>
                View on GitHub
              </Link>
            </div>
          </div>
          
        </div>
      </div>
    </header>
  );
}
