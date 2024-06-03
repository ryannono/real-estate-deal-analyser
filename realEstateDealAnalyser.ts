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

  private purchasePrice: number;

  constructor(input: RealestateAnalysisInput) {
    Object.assign(this, {
      ...input,
      annualMortgageInterestRate: input.annualMortgageInterestRate / 100,
    });
    this.purchasePrice = this.salePrice;
  }

  private currencyFormatter = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    signDisplay: 'auto',
  });

  private percentageFormatter = new Intl.NumberFormat('en-CA', {
    style: 'percent',
  });

  private formatCurrency(number: number, sign = false) {
    this.currencyFormatter.resolvedOptions().signDisplay = sign
      ? 'always'
      : 'auto';
    return this.currencyFormatter.format(number);
  }

  private formatPercentage(number) {
    return this.percentageFormatter.format(number / 100);
  }

  private getLoanAmount() {
    return this.purchasePrice * (1 - this.downpaymentPercentage / 100);
  }

  private getMonthlyMortgagePayment() {
    const n = this.mortgageAmortization * 12;
    const monthlyMortgageInterestRate = this.annualMortgageInterestRate / 12;
    const PMI =
      this.downpaymentPercentage >= 20 ? 0 : (this.purchasePrice * 0.015) / 12;

    return (
      PMI +
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
      markdown: this.objToMarkdown(
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
      markdown: this.objToMarkdown(
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
      markdown: this.objToMarkdown(
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
      markdown: this.objToMarkdown(
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

  adjustToMaxPurchasePrice(minimumROI = 13, minimumCashflow = 0) {
    const checkDealCriteria = () => {
      const annualROI = this.getAnnualROI().value;
      const annualCashflow = this.getAnnualCashflow().value;

      if (annualROI >= minimumROI && annualCashflow >= minimumCashflow) {
        return Math.floor(annualCashflow) === minimumCashflow ? 'max' : 'good';
      }

      return 'bad';
    };

    // Finding initial upper bound
    this.purchasePrice = 1;
    while (checkDealCriteria() !== 'bad') {
      this.purchasePrice *= 2;
    }

    // Binary search within bounds
    let left = 0;
    let right = this.purchasePrice;

    while (left < right) {
      this.purchasePrice = Math.floor((left + right) / 2); // set to middle

      const dealAnalysisResult = checkDealCriteria();

      if (dealAnalysisResult === 'bad') {
        right = this.purchasePrice - 1;
      } else {
        left = this.purchasePrice;
        if (dealAnalysisResult === 'max') break;
      }
    }

    this.purchasePrice = left;

    return this;
  }

  resetPurchasePriceAdjustment() {
    this.purchasePrice = this.salePrice;
  }

  getFullResultsMarkdown() {
    const isPurchasePriceAdjusted = this.purchasePrice !== this.salePrice;
    const introString = isPurchasePriceAdjusted
      ? `# Maximum purchase price is ${this.formatCurrency(
          this.purchasePrice
        )} (${this.formatCurrency(
          this.purchasePrice - this.salePrice,
          true
        )} from sales price)`
      : `# Results at sale price of ${this.formatCurrency(this.salePrice)}`;

    return introString.concat(
      '\n\n',
      this.getAnnualExpenses().markdown,
      this.getAnnualCashflow().markdown,
      this.getAnnualReturn().markdown,
      this.getAnnualROI().markdown
    );
  }

  private objToMarkdown<T extends Record<string, number>>(
    obj: T,
    markdownTitle: string
  ) {
    const camelCaseToRegular = (camelCaseString: string) =>
      camelCaseString
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Insert space between camel case words
        .replace(/^./, (match) => match.toUpperCase()); // Capitalize the first letter

    const markdown = Object.entries(obj).reduce((acc, [k, v], i, arr) => {
      const str = acc.concat(
        `- ${camelCaseToRegular(k)}: ${
          k.toLowerCase().endsWith('roi')
            ? this.formatPercentage(v)
            : this.formatCurrency(v)
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
  .adjustToMaxPurchasePrice()
  .getFullResultsMarkdown()
)