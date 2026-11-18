import { Bricolage_Grotesque, Geist_Mono, Instrument_Sans } from 'next/font/google';

/**
 * Quiet Ledger type for the phone layout. Each loader only sets a CSS
 * variable; the font-ql-* utilities in globals.css read them, so nothing
 * outside mobile-scoped markup changes typeface.
 */
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
});

const sans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
});

const mono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

/** Class names that define the three font variables; put on the dashboard shell. */
export const qlFontVariables = `${display.variable} ${sans.variable} ${mono.variable}`;
