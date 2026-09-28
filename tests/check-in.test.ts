import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addCalendarDays,
  buildCheckInStatus,
  mondayOfWeek,
  weekDateKeys,
} from '../src/shared/lib/check-in';

test('the check-in week starts on Monday in the calendar date', () => {
  assert.equal(mondayOfWeek('2026-09-28'), '2026-09-28');
  assert.equal(mondayOfWeek('2026-09-27'), '2026-09-21');
  assert.deepEqual(weekDateKeys('2026-09-24'), [
    '2026-09-21',
    '2026-09-22',
    '2026-09-23',
    '2026-09-24',
    '2026-09-25',
    '2026-09-26',
    '2026-09-27',
  ]);
});

test('streak counts through yesterday when today is still open', () => {
  const status = buildCheckInStatus({
    credits: 1,
    today: '2026-09-24',
    checkedDates: ['2026-09-22', '2026-09-23'],
  });
  assert.equal(status.checkedInToday, false);
  assert.equal(status.streak, 2);
  assert.equal(status.weekCount, 2);
  assert.equal(status.credits, 1);
});

test('a missed day breaks the streak and claiming today starts a new one', () => {
  const missed = buildCheckInStatus({
    credits: 1,
    today: '2026-09-28',
    checkedDates: ['2026-09-26'],
  });
  assert.equal(missed.streak, 0);

  const claimed = buildCheckInStatus({
    credits: 1,
    today: '2026-09-28',
    checkedDates: ['2026-09-26', '2026-09-28'],
  });
  assert.equal(claimed.checkedInToday, true);
  assert.equal(claimed.streak, 1);
  assert.equal(addCalendarDays('2026-09-28', -1), '2026-09-27');
});
