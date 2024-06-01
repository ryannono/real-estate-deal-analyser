interface RealEstateAnalysisResult {
  loanAmount: number;
  monthlyMortgagePayment: number;
  annualPropertyTax: number;
  annualPropertyInsurance: number;
  annualHoaDues: number;
  annualCapEx: number;
  annualRent: number;
  annualExpenses: number;
  annualCashflow: number;
  appreciation: number;
  totalReturn: number; // Including principal reduction and appreciation
  ROI: number;
  purchasePrice?: number; // Adjusted sale price to meet criteria
}

function realEstateAnalyzer(
  salePrice: number,
  downpaymentPercentage: number,
  mortgageInterestRate: number,
  mortgageAmortization: number,
  monthlyHoaDues: number,
  expectedVacancyWeeks: number,
  monthlyRent: number, // Added monthly rent as input
  monthlyPropertyTax: number = salePrice * 0.015 / 12, // Default to 1.5% of sale price annually divided by 12
  monthlyPropertyInsurance: number = 1750 / 12 // Default to 1750 annually divided by 12
): RealEstateAnalysisResult {
  const minimumROI = 13;
  const minimumCashflow = 0;
  let result: RealEstateAnalysisResult;
  let purchasePrice = salePrice;

  do {
      result = calculateAnalysis(
          purchasePrice,
          downpaymentPercentage,
          mortgageInterestRate,
          mortgageAmortization,
          monthlyHoaDues,
          expectedVacancyWeeks,
          monthlyRent,
          monthlyPropertyTax,
          monthlyPropertyInsurance
      );

      if (result.ROI < minimumROI || result.annualCashflow < minimumCashflow) {
          purchasePrice -= 1000; // Adjust sale price downwards by $1000
      }
  } while (result.ROI < minimumROI || result.annualCashflow < minimumCashflow);

  result.purchasePrice = purchasePrice; // Add adjusted sale price to the result

  return result;
}

function calculateAnalysis(
  salePrice: number,
  downpaymentPercentage: number,
  mortgageInterestRate: number,
  mortgageAmortization: number,
  monthlyHoaDues: number,
  expectedVacancyWeeks: number,
  monthlyRent: number,
  monthlyPropertyTax: number,
  monthlyPropertyInsurance: number
): RealEstateAnalysisResult {
  // Calculate loan amount
  const loanAmount = salePrice * (1 - downpaymentPercentage);

  // Calculate monthly mortgage payment
  const monthlyInterestRate = mortgageInterestRate / 12 / 100;
  const n = mortgageAmortization * 12;
  const monthlyMortgagePayment =
      (loanAmount * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -n));

  // Calculate principal reduction portion of the monthly mortgage payment
  const principalReduction = monthlyMortgagePayment - (loanAmount * monthlyInterestRate);

  // Calculate annual HOA dues
  const annualHoaDues = monthlyHoaDues * 12;

  // Calculate annual CapEx
  const annualCapEx = salePrice * 0.01; // Assuming 1% of sale price annually

  // Calculate annual expenses
  const annualPropertyTax = monthlyPropertyTax * 12;
  const annualPropertyInsurance = monthlyPropertyInsurance * 12;
  const annualExpenses = monthlyMortgagePayment * 12 + annualPropertyTax + annualPropertyInsurance + annualHoaDues + annualCapEx;

  // Calculate annual cashflow (rental income - expenses)
  const annualRent = monthlyRent * 12;
  const annualCashflow = annualRent - annualExpenses;

  // Calculate total return (including principal reduction and appreciation)
  const appreciation = salePrice * 0.03; // Assuming 3% appreciation annually
  const totalReturn = annualCashflow + principalReduction + appreciation;

  // Calculate final ROI
  const totalInvestment = salePrice * downpaymentPercentage;
  const ROI = (totalReturn / totalInvestment) * 100;

  return {
      loanAmount,
      monthlyMortgagePayment,
      annualPropertyTax,
      annualPropertyInsurance,
      annualHoaDues,
      annualCapEx,
      annualRent,
      annualExpenses,
      annualCashflow,
      appreciation,
      totalReturn,
      ROI,
  };
}


// Example usage:
const result: RealEstateAnalysisResult = realEstateAnalyzer(
  375000, // salePrice
  0.2, // downpaymentPercentage
  6.5, // mortgageInterestRate
  25, // mortgageAmortization
  0, // monthlyHoaDues
  3, // expectedVacancyWeeks
  2950 // monthlyRent
);

console.log("Results:");
for (const [key, value] of Object.entries(result)) {
  console.log(`${key}: ${value}`);
}
console.log(`Sale Price Adjustment: ${result.purchasePrice - 375000}`);

