import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';

import css from './HandoverChecklist.module.css';

// Booking-process states in which the handover matters. 'accepted' covers
// pickup and the rental itself, 'delivered' is after the rental period.
const PICKUP_STATES = ['accepted'];
const RETURN_STATES = ['delivered'];
const VISIBLE_STATES = [...PICKUP_STATES, ...RETURN_STATES];

const PHASES = ['pickup', 'return'];

/**
 * Photo handover protocol. Photos taken (and shared in the chat) at pickup and
 * at return are the evidence in any deposit or damage discussion.
 */
const HandoverChecklist = props => {
  const { className, isBookingProcess, processState, canAttachPhotos } = props;

  if (!isBookingProcess || !VISIBLE_STATES.includes(processState)) {
    return null;
  }

  const currentPhase = RETURN_STATES.includes(processState) ? 'return' : 'pickup';

  return (
    <section className={classNames(css.root, className)} aria-labelledby="handover-title">
      <h2 id="handover-title" className={css.title}>
        <FormattedMessage id="HandoverChecklist.title" />
      </h2>
      <p className={css.intro}>
        <FormattedMessage id="HandoverChecklist.intro" />
      </p>

      <div className={css.phases}>
        {PHASES.map(phase => (
          <div
            key={phase}
            className={classNames(css.phase, { [css.phaseCurrent]: phase === currentPhase })}
          >
            <h3 className={css.phaseTitle}>
              <FormattedMessage id={`HandoverChecklist.${phase}.title`} />
              {phase === currentPhase ? (
                <span className={css.nowBadge}>
                  <FormattedMessage id="HandoverChecklist.now" />
                </span>
              ) : null}
            </h3>
            <ol className={css.steps}>
              {[1, 2, 3].map(n => (
                <li key={n} className={css.step}>
                  <span className={css.stepNumber}>{n}</span>
                  <span>
                    <FormattedMessage
                      id={
                        n === 3 && !canAttachPhotos
                          ? `HandoverChecklist.${phase}.step3NoUpload`
                          : `HandoverChecklist.${phase}.step${n}`
                      }
                    />
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HandoverChecklist;
