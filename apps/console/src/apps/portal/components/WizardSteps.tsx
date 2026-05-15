import './WizardSteps.css';

interface WizardStepsProps {
  steps: string[];
  activeIndex: number;
}

export function WizardSteps({ steps, activeIndex }: WizardStepsProps) {
  return (
    <ol className='wizard-steps'>
      {steps.map((label, idx) => {
        const state =
          idx < activeIndex ? 'done' : idx === activeIndex ? 'active' : 'todo';
        return (
          <li key={label} className={`wizard-steps__item wizard-steps__item--${state}`}>
            <span className='wizard-steps__num'>{idx + 1}</span>
            <span className='wizard-steps__label'>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
