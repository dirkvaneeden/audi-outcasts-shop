/**
 * South African banks with their universal branch codes.
 * The code is filled in automatically when the bank is chosen; it can still be edited.
 */
export const SA_BANKS: { name: string; branchCode: string }[] = [
  { name: 'Absa Bank', branchCode: '632005' },
  { name: 'African Bank', branchCode: '430000' },
  { name: 'Bank Zero', branchCode: '888000' },
  { name: 'Capitec Bank', branchCode: '470010' },
  { name: 'Capitec Business', branchCode: '450105' },
  { name: 'Discovery Bank', branchCode: '679000' },
  { name: 'First National Bank (FNB)', branchCode: '250655' },
  { name: 'Investec Bank', branchCode: '580105' },
  { name: 'Nedbank', branchCode: '198765' },
  { name: 'Standard Bank', branchCode: '051001' },
  { name: 'TymeBank', branchCode: '678910' },
];

export const ACCOUNT_TYPES = ['Cheque / Current', 'Savings', 'Transmission', 'Business'] as const;

/** "62012345678" -> "6201 2345 678": easier to read and type into a banking app. */
export function groupDigits(value: string) {
  return value.replace(/(\d{4})(?=\d)/g, '$1 ');
}
