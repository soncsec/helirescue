/**
 * In-game credits (owner, 2026-10-19): a CREDITS screen reachable from the
 * title at any time, and scrolling credits at the end of the game (M5.4).
 * CC-BY art is credited in full here: author, title, link to the original,
 * licence and what was changed. Every file is listed in CREDITS.md.
 */

/** The CC-BY 3.0 work, with every part of the attribution the licence asks for. */
export const CC_BY_ART = {
  use: 'Anti-aircraft gun',
  title: 'Open Gunner Expansion Pack 1',
  author: 'master484',
  url: 'opengameart.org/content/open-gunner-expansion-pack-1',
  licence: 'CC-BY 3.0',
  licenceUrl: 'creativecommons.org/licenses/by/3.0/',
  change: 'cropped from the original',
} as const;

/** A short form, for the art viewer. */
export const CC_BY_CREDIT = `${CC_BY_ART.use}: ${CC_BY_ART.author}, ${CC_BY_ART.licence}`;

export interface CreditSection {
  heading: string;
  lines: readonly string[];
}

/** The credits screen, section by section (each line fits the 480 px screen). */
export const CREDITS: readonly CreditSection[] = [
  {
    heading: 'ART',
    lines: [
      'Helicopter, buildings, base, weapons: drawn by Claude',
      'City, people, soldier, tank, gunship, explosion:',
      '  Ansimuz Legacy Collection (CC0)',
      'VTOL jet: Reactorcore (CC0)',
      `${CC_BY_ART.use}: "${CC_BY_ART.title}"`,
      `  by ${CC_BY_ART.author}, ${CC_BY_ART.licence}, ${CC_BY_ART.change}`,
      `  ${CC_BY_ART.url}`,
      `  Licence: ${CC_BY_ART.licenceUrl}`,
    ],
  },
  {
    heading: 'FONT',
    lines: ['Press Start 2P by CodeMan38, SIL Open Font Licence 1.1'],
  },
  {
    heading: 'GAME',
    lines: ['HeliRescue, made for Soncrant Arcade'],
  },
];
