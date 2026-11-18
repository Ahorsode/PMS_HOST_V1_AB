/**
 * Marks a filled mint button so the sticky bar knows one is on screen.
 * Kept out of the client StickyBar module so server components can spread it.
 */
export const QL_PRIMARY_ATTR = { 'data-ql-primary': '' } as const;
