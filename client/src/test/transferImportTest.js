// Test data for Transfer CSV import with empty descriptions
// This can be used to test the modified ImportCSV functionality

export const transferTestData = {
  // Valid CSV with mixed descriptions (some empty, some filled)
  csvWithMixedDescriptions: `Date,Amount,FromAccount,ToAccount,Description
2025-01-15,1000.00,Conta Corrente,Poupança,Transferência para poupança
2025-01-20,500.00,Carteira,Conta Corrente,
2025-01-25,300.00,Poupança,Conta Corrente,Retirada para gastos
2025-01-30,150.00,Conta Corrente,Carteira,`,

  // Valid CSV with all empty descriptions
  csvWithAllEmptyDescriptions: `Date,Amount,FromAccount,ToAccount,Description
2025-01-15,1000.00,Conta Corrente,Poupança,
2025-01-20,500.00,Carteira,Conta Corrente,
2025-01-25,300.00,Poupança,Conta Corrente,`,

  // Expected results after parsing
  expectedResults: [
    {
      Date: '2025-01-15',
      Amount: '1000.00',
      FromAccount: 'Conta Corrente',
      ToAccount: 'Poupança',
      Description: 'Transferência para poupança'
    },
    {
      Date: '2025-01-20',
      Amount: '500.00',
      FromAccount: 'Carteira',
      ToAccount: 'Conta Corrente',
      Description: '' // Empty description should be valid
    },
    {
      Date: '2025-01-25',
      Amount: '300.00',
      FromAccount: 'Poupança',
      ToAccount: 'Conta Corrente',
      Description: 'Retirada para gastos'
    },
    {
      Date: '2025-01-30',
      Amount: '150.00',
      FromAccount: 'Conta Corrente',
      ToAccount: 'Carteira',
      Description: '' // Empty description should be valid
    }
  ]
};