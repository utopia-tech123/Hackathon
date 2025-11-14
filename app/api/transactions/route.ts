import { transactions as transactionData } from '@/data/family'
// import { db } from '@/db'
// import { transactions } from '@/db/schema'

export async function GET() {
  // await db
  //   .insert(transactions)
  //   .values(
  //     transactionData.map((t) => ({
  //       account: 'Family',
  //       date: t.Date,
  //       credit: t['Credit (AED)'],
  //       debit: t['Debit (AED)'],
  //       balance: t['Main Balance (AED)'],
  //       savingBalance: t['Savings Balance (AED)'],
  //       description: t.Description,
  //       subAccount: t['Sub-Account'] || null,
  //     }))
  //   )
  //   .returning()
  return Response.json(transactionData)
}
