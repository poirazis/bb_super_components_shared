// Sizing temaplates for the Adobe Spectrum Table look
export const sizingMap = {
  S: {
    cellPadding: "0.4rem",
    rowFontSize: 12,
    rowHeight: 36,
    headerFontSize: 11,
    headerHeight: "2rem",
    checkboxSize: 12,
  },
  M: {
    cellPadding: "0.5rem",
    rowFontSize: 14,
    rowHeight: 40,
    headerFontSize: 11,
    headerHeight: "2.4rem",
    checkboxSize: 14,
  },
  L: {
    cellPadding: "0.85rem",
    rowFontSize: 15,
    rowHeight: 48,
    headerFontSize: 12,
    headerHeight: "2.6rem",
    checkboxSize: 14,
  },
};

export const defaultOperatorMap = {
  string: "fuzzy",
  formula: "fuzzy",
  array: "contains",
  options: "equal",
  datetime: "rangeLow",
  boolean: "equal",
  number: "equal",
  bigint: "equal",
};

export const supportFilteringMap = {
  string: true,
  array: true,
  options: true,
  datetime: true,
  boolean: true,
  number: true,
  bigint: true,
};

export const supportSortingMap = {
  string: true,
  formula: true,
  array: true,
  options: true,
  datetime: true,
  boolean: true,
  number: true,
  bigint: true,
};

export const supportEditingMap = {
  string: true,
  array: true,
  link: true,
  bb_reference: true,
  options: true,
  datetime: true,
  boolean: true,
  number: true,
  bigint: true,
  attachment: true,
};
