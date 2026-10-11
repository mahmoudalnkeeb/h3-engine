const FONT = 'monospace';

/** Draw text with a 1px drop shadow so it reads over any background. */
export const label = (r, str, x, y, { size = 8, color = '#fff', align = 'center' } = {}) => {
  const font = `bold ${size}px ${FONT}`;
  r.text(str, x + 1, y + 1, { font, color: 'rgba(0,0,0,0.5)', align });
  r.text(str, x, y, { font, color, align });
};
