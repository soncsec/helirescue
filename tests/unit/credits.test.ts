import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CC_BY_ART, CREDITS } from '../../src/config/credits';
import { CREDITS_SCREEN } from '../../src/config/tuning';

const all = CREDITS.flatMap((s) => [s.heading, ...s.lines]).join('\n');

describe('credits screen', () => {
  it('credits the CC-BY art in full: title, author, link, licence and the change', () => {
    for (const part of [
      CC_BY_ART.title,
      CC_BY_ART.author,
      CC_BY_ART.url,
      CC_BY_ART.licence,
      CC_BY_ART.licenceUrl,
      CC_BY_ART.change,
    ]) {
      expect(all).toContain(part);
    }
  });

  it('names every other source and the font', () => {
    for (const name of ['Ansimuz', 'Reactorcore', 'Claude', 'Press Start 2P', 'SIL Open Font']) {
      expect(all).toContain(name);
    }
  });

  it('fits every line on the 480 px screen', () => {
    for (const line of CREDITS.flatMap((s) => s.lines)) {
      expect(line.length).toBeLessThanOrEqual(CREDITS_SCREEN.maxChars);
    }
  });

  it('agrees with CREDITS.md on the CC-BY work', () => {
    const md = new TextDecoder().decode(readFileSync(`${process.cwd()}/CREDITS.md`));
    expect(md).toContain(CC_BY_ART.author);
    expect(md).toContain(CC_BY_ART.url);
    expect(md).toContain('CC-BY 3.0');
  });
});
