import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import styles from './hero-banner.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles['hero-banner'])}>
      <div className="container">
        <div className={styles['hero-banner__content']}>
          <div className={styles['hero-banner__text']}>
            <h1>
              <span className={styles['hero-banner__product-name']}>Specifai</span>
              <div className={styles['hero-banner__title']}>
                Accelerate your SDLC process with AI-powered intelligence
              </div>
            </h1>
            <p className={styles['hero-banner__description']}>
              From ideas to actionable tasks in minutes.
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
          <div className={styles['hero-banner__image-wrapper']}>
            <div className={styles['hero-banner__image-glow']}></div>
            <img 
              src={require('@site/static/img/hai-human-ai-logo.png').default} 
              alt="HAI Human-AI Logo"
              className={styles['hero-banner__image']}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      className={clsx('back-to-top', { visible: isVisible })}
      onClick={scrollToTop}
      aria-label="Scroll to top"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 15l-6-6-6 6"/>
      </svg>
    </button>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Accelerate your SDLC process with AI-powered intelligence">
      <HomepageHeader />
      <main className={styles['main-content']}>
        <HomepageFeatures />
      </main>
      <BackToTopButton />
    </Layout>
  );
}
