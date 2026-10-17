
import fs from 'node:fs';
import readline from 'node:readline';
import { parseLogLine } from './src/parser.js';

const inputFile = process.argv[2] ?? 'logs/sample.log';

async function analyzeFile() {
  const fileStream = fs.createReadStream(inputFile);

  const lineReader = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let totalLines = 0;
  let validRequests = 0;
  let malformedLines = 0;

  const statusCounts = new Map();
  const urlCounts = new Map();
  const ipCounts = new Map();

  for await (const line of lineReader) {
    totalLines++;

    const request = parseLogLine(line);

    if (request === null) {
      malformedLines++;
      continue;
    }

    validRequests++;

    // Count requests by HTTP status code.
    statusCounts.set(
      request.status,
      (statusCounts.get(request.status) ?? 0) + 1
    );

    // Count requests by URL.
    urlCounts.set(
      request.url,
      (urlCounts.get(request.url) ?? 0) + 1
    );

    // Count requests by client IP.
    ipCounts.set(
      request.ip,
      (ipCounts.get(request.ip) ?? 0) + 1
    );
  }

  function getTop10(counts) {
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }

  console.log('\n========== LOG ANALYSIS ==========');
  console.log(`File: ${inputFile}`);
  console.log(`Total lines: ${totalLines}`);
  console.log(`Valid requests: ${validRequests}`);
  console.log(`Malformed lines: ${malformedLines}`);

  console.log('\nRequests by HTTP status:');
  console.table(
    [...statusCounts.entries()].map(([status, count]) => ({
      status,
      count
    }))
  );

  console.log('\nTop 10 URLs:');
  console.table(
    getTop10(urlCounts).map(([url, count]) => ({
      url,
      count
    }))
  );

  console.log('\nTop 10 client IPs:');
  console.table(
    getTop10(ipCounts).map(([ip, count]) => ({
      ip,
      count
    }))
  );
}

analyzeFile().catch((error) => {
  console.error('Analysis failed:', error.message);
  process.exitCode = 1;
});
