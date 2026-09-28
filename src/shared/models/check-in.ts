import { desc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { dailyCheckInConfig } from '@/config/check-in';
import { credit, dailyCheckIn } from '@/config/db/schema';
import {
  buildCheckInStatus,
  DailyCheckInStatus,
  zonedDateKey,
} from '@/shared/lib/check-in';
import { getSnowId, getUuid } from '@/shared/lib/hash';

import {
  CreditStatus,
  CreditTransactionScene,
  CreditTransactionType,
} from './credit';

function todayKey(now = new Date()) {
  return zonedDateKey(now, dailyCheckInConfig.timeZone);
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Error && /UNIQUE/i.test(error.message);
}

export async function getDailyCheckInStatus(
  userId: string,
  now = new Date()
): Promise<DailyCheckInStatus> {
  const rows = await db()
    .select({ checkInDate: dailyCheckIn.checkInDate })
    .from(dailyCheckIn)
    .where(eq(dailyCheckIn.userId, userId))
    .orderBy(desc(dailyCheckIn.checkInDate))
    .limit(400);

  return buildCheckInStatus({
    credits: dailyCheckInConfig.credits,
    today: todayKey(now),
    checkedDates: rows.map((row: { checkInDate: string }) => row.checkInDate),
  });
}

export async function claimDailyCheckIn(
  user: { id: string; email: string },
  now = new Date()
) {
  const today = todayKey(now);
  const credits = dailyCheckInConfig.credits;
  if (credits <= 0) {
    throw new Error('CHECK_IN_DISABLED');
  }

  try {
    await db().transaction(async (tx: any) => {
      await tx.insert(dailyCheckIn).values({
        id: getUuid(),
        userId: user.id,
        checkInDate: today,
        credits,
      });
      await tx.insert(credit).values({
        id: getUuid(),
        userId: user.id,
        userEmail: user.email,
        orderNo: '',
        subscriptionNo: '',
        transactionNo: getSnowId(),
        transactionType: CreditTransactionType.GRANT,
        transactionScene: CreditTransactionScene.REWARD,
        credits,
        remainingCredits: credits,
        description: 'Daily check-in',
        expiresAt: null,
        status: CreditStatus.ACTIVE,
        metadata: JSON.stringify({ source: 'daily-check-in', date: today }),
      });
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
  }

  return getDailyCheckInStatus(user.id, now);
}
