import React, { useMemo } from 'react';
import classNames from 'classnames';

import css from './Confetti.module.css';

const COLORS = [
  'var(--marketplaceColor)',
  'var(--colorSuccessLight)',
  '#ffc53d',
  '#ff6b6b',
  '#4dabf7',
];
const SHAPES = [css.shapeRect, css.shapeCircle];
const PIECE_COUNT = 60;

// Purely CSS-driven confetti burst (no external dependency) - randomized
// once per mount via useMemo so it doesn't reshuffle on re-render. Plays
// once and then just sits invisible past its animation end; the screen
// it decorates is only ever shown once, so there's nothing to clean up.
const Confetti = () => {
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECE_COUNT }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 2.6 + Math.random() * 1.4,
        drift: (Math.random() - 0.5) * 160,
        rotation: Math.random() * 360,
        color: COLORS[i % COLORS.length],
        shape: SHAPES[i % SHAPES.length],
      })),
    []
  );

  return (
    <div className={css.root} aria-hidden="true">
      {pieces.map(p => (
        <span
          key={p.id}
          className={classNames(css.piece, p.shape)}
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            backgroundColor: p.color,
            '--drift': `${p.drift}px`,
            '--rotation': `${p.rotation}deg`,
          }}
        />
      ))}
    </div>
  );
};

export default Confetti;
