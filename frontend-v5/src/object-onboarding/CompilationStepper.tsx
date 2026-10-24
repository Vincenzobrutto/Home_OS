import type { CompilationStep } from './compilationFlow';
import styles from './compilationSteps.module.css';

/** Visited steps show a check and stay reachable; later steps are dashed and disabled. Accessible names stay «N. Titolo». */
export function CompilationStepper({ steps, current, reached, change }: { steps: CompilationStep[]; current: string; reached: Set<string>; change: (key: string) => void }) {
  const index = steps.findIndex(step => step.key === current);
  return <nav aria-label="Passaggi della compilazione" className={styles.stepNav}>
    <div className={styles.progress} aria-hidden="true">{steps.map((step, i) => <span key={step.key} className={i < index ? styles.segmentDone : i === index ? styles.segmentCurrent : styles.segment} />)}</div>
    <ol className={styles.steps}>
      {steps.map((step, i) => {
        const isCurrent = step.key === current, done = !isCurrent && reached.has(step.key);
        return <li key={step.key}><button type="button" className={isCurrent ? styles.stepCurrent : done ? styles.stepDone : styles.stepTodo} aria-label={i + 1 + '. ' + step.title} aria-current={isCurrent ? 'step' : undefined} disabled={!reached.has(step.key)} onClick={() => change(step.key)}>
          <span className={styles.badge} aria-hidden="true">{done ? '✓' : i + 1}</span>{step.title}
        </button></li>;
      })}
    </ol>
  </nav>;
}
