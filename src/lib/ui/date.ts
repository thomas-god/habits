import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(customParseFormat);
dayjs.extend(isoWeek);

export const parseDay = (day: string): dayjs.Dayjs => {
	return dayjs(day, 'YYYY-MM-DD');
};

export const getToday = (): dayjs.Dayjs => dayjs();
