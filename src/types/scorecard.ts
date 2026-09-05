export interface CalibrationBucket {
  bucketLabel: string;
  minConf: number;
  maxConf: number;
  count: number;
  averageConfidence: number;
  empiricalWinRate: number;
}

export interface CalibrationScorecard {
  totalCalls: number;
  wonCalls: number;
  lostCalls: number;
  voidedCalls: number;
  pendingCalls: number;
  winRate: number; // Decimal: 0.00 to 1.00
  brierScore: number | null; // 0.00 = perfect, 0.25 = random coin toss
  calibrationBuckets: CalibrationBucket[];
  totalPnl: number;
  roiPercent: number;
}
