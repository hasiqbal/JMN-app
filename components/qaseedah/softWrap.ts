const ZERO_WIDTH_SPACE = '\u200B';

// Add soft wrap opportunities for long unbroken runs without changing visible text.
export function addSoftWrapOpportunities(input: string, chunkSize = 18): string {
  if (!input) return input;

  let next = input;

  // Allow wraps after common separators used in imported content.
  next = next.replace(/([/_|:;,.\-])/g, `$1${ZERO_WIDTH_SPACE}`);

  // Split long non-whitespace runs so narrow devices can wrap safely.
  const longRun = new RegExp(`([^\\s]{${chunkSize}})(?=[^\\s])`, 'g');
  next = next.replace(longRun, `$1${ZERO_WIDTH_SPACE}`);

  return next;
}
