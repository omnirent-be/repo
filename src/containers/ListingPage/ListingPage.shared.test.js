import { getReviewsSummary, getUpcomingAvailableDays } from './ListingPage.shared';

describe('getReviewsSummary', () => {
  it('returns null when there are no reviews (never a fabricated score)', () => {
    expect(getReviewsSummary([])).toBeNull();
    expect(getReviewsSummary(undefined)).toBeNull();
  });

  it('computes the real average and count from native reviews', () => {
    const reviews = [
      { attributes: { rating: 5 } },
      { attributes: { rating: 4 } },
      { attributes: { rating: 4 } },
    ];
    expect(getReviewsSummary(reviews)).toEqual({ average: 4.3, count: 3 });
  });

  it('ignores reviews without a numeric rating', () => {
    const reviews = [{ attributes: { rating: 5 } }, { attributes: {} }];
    expect(getReviewsSummary(reviews)).toEqual({ average: 5, count: 1 });
  });
});

describe('getUpcomingAvailableDays', () => {
  const timeZone = 'Etc/UTC';
  const todayUTC = () => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  };
  const addDaysUTC = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

  it('returns an empty array when there are no time slots', () => {
    expect(getUpcomingAvailableDays({}, timeZone, false, 5)).toEqual([]);
    expect(getUpcomingAvailableDays(null, timeZone, false, 5)).toEqual([]);
  });

  it('returns the next available calendar days from an open time slot', () => {
    const start = todayUTC();
    const end = addDaysUTC(start, 10);
    const monthlyTimeSlots = { '2026-10': { timeSlots: [{ attributes: { start, end } }] } };

    const days = getUpcomingAvailableDays(monthlyTimeSlots, timeZone, false, 3);

    expect(days).toHaveLength(3);
    expect(days[0].getTime()).toEqual(start.getTime());
  });

  it('skips calendar days that fall outside every time slot', () => {
    const start = todayUTC();
    const oneDayEnd = addDaysUTC(start, 1);
    const monthlyTimeSlots = { '2026-10': { timeSlots: [{ attributes: { start, end: oneDayEnd } }] } };

    const days = getUpcomingAvailableDays(monthlyTimeSlots, timeZone, false, 5);

    expect(days).toHaveLength(1);
  });
});
