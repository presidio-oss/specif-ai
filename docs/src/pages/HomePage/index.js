import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HeroBanner from '@site/src/components/HeroBanner';
import ModuleInfoCards from '@site/src/components/ModuleInfoCards';
import DemoShowcase from '@site/src/components/DemoShowcase';
import BackToTop from '@site/src/components/BackToTop';
import styles from './styles.module.css';

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Accelerate your SDLC process with AI-powered intelligence">
      <HeroBanner />
      <main className={styles['main-content']}>
        <ModuleInfoCards />
        <DemoShowcase />
      </main>
      <BackToTop />
    </Layout>
  );
}
