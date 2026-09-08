/**
 * Convierte un array de objetos a CSV y dispara la descarga en el navegador.
 * Todo pasa del lado del cliente (no hay servidor de por medio) — arma el
 * archivo en memoria y usa un link temporal para descargarlo.
 */
export function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);

  const escape = (val: string | number) => {
    const str = String(val);
    // Si el valor tiene coma, comillas o salto de línea, hay que
    // encerrarlo entre comillas (regla estándar de CSV) para que Excel
    // no lo interprete como columnas separadas.
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ];

  // El BOM (\uFEFF) al principio es para que Excel detecte UTF-8 y muestre
  // bien los acentos y la Ñ — sin esto, "México" se ve como "MÃ©xico".
  const csvContent = '\uFEFF' + lines.join('\r\n');

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
