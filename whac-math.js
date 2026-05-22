/**
 * SYMETRY WHAC-A-MOLE — Math Engine
 * Global RTP: 96%
 *
 * Grid: 4x4 = 16 holes
 * Each tap = one bet
 *
 * Mole types (5 faces + traps):
 *   common  : prob 0.40, payout x1.20  → EV = 0.480
 *   uncommon: prob 0.25, payout x1.60  → EV = 0.400
 *   rare    : prob 0.15, payout x2.20  → EV = 0.330
 *   epic    : prob 0.08, payout x3.50  → EV = 0.280
 *   legend  : prob 0.03, payout x8.00  → EV = 0.240
 *   trap    : prob 0.09, payout x0.00  → EV = 0.000
 *
 * Total EV = 0.480+0.400+0.330+0.280+0.240+0 = 1.730 ← recalibrate
 *
 * Calibration to 0.96:
 * We normalize payouts so sum(prob * payout) = 0.96
 * Factor = 0.96 / raw_ev_without_trap
 * raw_ev = 0.40*p1 + 0.25*p2 + 0.15*p3 + 0.08*p4 + 0.03*p5
 * We set payouts so raw_ev = 0.96
 */

const WHAC_RTP = 0.96;

// Mole definitions — rarity drives payout
// payouts calibrated: sum(prob_mole * payout) + trap*0 = 0.96
// prob_mole = prob / (1 - trap_prob) for EV calc on non-trap taps
// We calibrate on ALL taps including traps
// Target: 0.40*p1 + 0.25*p2 + 0.15*p3 + 0.08*p4 + 0.03*p5 = 0.96
// Solution: p1=1.20, p2=1.44, p3=2.00, p4=3.60, p5=8.00
// Check: 0.40*1.20 + 0.25*1.44 + 0.15*2.00 + 0.08*3.60 + 0.03*8.00
//       = 0.480 + 0.360 + 0.300 + 0.288 + 0.240 = 1.668 → need rescale
// Rescale factor = 0.96 / 1.668 = 0.5755 → apply to payouts while keeping ratios
// Final payouts (rounded to 2dp):
//   common:   1.20 * 0.5755 ≈ 0.69  → too low, use stake multiplier
// Better approach: fix ratios, solve for common payout c:
// 0.40c + 0.25(1.2c) + 0.15(1.67c) + 0.08(3c) + 0.03(6.67c) = 0.96
// 0.40c + 0.30c + 0.25c + 0.24c + 0.20c = 1.39c = 0.96 → c = 0.691
// payouts: common=0.69, uncommon=0.83, rare=1.15, epic=2.07, legend=4.61
// But payout < 1 means player loses on common → not fun
// Use "net payout" approach: payout multiplier (total return including stake)
// common: x1.40 net, uncommon: x1.68, rare: x2.33, epic: x4.19, legend: x9.33
// Check: 0.40*1.40 + 0.25*1.68 + 0.15*2.33 + 0.08*4.19 + 0.03*9.33
//       = 0.560 + 0.420 + 0.350 + 0.335 + 0.280 = 1.945 → too high
// Include traps (prob 0.09, return 0):
// 0.40*1.40 + 0.25*1.68 + 0.15*2.33 + 0.08*4.19 + 0.03*9.33 + 0.09*0
// = 1.945 → need to rescale payouts by 0.96/1.945 = 0.4937
// Final GROSS multipliers (what player gets back per unit staked):
// common:   1.40 * 0.4937 = 0.691 → net -0.309 per stake... boring
// The issue: with 9% traps the non-trap EV must compensate
// Correct model: E = sum_moles(prob_i * payout_i) + 0.09 * 0 = 0.96
// Use GROSS (return of stake included):
// Let ratios be 1 : 1.2 : 1.65 : 3.0 : 7.0 for c,u,r,e,l
// 0.40x + 0.25(1.2x) + 0.15(1.65x) + 0.08(3x) + 0.03(7x) = 0.96
// x(0.40 + 0.30 + 0.2475 + 0.24 + 0.21) = 0.96
// x * 1.3975 = 0.96 → x = 0.687
// common=0.687, uncommon=0.824, rare=1.134, epic=2.061, legend=4.809
// Still < 1 for common and uncommon → player always loses on those
// SOLUTION: Reduce trap probability, increase mole prob
// Traps: 0.05 (5%), moles: 0.95
// Rebalance mole probs: common=0.42, uncommon=0.27, rare=0.16, epic=0.07, legend=0.03 (sum=0.95)
// 0.42x + 0.27(1.2x) + 0.16(1.65x) + 0.07(3x) + 0.03(7x) + 0.05*0 = 0.96
// x(0.42 + 0.324 + 0.264 + 0.21 + 0.21) = 0.96
// x * 1.428 = 0.96 → x = 0.6723
// Still sub-1... The math is clear: with any traps, common payout < 1
// DESIGN FIX: Treat it as slot — hitting ANY mole is a WIN (return > 0),
// trap = lose stake. Player wins 95% of time, small amount on common.
// Better UX: show NET gain (not gross). Common mole = +small, legend = +big, trap = -stake
// Final calibrated values (gross multipliers, NET = gross - 1):
const MOLE_TYPES = {
  common:   { prob: 0.42, mult: 1.30, label: 'common',   color: '#4a9eff', net: '+0.30×' },
  uncommon: { prob: 0.27, mult: 1.55, label: 'uncommon', color: '#00cc66', net: '+0.55×' },
  rare:     { prob: 0.16, mult: 2.10, label: 'rare',     color: '#ff9900', net: '+1.10×' },
  epic:     { prob: 0.07, mult: 3.80, label: 'epic',     color: '#cc00ff', net: '+2.80×' },
  legend:   { prob: 0.03, mult: 8.50, label: 'legend',   color: '#ffd700', net: '+7.50×' },
  trap:     { prob: 0.05, mult: 0,    label: 'trap',     color: '#ff3333', net: '-1.00×' },
};
// Verify RTP: 0.42*1.30 + 0.27*1.55 + 0.16*2.10 + 0.07*3.80 + 0.03*8.50 + 0.05*0
// = 0.546 + 0.4185 + 0.336 + 0.266 + 0.255 + 0 = 1.8215 → GROSS
// Hmm that's EV=1.82 not 0.96...
// I'm confusing gross vs net. Gross mult includes stake return.
// EV = sum(prob * gross_mult) should = RTP = 0.96
// 0.42*1.30 = 0.546... total = 1.82 ≠ 0.96
// CORRECT calibration:
// sum(prob_i * gross_i) = 0.96
// Keep ratios: 1.30 : 1.55 : 2.10 : 3.80 : 8.50 : 0 (trap)
// Scale factor k: k*(0.42*1.30 + 0.27*1.55 + 0.16*2.10 + 0.07*3.80 + 0.03*8.50) = 0.96
// k * 1.8215 = 0.96 → k = 0.5270
// Scaled gross: common=0.685, uncommon=0.817, rare=1.107, epic=2.003, legend=4.480
// These are GROSS multipliers. NET = gross - 1.
// common net = -0.315 (player gets back 68.5% of stake on common hit)
// This is the fundamental constraint: with traps eating 5%, the "safe" hits must compensate
// but common hits are essentially near-losses. This is how real casino math works.
// The trick: make it FUN with animations even on small wins.

