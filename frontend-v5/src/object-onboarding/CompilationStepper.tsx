import type { CompilationStep } from './compilationFlow';
import styles from './compilationSteps.module.css';

export function CompilationStepper({ steps, current, reached, change }: { steps: CompilationStep[]; current: string; reached: Set<string>; change: (key: string) => void }) {
  return <nav aria-label="Passaggi della compilazione"><ol className={styles.steps}>
    {steps.map((step, index) => <li key={step.key}><button type="button" aria-current={step.key === current ? 'step' : undefined} disabled={!reached.has(step.key)} onClick={() => change(step.key)}>{index + 1}. {step.title}</button></li>)}
  </ol></nav>;
}
