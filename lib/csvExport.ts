/**
 * Convierte un array de objetos a CSV y dispara la descarga en el navegador.
 * Todo pasa del lado del cliente (no hay servidor de por medio) — arma el
 * archivo en memoria y usa un link temporal para descargarlo.
 */
export function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) return;
  const csvContent = '\uFEFF' + buildCsvBlock(rows).join('\r\n');
  triggerDownload(filename, csvContent);
}

export interface CsvSection {
  title: string;
  rows: Record<string, string | number>[];
}

/**
 * Igual que downloadCsv, pero para varias tablas en un solo archivo — cada
 * sección lleva un título como fila separadora y después sus propios
 * headers, así se puede exportar por ejemplo "Detalle por país" y "Detalle
 * por ad set" juntos sin mezclar columnas de una tabla con la otra.
 */
export function downloadMultiSectionCsv(filename: string, sections: CsvSection[]) {
  const nonEmptySections = sections.filter((s) => s.rows.length > 0);
  if (nonEmptySections.length === 0) return;

  const lines: string[] = [];
  nonEmptySections.forEach((section, i) => {
    if (i > 0) lines.push(''); // línea en blanco entre tablas
    lines.push(escape(section.title));
    lines.push(...buildCsvBlock(section.rows));
  });

  const csvContent = '\uFEFF' + lines.join('\r\n');
  triggerDownload(filename, csvContent);
}

function buildCsvBlock(rows: Record<string, string | number>[]): string[] {
  const headers = Object.keys(rows[0]);
  return [
    headers.map(escape).join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ];
}

function escape(val: string | number) {
  const str = String(val);
  // Si el valor tiene coma, comillas o salto de línea, hay que encerrarlo
  // entre comillas (regla estándar de CSV) para que Excel no lo interprete
  // como columnas separadas.
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function triggerDownload(filename: string, csvContent: string) {
  // El BOM (\uFEFF) al principio es para que Excel detecte UTF-8 y muestre
  // bien los acentos y la Ñ — sin esto, "México" se ve como "MÃ©xico".
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
