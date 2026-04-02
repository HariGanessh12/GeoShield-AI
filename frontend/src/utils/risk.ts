export type PremiumResponse = {
  weekly_premium_inr: number;
  expected_loss_inr: number;
  risk_margin_inr: number;
  platform_fee_inr: number;
};

type RawPremiumResponse = Partial<PremiumResponse> & {
  expected_loss?: number;
  risk_margin?: number;
  breakdown?: Record<string, string>;
};

export function normalizePremiumResponse(payload: RawPremiumResponse): PremiumResponse {
  return {
    weekly_premium_inr: Number(payload.weekly_premium_inr ?? 0),
    expected_loss_inr: Number(payload.expected_loss_inr ?? payload.expected_loss ?? 0),
    risk_margin_inr: Number(payload.risk_margin_inr ?? payload.risk_margin ?? 0),
    platform_fee_inr: Number(payload.platform_fee_inr ?? 15),
  };
}
