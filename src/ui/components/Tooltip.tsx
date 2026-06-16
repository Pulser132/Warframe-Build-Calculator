import { useState, type ReactNode } from 'react';
import styles from './Tooltip.module.css';

interface Props {
  content: ReactNode;
  children: ReactNode;
}

/** A lightweight hover/focus tooltip (CSS-positioned, no portal needed here). */
export function Tooltip({ content, children }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className={styles.wrap}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span role="tooltip" className={styles.bubble}>
          {content}
        </span>
      )}
    </span>
  );
}
