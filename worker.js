self.importScripts('https://cdn.jsdelivr.net/npm/papaparse@5.3.2/papaparse.min.js');

self.onmessage = (e) => {
  const { file, headers } = e.data;
  const filteredRows = [];

  Papa.parse(file, {
    header: true,
    delimiter: "",
    skipEmptyLines: true,
    dynamicTyping: true,
    chunkSize: 1024 * 1024, // 1MB chunks
    chunk: (results) => {
      results.data.forEach(row => {
        const filteredRow = {};
        headers.forEach(h => filteredRow[h] = row[h]);
        filteredRows.push(filteredRow);
      });
    },
    complete: () => {
      const csv = Papa.unparse(filteredRows);
      self.postMessage(csv);
    }
  });
};