// FINAL CALIBRATED (k=0.5270 applied to ratios):
const MOLE_CONFIG = [
  { type:'common',   prob:0.42, gross:0.685, color:'#4a9eff', emoji:'😀' },
  { type:'uncommon', prob:0.27, gross:0.817, color:'#00cc66', emoji:'😎' },
  { type:'rare',     prob:0.16, gross:1.107, color:'#ff9900', emoji:'🤩' },
  { type:'epic',     prob:0.07, gross:2.003, color:'#cc00ff', emoji:'🤑' },
  { type:'legend',   prob:0.03, gross:4.480, color:'#ffd700', emoji:'💰' },
  { type:'trap',     prob:0.05, gross:0,     color:'#ff3333', emoji:'💣' },
];
// RTP check: 0.42*0.685+0.27*0.817+0.16*1.107+0.07*2.003+0.03*4.480+0.05*0
// = 0.2877+0.2206+0.1771+0.1402+0.1344+0 = 0.960 ✓

// FRENZY CONFIG
const FRENZY_CONFIG = {
  minHits: 15,          // min hits before frenzy can trigger
  sessionRtpThreshold: 0.60, // trigger if session RTP < 60%
  duration: 12000,      // 12 seconds
  grossBoost: 1.4,      // multiply all gross payouts by 1.4 during frenzy
  trapDisabled: true,   // no traps during frenzy
  speedMult: 2.5,       // moles appear 2.5x faster
};

// Pick a random mole type based on probabilities
function pickMoleType(frenzy = false) {
  const cfg = frenzy
    ? MOLE_CONFIG.filter(m => m.type !== 'trap')
    : MOLE_CONFIG;

  const totalProb = cfg.reduce((s, m) => s + m.prob, 0);
  let r = Math.random() * totalProb;
  for (const m of cfg) {
    r -= m.prob;
    if (r <= 0) return { ...m, gross: frenzy ? m.gross * FRENZY_CONFIG.grossBoost : m.gross };
  }
  return cfg[cfg.length - 1];
}

// Evaluate a hit
function evaluateHit(mole, stake) {
  const payout = parseFloat((stake * mole.gross).toFixed(2));
  const net    = parseFloat((payout - stake).toFixed(2));
  return { payout, net, won: mole.gross > 0 };
}

// Session RTP tracker
function sessionRtp(totalWagered, totalReturned) {
  if (totalWagered <= 0) return 1;
  return totalReturned / totalWagered;
}

// Should frenzy trigger?
function shouldTriggerFrenzy(hits, totalWagered, totalReturned, frenzyUsed) {
  if (frenzyUsed) return false;
  if (hits < FRENZY_CONFIG.minHits) return false;
  return sessionRtp(totalWagered, totalReturned) < FRENZY_CONFIG.sessionRtpThreshold;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MOLE_CONFIG, FRENZY_CONFIG, pickMoleType, evaluateHit, sessionRtp, shouldTriggerFrenzy, WHAC_RTP };
} else {
  window.WhacMath = { MOLE_CONFIG, FRENZY_CONFIG, pickMoleType, evaluateHit, sessionRtp, shouldTriggerFrenzy, WHAC_RTP };
}
