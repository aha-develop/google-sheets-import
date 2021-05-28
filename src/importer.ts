import { Sheets } from "./sheets";

interface RowImport extends Aha.ImportRecord {
  description: string;
}

const importer = aha.getImporter<RowImport>(
  "aha-develop.google-sheets-importer.google-sheets"
);

const MAX_ROWS = 50;

importer.on({ action: "listFilters" }, (): Aha.ListFilters => {
  return {
    sheetUrl: {
      required: true,
      title: "Sheet URL",
      type: "text",
    },
    startFromRow: {
      required: false,
      title: "Start from row",
      type: "text",
    },
    nameColumn: {
      required: true,
      title: "Name column",
      type: "text",
    },
    descriptionColumn: {
      required: false,
      title: "Description column",
      type: "text",
    },
  };
});

importer.on({ action: "filterValues" }, async ({ filterName, filters }) => {
  return [];
});

function first<T>(ary: T[]): T {
  return ary[0];
}

function last<T>(ary: T[]): T {
  return ary.slice(-1)[0];
}

importer.on({ action: "listCandidates" }, async ({ filters, nextPage }) => {
  const sheets = new Sheets();
  const sheet = sheets.sheet(filters.sheetUrl);

  const row: number =
    nextPage && Number(nextPage) > 0
      ? Number(nextPage)
      : Number(filters.startFromRow || 1);

  const cols = [filters.nameColumn, filters.descriptionColumn]
    .filter((s) => typeof s === "string" && s.length > 0)
    .sort();
  const range = [
    [first(cols), row],
    [last(cols), row + MAX_ROWS - 1],
  ]
    .map((cols) => cols.join(""))
    .join(":");

  const values = await sheet.range(range);
  console.log(values);
  if (!values.values) return { nextPage: null, records: [] }; // No more data.

  const nameIdx = cols.indexOf(filters.nameColumn);
  const descIdx = cols.indexOf(filters.descriptionColumn);

  const records =
    values.values?.map((rowValue, idx) => {
      return {
        name: rowValue[nameIdx],
        description: rowValue[descIdx],
        uniqueId: String(filters.sheetUrl + (row + idx)),
        identifier: String(row + idx),
      };
    }) || [];

  return {
    nextPage: records.length > 0 ? row + MAX_ROWS : null,
    records,
  };
});

importer.on({ action: "importRecord" }, async ({ importRecord, ahaRecord }) => {
  const feature = ahaRecord as unknown as Aha.Feature;
  feature.description = importRecord.description;
  await feature.save();
});
