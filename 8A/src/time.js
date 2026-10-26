import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import config from './config.js';

dayjs.extend(utc);
dayjs.extend(timezone);

function nowInIst() {
  return dayjs().tz(config.timezone).format('YYYY-MM-DD HH:mm:ss');
}

function getReportPeriod(reportType) {
  const today = dayjs().tz(config.timezone).startOf('day');
  const start = reportType === 'daily_sales_summary'
    ? today
    : today.startOf('week').add(1, 'day');
  const end = reportType === 'daily_sales_summary'
    ? start.add(1, 'day')
    : start.add(7, 'day');

  return {
    start: start.format('YYYY-MM-DD HH:mm:ss'),
    end: end.format('YYYY-MM-DD HH:mm:ss'),
    label: `${start.format('YYYY-MM-DD')} to ${end.subtract(1, 'day').format('YYYY-MM-DD')}`
  };
}

export { nowInIst, getReportPeriod };
