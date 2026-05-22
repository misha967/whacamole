window.WhacBets = {
  BASE_CHIPS_EUR: [1, 2, 5, 10, 25],
  EXCHANGE_RATES: { EUR:1, USD:1.08, CHF:0.96, NGN:1768, AOA:979, MZN:69.20 },
  ROUNDING: {
    EUR:{decimals:2,step:0.05}, USD:{decimals:2,step:0.05},
    CHF:{decimals:2,step:0.05}, NGN:{decimals:0,step:50},
    AOA:{decimals:0,step:5},    MZN:{decimals:0,step:1},
  },
  convert(eur, cur) {
    const rate=this.EXCHANGE_RATES[cur]??1, raw=eur*rate;
    const r=this.ROUNDING[cur]??{step:1};
    return Math.round(raw/r.step)*r.step;
  },
  chipsWithLabel(cur, symbol) {
    return this.BASE_CHIPS_EUR.map(eur=>{
      const converted=this.convert(eur,cur);
      const r=this.ROUNDING[cur]??{decimals:2};
      const label=converted.toLocaleString('fr-FR',{minimumFractionDigits:r.decimals,maximumFractionDigits:r.decimals})+'\u00a0'+symbol;
      return {eur,converted,label};
    });
  },
};
