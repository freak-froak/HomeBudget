export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface ConversionResult {
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  fromCurrency: string;
  toCurrency: string;
}

export class CurrencyService {
  private supportedCurrencies: Currency[] = [
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
    { code: "AUD", name: "Australian Dollar", symbol: "A$" },
    { code: "JPY", name: "Japanese Yen", symbol: "¥" },
    { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
    { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
    { code: "INR", name: "Indian Rupee", symbol: "₹" },
    { code: "BRL", name: "Brazilian Real", symbol: "R$" },
    { code: "MXN", name: "Mexican Peso", symbol: "$" },
    { code: "KRW", name: "South Korean Won", symbol: "₩" },
    { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
    { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
    { code: "SEK", name: "Swedish Krona", symbol: "kr" },
    { code: "DKK", name: "Danish Krone", symbol: "kr" },
    { code: "PLN", name: "Polish Zloty", symbol: "zł" },
    { code: "CZK", name: "Czech Koruna", symbol: "Kč" },
    { code: "HUF", name: "Hungarian Forint", symbol: "Ft" },
    { code: "RUB", name: "Russian Ruble", symbol: "₽" }
  ];

  // Mock exchange rates - in production, this would fetch from a real API
  private exchangeRates: Record<string, Record<string, number>> = {
    USD: { EUR: 0.85, GBP: 0.73, CAD: 1.25, AUD: 1.35, JPY: 110, CHF: 0.92, CNY: 6.45, INR: 74.5 },
    EUR: { USD: 1.18, GBP: 0.86, CAD: 1.47, AUD: 1.59, JPY: 129, CHF: 1.08, CNY: 7.60, INR: 87.8 },
    GBP: { USD: 1.37, EUR: 1.16, CAD: 1.71, AUD: 1.85, JPY: 150, CHF: 1.26, CNY: 8.84, INR: 102 },
    CAD: { USD: 0.80, EUR: 0.68, GBP: 0.58, AUD: 1.08, JPY: 88, CHF: 0.74, CNY: 5.16, INR: 59.6 },
    AUD: { USD: 0.74, EUR: 0.63, GBP: 0.54, CAD: 0.93, JPY: 81, CHF: 0.68, CNY: 4.78, INR: 55.2 },
    JPY: { USD: 0.0091, EUR: 0.0078, GBP: 0.0067, CAD: 0.011, AUD: 0.012, CHF: 0.0084, CNY: 0.059, INR: 0.68 }
  };

  getSupportedCurrencies(): Currency[] {
    return this.supportedCurrencies;
  }

  async convert(amount: number, fromCurrency: string, toCurrency: string): Promise<ConversionResult> {
    if (fromCurrency === toCurrency) {
      return {
        fromAmount: amount,
        toAmount: amount,
        exchangeRate: 1,
        fromCurrency,
        toCurrency
      };
    }

    const rate = this.getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = amount * rate;

    return {
      fromAmount: amount,
      toAmount: Number(convertedAmount.toFixed(2)),
      exchangeRate: rate,
      fromCurrency,
      toCurrency
    };
  }

  getExchangeRate(fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === toCurrency) return 1;
    
    // If we have direct rate
    if (this.exchangeRates[fromCurrency]?.[toCurrency]) {
      return this.exchangeRates[fromCurrency][toCurrency];
    }

    // If we have reverse rate
    if (this.exchangeRates[toCurrency]?.[fromCurrency]) {
      return 1 / this.exchangeRates[toCurrency][fromCurrency];
    }

    // Convert through USD if no direct rate
    if (fromCurrency !== "USD" && toCurrency !== "USD") {
      const toUSD = this.exchangeRates[fromCurrency]?.["USD"] || 1;
      const fromUSD = this.exchangeRates["USD"]?.[toCurrency] || 1;
      return toUSD * fromUSD;
    }

    return 1; // Fallback
  }

  formatCurrency(amount: number, currencyCode: string): string {
    const currency = this.supportedCurrencies.find(c => c.code === currencyCode);
    if (!currency) return `${amount.toFixed(2)}`;

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode
      }).format(amount);
    } catch {
      return `${currency.symbol}${amount.toFixed(2)}`;
    }
  }
}

export const currencyService = new CurrencyService();
