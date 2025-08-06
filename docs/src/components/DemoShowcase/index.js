import React from 'react';
import styles from './styles.module.css';

export default function DemoShowcase() {
  return (
    <section className={styles.demoSection}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>See Specifai in Action</h2>
          <p className={styles.sectionSubtitle}>
            Watch how our powerful platform streamlines your SDLC process
          </p>
        </div>
        
        <div className={styles.demoShowcase}>
          <div className={styles.demoContent}>
            <h3 className={styles.demoTitle}>Complete SDLC Acceleration</h3>
            <p className={styles.demoDescription}>
              Specifai intelligently transforms your requirements into comprehensive documentation, 
              automates user story creation, generates test cases, and provides powerful 
              visualization tools - all with AI-powered assistance at every step.
            </p>
          </div>
          <div className={styles.demoImageWrapper}>
            <div className={styles.demoImageGlow}></div>
            <img 
              src="/gif/specifai-overview.gif" 
              alt="Specifai overview demonstration" 
              className={styles.demoImage}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
