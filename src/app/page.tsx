import { getDeploymentEnvironment } from "@/lib/deployment-environment";
import styles from "./page.module.css";

export default function Home() {
  const environment = getDeploymentEnvironment();

  return (
    <main className={styles.main}>
      <section className={styles.panel} aria-labelledby="foundation-heading">
        <p className={styles.eyebrow}>Tender OS</p>
        <h1 id="foundation-heading" className={styles.heading}>
          Development foundation
        </h1>
        <p className={styles.lede}>
          The application shell, environment validation, data-access boundaries and
          static safety guards are in place. Customer features are not yet built.
        </p>
        <dl className={styles.meta}>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Environment</dt>
            <dd className={styles.metaValue}>{environment}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt className={styles.metaLabel}>Status</dt>
            <dd className={styles.metaValue}>Foundation only</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
