// Sizing temaplates for the Adobe Spectrum Table look
export const sizingMap = {
  XS: {
    cellPadding: "0.4rem",
    rowFontSize: 11,
    rowHeight: 28,
    headerFontSize: 10,
    headerHeight: 32,
    checkboxSize: 12,
  },
  S: {
    cellPadding: "0.4rem",
    rowFontSize: 12,
    rowHeight: 32,
    headerFontSize: 10,
    headerHeight: 32,
    checkboxSize: 12,
  },
  M: {
    cellPadding: "0.5rem",
    rowFontSize: 13,
    rowHeight: 36,
    headerFontSize: 11,
    headerHeight: 36,
    checkboxSize: 14,
  },
  L: {
    cellPadding: "0.85rem",
    rowFontSize: 15,
    rowHeight: 40,
    headerFontSize: 12,
    headerHeight: 40,
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
  link: false,
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
  bb_reference_single: true,
  options: true,
  datetime: true,
  boolean: true,
  number: true,
  bigint: true,
  attachment: true,
  attachment_single: true,
};
