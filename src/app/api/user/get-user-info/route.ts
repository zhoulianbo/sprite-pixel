import { PERMISSIONS } from '@/core/rbac';
import { respData, respErr } from '@/shared/lib/resp';
import { getRemainingCredits } from '@/shared/models/credit';
import { getCurrentSubscription } from '@/shared/models/subscription';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';

export async function POST(req: Request) {
  try {
    // get sign user info
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const [isAdmin, remainingCredits, currentSubscription] = await Promise.all([
      hasPermission(user.id, PERMISSIONS.ADMIN_ACCESS),
      getRemainingCredits(user.id),
      getCurrentSubscription(user.id),
    ]);

    return respData({
      ...user,
      isAdmin,
      credits: { remainingCredits },
      currentSubscriptionProductId: currentSubscription?.productId,
    });
  } catch (e) {
    console.log('get user info failed:', e);
    return respErr('get user info failed');
  }
}
