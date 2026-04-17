export type PremiumResponse = {
  base_premium: number;
  risk_adjustment: number;
  platform_fee: number;
  final_premium: number;
  risk_level?: string;
  risk_score?: number;
  breakdown?: Record<string, string>;
};

type RawPremiumResponse = Partial<PremiumResponse> & {
  weekly_premium_inr?: number;
  expected_loss?: number;
  expected_loss_inr?: number;
  risk_margin?: number;
  risk_margin_inr?: number;
  platform_fee_inr?: number;
  final_premium?: number;
};

export function normalizePremiumResponse(payload: RawPremiumResponse): PremiumResponse {
  return {
    base_premium: Number(payload.base_premium ?? payload.expected_loss_inr ?? payload.expected_loss ?? 0),
    risk_adjustment: Number(payload.risk_adjustment ?? payload.risk_margin_inr ?? payload.risk_margin ?? 0),
    platform_fee: Number(payload.platform_fee ?? payload.platform_fee_inr ?? 15),
    final_premium: Number(payload.final_premium ?? payload.weekly_premium_inr ?? 0),
    risk_level: payload.risk_level,
    risk_score: payload.risk_score,
    breakdown: payload.breakdown,
  };
}
