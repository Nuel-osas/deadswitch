/**
 * The Deadswitch mark: a source chain emits one proof line that strikes the
 * position and severs it. Arrival and severance are the same event.
 *
 * Geometry is snapped to a 1.5-unit lattice on a 24-unit grid, so at 16, 32,
 * 48, 64, 128, 256 and 512 px every edge falls on a whole device pixel and the
 * mark rasterises without half-tone blur.
 */
export default function Mark({ size = 26, className, title = 'Deadswitch' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      focusable="false"
    >
      <title>{title}</title>
      <g fill="currentColor">
        <rect x="3" y="9" width="4.5" height="6" />
        <rect x="7.5" y="10.5" width="9" height="3" />
        <rect x="16.5" y="3" width="4.5" height="7.5" />
        <rect x="16.5" y="13.5" width="4.5" height="7.5" />
      </g>
    </svg>
  );
}
