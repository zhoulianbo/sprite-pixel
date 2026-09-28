import { hasPlanEntitlement } from '@/config/plans';
import {
  claimDailyCheckIn,
  getDailyCheckInStatus,
} from '@/shared/models/check-in';
import { getCurrentSubscription } from '@/shared/models/subscription';
import { getUserInfo } from '@/shared/models/user';

export async function GET() {
  const user = await getUserInfo();
  if (!user) {
    return Response.json(
      { code: -1, message: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const status = await getDailyCheckInStatus(user.id);
  return Response.json({ code: 0, data: status });
}

export async function POST() {
  const user = await getUserInfo();
  if (!user) {
    return Response.json(
      { code: -1, message: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const subscription = await getCurrentSubscription(user.id);
  if (!hasPlanEntitlement(subscription?.productId, 'dailyFreeCredits')) {
    return Response.json(
      { code: -1, message: 'SUBSCRIPTION_REQUIRED' },
      { status: 403 }
    );
  }

  const status = await claimDailyCheckIn({
    id: user.id,
    email: user.email,
  });
  return Response.json({ code: 0, data: status });
}
