interface RealestateAnalysisInput {
  salePrice: number;
  downpaymentPercentage: number;
  annualMortgageInterestRate: number;
  mortgageAmortization: number;
  monthlyHoaDues: number;
  expectedVacancyWeeks: number;
  monthlyRent: number;
}

class RealEstateDealAnalyser implements RealestateAnalysisInput {
  salePrice: number;

  downpaymentPercentage: number;

  annualMortgageInterestRate: number;

  mortgageAmortization: number;

  monthlyHoaDues: number;

  expectedVacancyWeeks: number;

  monthlyRent: number;

  purchasePrice: number;

  constructor(input: RealestateAnalysisInput) {
    Object.assign(this, {
      ...input,
      annualMortgageInterestRate: input.annualMortgageInterestRate / 100,
    });
    this.purchasePrice = this.salePrice;
  }

  private getLoanAmount() {
    return this.purchasePrice * (1 - this.downpaymentPercentage / 100);
  }

  private getMonthlyMortgagePayment() {
    const n = this.mortgageAmortization * 12;
    const monthlyMortgageInterestRate = this.annualMortgageInterestRate / 12;

    return (
      (this.getLoanAmount() * monthlyMortgageInterestRate) /
      (1 - (1 + monthlyMortgageInterestRate) ** -n)
    );
  }

  private getDownPayment() {
    return this.purchasePrice * (this.downpaymentPercentage / 100);
  }

  getAnnualExpenses() {
    // Calculate annual expenses
    const annualExpenses = {
      annualMortgagePayment: this.getMonthlyMortgagePayment() * 12,
      annualHoaDues: this.monthlyHoaDues * 12,
      annualCapEx: this.purchasePrice * 0.01, // Assuming 1% of purchase price annually
      annualPropertyTax: this.purchasePrice * 0.015, // Assuming 1.5% of purchase price annually
      annualPropertyInsurance: 1750, // Uses generalized avg
      annualVacancyCosts: (this.monthlyRent / 4) * this.expectedVacancyWeeks,
    };

    const totalAnnualExpenses = Object.values(annualExpenses).reduce(
      (acc, v) => acc + v,
      0
    );

    return {
      value: totalAnnualExpenses,
      markdown: RealEstateDealAnalyser.objToMarkdown(
        {
          ...annualExpenses,
          totalAnnualExpenses,
        },
        'Annual expenses'
      ),
    };
  }

  getAnnualCashflow() {
    const annualRent = this.monthlyRent * 12;
    const annualExpenses = this.getAnnualExpenses().value;

    const totalAnnualCashflow = annualRent - annualExpenses;

    return {
      value: totalAnnualCashflow,
      markdown: RealEstateDealAnalyser.objToMarkdown(
        {
          annualRent,
          annualExpenses,
          totalAnnualCashflow,
        },
        'Annual cashflow'
      ),
    };
  }

  getAnnualReturn() {
    const annualCashflow = this.getAnnualCashflow().value;

    // Calculate annual principal paydown
    let annualPrincipalReduction = 0;
    for (
      let i = 0,
        remainingLoanBalance = this.getLoanAmount(),
        monthlyMortgageInterestRate = this.annualMortgageInterestRate / 12;
      i < 12;
      i += 1
    ) {
      const interestPayment =
        remainingLoanBalance * monthlyMortgageInterestRate;
      const principalPayment =
        this.getMonthlyMortgagePayment() - interestPayment;
      annualPrincipalReduction += principalPayment;
      remainingLoanBalance -= principalPayment;
    }

    const annualAppreciation = this.purchasePrice * 0.048; // Assuming 4.8% appreciation annually

    const totalAnnualReturn =
      annualCashflow + annualPrincipalReduction + annualAppreciation;

    return {
      value: totalAnnualReturn,
      markdown: RealEstateDealAnalyser.objToMarkdown(
        {
          annualCashflow,
          annualPrincipalReduction,
          annualAppreciation,
          totalAnnualReturn,
        },
        'Annual return'
      ),
    };
  }

  getAnnualROI() {
    const annualReturn = this.getAnnualReturn().value;
    const downPayment = this.getDownPayment();
    const closingCosts = this.purchasePrice * 0.02; // 2% of purchase price;

    const totalAnnualROI = (annualReturn / (downPayment + closingCosts)) * 100;

    return {
      value: totalAnnualROI,
      markdown: RealEstateDealAnalyser.objToMarkdown(
        {
          annualReturn,
          downPayment,
          closingCosts,
          totalAnnualROI,
        },
        'Annual ROI'
      ),
    };
  }

  adjustToNeededPurchasePrice(minimumROI = 13, minimumCashflow = 0) {
    while (
      this.getAnnualROI().value < minimumROI ||
      this.getAnnualCashflow().value < minimumCashflow
    ) {
      this.purchasePrice -= 1000;
      if (this.purchasePrice <= 0) {
        throw new Error(
          'Purchase price adjustment resulted in unrealistic value.'
        );
      }
    }

    return this;
  }

  getFullResultsMarkdown() {
    return `# Good buy @ ${this.purchasePrice} $`.concat(
      this.purchasePrice === this.salePrice
        ? ''
        : ` (-${this.salePrice - this.purchasePrice} from sales price)`,
      '\n\n',
      this.getAnnualExpenses().markdown,
      this.getAnnualCashflow().markdown,
      this.getAnnualReturn().markdown,
      this.getAnnualROI().markdown
    );
  }

  static objToMarkdown<T extends Record<string, number>>(
    obj: T,
    markdownTitle: string
  ) {
    const camelCaseToRegular = (camelCaseString: string) =>
      camelCaseString
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Insert space between camel case words
        .replace(/^./, (match) => match.toUpperCase()); // Capitalize the first letter

    const markdown = Object.entries(obj).reduce((acc, [k, v], i, arr) => {
      const str = acc.concat(
        `- ${camelCaseToRegular(k)}: ${v} ${
          k.toLowerCase().endsWith('roi') ? '%' : '$'
        }\n`
      );

      if (i === arr.length - 1) {
        str.concat('-'.repeat(50), '\n\n');
      }

      return str;
    }, `## ${markdownTitle}:\n\n`);

    return markdown;
  }
}

console.log(
  new RealEstateDealAnalyser(
    {
      salePrice: 375000,
      downpaymentPercentage: 20,
      annualMortgageInterestRate: 5.15,
      mortgageAmortization: 25,
      monthlyHoaDues: 0,
      expectedVacancyWeeks: 3,
      monthlyRent: 2950
    }
  )
  .adjustToNeededPurchasePrice()
  .getFullResultsMarkdown()
)