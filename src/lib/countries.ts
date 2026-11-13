// Countries a farm can be in, and the currency its records are kept in.
// Codes are ISO 3166-1 alpha-2, currencies ISO 4217. Names are spelled out
// (not from Intl) so the server and browser render the same list.

/** [ISO country code, ISO currency code, English name] */
const COUNTRY_DATA: [string, string, string][] = [
  ['AF', 'AFN', "Afghanistan"],
  ['AL', 'ALL', "Albania"],
  ['DZ', 'DZD', "Algeria"],
  ['AD', 'EUR', "Andorra"],
  ['AO', 'AOA', "Angola"],
  ['AG', 'XCD', "Antigua and Barbuda"],
  ['AR', 'ARS', "Argentina"],
  ['AM', 'AMD', "Armenia"],
  ['AU', 'AUD', "Australia"],
  ['AT', 'EUR', "Austria"],
  ['AZ', 'AZN', "Azerbaijan"],
  ['BS', 'BSD', "Bahamas"],
  ['BH', 'BHD', "Bahrain"],
  ['BD', 'BDT', "Bangladesh"],
  ['BB', 'BBD', "Barbados"],
  ['BY', 'BYN', "Belarus"],
  ['BE', 'EUR', "Belgium"],
  ['BZ', 'BZD', "Belize"],
  ['BJ', 'XOF', "Benin"],
  ['BT', 'BTN', "Bhutan"],
  ['BO', 'BOB', "Bolivia"],
  ['BA', 'BAM', "Bosnia and Herzegovina"],
  ['BW', 'BWP', "Botswana"],
  ['BR', 'BRL', "Brazil"],
  ['BN', 'BND', "Brunei"],
  ['BG', 'BGN', "Bulgaria"],
  ['BF', 'XOF', "Burkina Faso"],
  ['BI', 'BIF', "Burundi"],
  ['CV', 'CVE', "Cape Verde"],
  ['KH', 'KHR', "Cambodia"],
  ['CM', 'XAF', "Cameroon"],
  ['CA', 'CAD', "Canada"],
  ['CF', 'XAF', "Central African Republic"],
  ['TD', 'XAF', "Chad"],
  ['CL', 'CLP', "Chile"],
  ['CN', 'CNY', "China"],
  ['CO', 'COP', "Colombia"],
  ['KM', 'KMF', "Comoros"],
  ['CG', 'XAF', "Congo - Brazzaville"],
  ['CD', 'CDF', "Congo - Kinshasa"],
  ['CR', 'CRC', "Costa Rica"],
  ['CI', 'XOF', "Cote d'Ivoire"],
  ['HR', 'EUR', "Croatia"],
  ['CU', 'CUP', "Cuba"],
  ['CY', 'EUR', "Cyprus"],
  ['CZ', 'CZK', "Czechia"],
  ['DK', 'DKK', "Denmark"],
  ['DJ', 'DJF', "Djibouti"],
  ['DM', 'XCD', "Dominica"],
  ['DO', 'DOP', "Dominican Republic"],
  ['EC', 'USD', "Ecuador"],
  ['EG', 'EGP', "Egypt"],
  ['SV', 'USD', "El Salvador"],
  ['GQ', 'XAF', "Equatorial Guinea"],
  ['ER', 'ERN', "Eritrea"],
  ['EE', 'EUR', "Estonia"],
  ['SZ', 'SZL', "Eswatini"],
  ['ET', 'ETB', "Ethiopia"],
  ['FJ', 'FJD', "Fiji"],
  ['FI', 'EUR', "Finland"],
  ['FR', 'EUR', "France"],
  ['GA', 'XAF', "Gabon"],
  ['GM', 'GMD', "Gambia"],
  ['GE', 'GEL', "Georgia"],
  ['DE', 'EUR', "Germany"],
  ['GH', 'GHS', "Ghana"],
  ['GR', 'EUR', "Greece"],
  ['GD', 'XCD', "Grenada"],
  ['GT', 'GTQ', "Guatemala"],
  ['GN', 'GNF', "Guinea"],
  ['GW', 'XOF', "Guinea-Bissau"],
  ['GY', 'GYD', "Guyana"],
  ['HT', 'HTG', "Haiti"],
  ['HN', 'HNL', "Honduras"],
  ['HK', 'HKD', "Hong Kong"],
  ['HU', 'HUF', "Hungary"],
  ['IS', 'ISK', "Iceland"],
  ['IN', 'INR', "India"],
  ['ID', 'IDR', "Indonesia"],
  ['IR', 'IRR', "Iran"],
  ['IQ', 'IQD', "Iraq"],
  ['IE', 'EUR', "Ireland"],
  ['IL', 'ILS', "Israel"],
  ['IT', 'EUR', "Italy"],
  ['JM', 'JMD', "Jamaica"],
  ['JP', 'JPY', "Japan"],
  ['JO', 'JOD', "Jordan"],
  ['KZ', 'KZT', "Kazakhstan"],
  ['KE', 'KES', "Kenya"],
  ['KI', 'AUD', "Kiribati"],
  ['KW', 'KWD', "Kuwait"],
  ['KG', 'KGS', "Kyrgyzstan"],
  ['LA', 'LAK', "Laos"],
  ['LV', 'EUR', "Latvia"],
  ['LB', 'LBP', "Lebanon"],
  ['LS', 'LSL', "Lesotho"],
  ['LR', 'LRD', "Liberia"],
  ['LY', 'LYD', "Libya"],
  ['LI', 'CHF', "Liechtenstein"],
  ['LT', 'EUR', "Lithuania"],
  ['LU', 'EUR', "Luxembourg"],
  ['MG', 'MGA', "Madagascar"],
  ['MW', 'MWK', "Malawi"],
  ['MY', 'MYR', "Malaysia"],
  ['MV', 'MVR', "Maldives"],
  ['ML', 'XOF', "Mali"],
  ['MT', 'EUR', "Malta"],
  ['MH', 'USD', "Marshall Islands"],
  ['MR', 'MRU', "Mauritania"],
  ['MU', 'MUR', "Mauritius"],
  ['MX', 'MXN', "Mexico"],
  ['FM', 'USD', "Micronesia"],
  ['MD', 'MDL', "Moldova"],
  ['MC', 'EUR', "Monaco"],
  ['MN', 'MNT', "Mongolia"],
  ['ME', 'EUR', "Montenegro"],
  ['MA', 'MAD', "Morocco"],
  ['MZ', 'MZN', "Mozambique"],
  ['MM', 'MMK', "Myanmar"],
  ['NA', 'NAD', "Namibia"],
  ['NR', 'AUD', "Nauru"],
  ['NP', 'NPR', "Nepal"],
  ['NL', 'EUR', "Netherlands"],
  ['NZ', 'NZD', "New Zealand"],
  ['NI', 'NIO', "Nicaragua"],
  ['NE', 'XOF', "Niger"],
  ['NG', 'NGN', "Nigeria"],
  ['KP', 'KPW', "North Korea"],
  ['MK', 'MKD', "North Macedonia"],
  ['NO', 'NOK', "Norway"],
  ['OM', 'OMR', "Oman"],
  ['PK', 'PKR', "Pakistan"],
  ['PW', 'USD', "Palau"],
  ['PS', 'ILS', "Palestine"],
  ['PA', 'PAB', "Panama"],
  ['PG', 'PGK', "Papua New Guinea"],
  ['PY', 'PYG', "Paraguay"],
  ['PE', 'PEN', "Peru"],
  ['PH', 'PHP', "Philippines"],
  ['PL', 'PLN', "Poland"],
  ['PT', 'EUR', "Portugal"],
  ['PR', 'USD', "Puerto Rico"],
  ['QA', 'QAR', "Qatar"],
  ['RO', 'RON', "Romania"],
  ['RU', 'RUB', "Russia"],
  ['RW', 'RWF', "Rwanda"],
  ['KN', 'XCD', "Saint Kitts and Nevis"],
  ['LC', 'XCD', "Saint Lucia"],
  ['VC', 'XCD', "Saint Vincent and the Grenadines"],
  ['WS', 'WST', "Samoa"],
  ['SM', 'EUR', "San Marino"],
  ['ST', 'STN', "Sao Tome and Principe"],
  ['SA', 'SAR', "Saudi Arabia"],
  ['SN', 'XOF', "Senegal"],
  ['RS', 'RSD', "Serbia"],
  ['SC', 'SCR', "Seychelles"],
  ['SL', 'SLE', "Sierra Leone"],
  ['SG', 'SGD', "Singapore"],
  ['SK', 'EUR', "Slovakia"],
  ['SI', 'EUR', "Slovenia"],
  ['SB', 'SBD', "Solomon Islands"],
  ['SO', 'SOS', "Somalia"],
  ['ZA', 'ZAR', "South Africa"],
  ['KR', 'KRW', "South Korea"],
  ['SS', 'SSP', "South Sudan"],
  ['ES', 'EUR', "Spain"],
  ['LK', 'LKR', "Sri Lanka"],
  ['SD', 'SDG', "Sudan"],
  ['SR', 'SRD', "Suriname"],
  ['SE', 'SEK', "Sweden"],
  ['CH', 'CHF', "Switzerland"],
  ['SY', 'SYP', "Syria"],
  ['TW', 'TWD', "Taiwan"],
  ['TJ', 'TJS', "Tajikistan"],
  ['TZ', 'TZS', "Tanzania"],
  ['TH', 'THB', "Thailand"],
  ['TL', 'USD', "Timor-Leste"],
  ['TG', 'XOF', "Togo"],
  ['TO', 'TOP', "Tonga"],
  ['TT', 'TTD', "Trinidad and Tobago"],
  ['TN', 'TND', "Tunisia"],
  ['TR', 'TRY', "Turkey"],
  ['TM', 'TMT', "Turkmenistan"],
  ['TV', 'AUD', "Tuvalu"],
  ['UG', 'UGX', "Uganda"],
  ['UA', 'UAH', "Ukraine"],
  ['AE', 'AED', "United Arab Emirates"],
  ['GB', 'GBP', "United Kingdom"],
  ['US', 'USD', "United States"],
  ['UY', 'UYU', "Uruguay"],
  ['UZ', 'UZS', "Uzbekistan"],
  ['VU', 'VUV', "Vanuatu"],
  ['VA', 'EUR', "Vatican City"],
  ['VE', 'VES', "Venezuela"],
  ['VN', 'VND', "Vietnam"],
  ['YE', 'YER', "Yemen"],
  ['ZM', 'ZMW', "Zambia"],
  ['ZW', 'USD', "Zimbabwe"],
]

