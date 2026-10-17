
const LOG_PATTERN = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) ([^"]+)" (\d{3}) (\d+) (\d+)$/;

export function parseLogLine(line) {
  const match = LOG_PATTERN.exec(line);

  if (!match) {
    return null;
  }

  const [
    ,
    ip,
    timestamp,
    method,
    url,
    protocol,
    status,
    responseBytes,
    responseTime
  ] = match;

  return {
    ip,
    timestamp,
    method,
    url,
    protocol,
    status: Number(status),
    responseBytes: Number(responseBytes),
    responseTime: Number(responseTime)
  };
}
