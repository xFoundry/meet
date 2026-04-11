import { useCheckTeamBilling } from "@calcom/web/lib/hooks/settings/platform/billing/useCheckTeamBilling";
import { IS_SELF_HOSTED } from "@calcom/lib/constants";

import { usePlatformMe } from "./usePlatformMe";

export const useGetUserAttributes = () => {
  const {
    data: platformUser,
    isLoading: isPlatformUserLoading,
    refetch: refetchPlatformUser,
  } = usePlatformMe();
  const {
    data: userBillingData,
    isFetching: isUserBillingDataLoading,
    refetch: refetchTeamBilling,
  } = useCheckTeamBilling(platformUser?.organizationId, platformUser?.organization?.isPlatform ?? false);
  const isPlatformUser = platformUser?.organization?.isPlatform ?? false;
  const isPaidUser = IS_SELF_HOSTED || !!userBillingData?.valid;
  const userOrgId = platformUser?.organizationId;

  return {
    isUserLoading: isPlatformUserLoading,
    isUserBillingDataLoading,
    isPlatformUser,
    isPaidUser,
    userBillingData,
    userOrgId,
    refetchTeamBilling,
    refetchPlatformUser,
  };
};