const COUNTRY_CURRENCY: Record<string, string> = Object.fromEntries(COUNTRY_DATA.map(([code, currency]) => [code, currency]))
const COUNTRY_NAME: Record<string, string> = Object.fromEntries(COUNTRY_DATA.map(([code, , name]) => [code, name]))

/** The country whose number style each currency is shown in, e.g. GHS → GH. */
const CURRENCY_HOME: Record<string, string> = { USD: 'US', EUR: 'DE', XOF: 'SN', XAF: 'CM', XCD: 'LC', AUD: 'AU', CHF: 'CH', ILS: 'IL' }
for (const [country, currency] of Object.entries(COUNTRY_CURRENCY)) {
  CURRENCY_HOME[currency] ??= country
}

export const GHANA = 'GH'
/** Used for farms that have not picked a country yet; every farm before countries existed was in Ghana. */
export const DEFAULT_FARM_CURRENCY = 'GHS'

export function countryName(code: string) {
  return COUNTRY_NAME[code] ?? code
}

export type CountryOption = { code: string; name: string; currency: string }

/** Every supported country, sorted by name. */
export const COUNTRIES: CountryOption[] = COUNTRY_DATA.map(([code, currency, name]) => ({ code, name, currency })).sort((a, b) =>
  a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
)

export function isSupportedCountry(code: unknown): code is string {
  return typeof code === 'string' && Object.prototype.hasOwnProperty.call(COUNTRY_CURRENCY, code)
}

/** The currency a farm in this country keeps its records in. */
export function currencyForCountry(code: string | null | undefined) {
  return (code && COUNTRY_CURRENCY[code]) || DEFAULT_FARM_CURRENCY
}

/** Locale used to format amounts in a currency, e.g. "en-GH" for GHS. */
export function localeForCurrency(currency: string) {
  const home = CURRENCY_HOME[currency]
  return home ? `en-${home}` : 'en-US'
}

/**
 * Plans are priced in US dollars, except for farms in Ghana, which always pay
 * in cedis. Farms with no country yet are older Ghana farms.
 */
export type BillingCurrency = 'GHS' | 'USD'
export function billingCurrencyForCountry(code: string | null | undefined): BillingCurrency {
  return !code || code === GHANA ? 'GHS' : 'USD'
}
