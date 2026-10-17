
import fs from 'node:fs';
import readline from 'node:readline';
import { parseLogLine } from './src/parser.js';

const inputFile = process.argv[2] ?? 'logs/sample.log';

// Histogram covers response times from 0 to 60,000 ms.
// One extra bucket captures values above 60,000 ms.
const MAX_RESPONSE_TIME = 60_000;
const responseTimeHistogram = new Uint32Array(MAX_RESPONSE_TIME + 1);

function parseTimestamp(timestamp) {
  // Example: 17/Oct/2026:10:00:00 +0000
  const match = timestamp.match(
    /^(\d{2})\/([A-Za-z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})$/
  );

  if (!match) return null;

  const [, day, month, year, hour, minute, second, offset] = match;

  const date = new Date(
    `${month} ${day}, ${year} ${hour}:${minute}:${second} GMT${offset}`
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

async function analyzeFile() {
  const fileStream = fs.createReadStream(inputFile);

  const lineReader = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let totalLines = 0;
  let validRequests = 0;
  let malformedLines = 0;
  let invalidTimestamps = 0;
  let totalResponseTime = 0;

  const statusCounts = new Map();
  const urlCounts = new Map();
  const ipCounts = new Map();
  const hourlyCounts = new Map();

  for await (const line of lineReader) {
    totalLines++;

    const request = parseLogLine(line);

    if (request === null) {
      malformedLines++;
      continue;
    }

    validRequests++;

    statusCounts.set(
      request.status,
      (statusCounts.get(request.status) ?? 0) + 1
    );

    urlCounts.set(
      request.url,
      (urlCounts.get(request.url) ?? 0) + 1
    );

    ipCounts.set(
      request.ip,
      (ipCounts.get(request.ip) ?? 0) + 1
    );

    // Calculate the average response time.
    totalResponseTime += request.responseTime;

    // Record response times in a fixed-size histogram.
    const bucket = Math.min(
      Math.max(0, Math.floor(request.responseTime)),
      MAX_RESPONSE_TIME
    );

    responseTimeHistogram[bucket]++;

    // Group requests by hour.
    const date = parseTimestamp(request.timestamp);

    if (date === null) {
      invalidTimestamps++;
      continue;
    }

    const hourKey = date.toISOString().slice(0, 13) + ':00';

    hourlyCounts.set(
      hourKey,
      (hourlyCounts.get(hourKey) ?? 0) + 1
    );
  }

  function getTop10(counts) {
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }

  // Find the response-time bucket containing the 95th percentile.
  function getP95() {
    if (validRequests === 0) return null;

    const target = Math.ceil(validRequests * 0.95);
    let cumulative = 0;

    for (let time = 0; time <= MAX_RESPONSE_TIME; time++) {
      cumulative += responseTimeHistogram[time];

      if (cumulative >= target) {
        if (time === MAX_RESPONSE_TIME) {
          return `>= ${MAX_RESPONSE_TIME} ms`;
        }

        return `approximately ${time} ms`;
      }
    }

    return null;
  }

  console.log('\n========== LOG ANALYSIS ==========');
  console.log(`File: ${inputFile}`);
  console.log(`Total lines: ${totalLines}`);
  console.log(`Valid requests: ${validRequests}`);
  console.log(`Malformed lines: ${malformedLines}`);
  console.log(`Invalid timestamps: ${invalidTimestamps}`);

  console.log('\nRequests by HTTP status:');
  console.table(
    [...statusCounts.entries()].map(([status, count]) => ({
      status,
      count
    }))
  );

  console.log('\nTop 10 URLs:');
  console.table(
    getTop10(urlCounts).map(([url, count]) => ({ url, count }))
  );

  console.log('\nTop 10 client IPs:');
  console.table(
    getTop10(ipCounts).map(([ip, count]) => ({ ip, count }))
  );

  console.log('\nRequests per hour:');
  console.table(
    [...hourlyCounts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([hour, count]) => ({ hour, count }))
  );

  console.log('\nResponse-time statistics:');
  console.log(
    `Average: ${
      validRequests
        ? (totalResponseTime / validRequests).toFixed(2) + ' ms'
        : 'N/A'
    }`
  );
  console.log(`P95: ${getP95() ?? 'N/A'}`);
}

analyzeFile().catch((error) => {
  console.error('Analysis failed:', error.message);
  process.exitCode = 1;
});
