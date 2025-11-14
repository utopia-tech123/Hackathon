import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  stepCountIs,
} from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod/v4'
// import { createResource } from '@/lib/actions/resources'
// import { findRelevantContent } from '@/lib/ai/embedding'
import { db } from '@/db'
import { transactions } from '@/db/schema'
import { and, eq, gt, ilike } from 'drizzle-orm'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

// const transactionsData = transactions
//   .map((t) =>
//     Object.entries(t)
//       .map(([key, value]) => `${key}: ${value}`)
//       .join(', ')
//   )
//   .join('\n')
export async function POST(req: Request) {
  const {
    messages,
  }: // model,
  // webSearch,
  {
    messages: UIMessage[]
    model: string
    webSearch: boolean
  } = await req.json()
  // console.log(transactionsData.slice(0, 200))

  const result = streamText({
    model: openai.chat('gpt-4o'),
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    system: `You are a helpful assistant. Check your knowledge base before answering any questions.
    The user has banking transactions data available to you to answer questions about their transactions.
    Transactions have account property which can be either 'Personal' or 'Family'.
    By default, assume the user is asking about 'Personal' account.
    For family transactions, the subAccount property indicates the family member name.
    All amounts are in AED.
    Only respond to questions using information from tool calls.
    if no relevant information is found in the tool calls, respond, "Sorry, I don't know."`,
    // system: `
    //   Respond to the user queries based on the banking transactions data.
    //   If the answer is not found in the data, respond with "I don't know."`,
    tools: {
      // transactions: {
      //   description:
      //     'Use this tool to query the banking transactions database.',
      //   inputSchema: z.object({
      //     // query: z
      //     //   .string()
      //     //   .describe('The query to execute on the transactions database'),
      //     date: z.string().describe('The date of the transaction to look for'),
      //   }),
      //   // You can implement the actual tool logic here
      //   // For demonstration, we provide a mock implementation
      //   execute: async ({ date }: { date: string }) => {
      //     // Simple mock logic to filter transactions based on query
      //     // const lowerQuery = query.toLowerCase()
      //     console.log(date)
      //     const filtered = transactions.filter(
      //       (t) => t.Date === date
      //       // Object.values(t).some((value) =>
      //       //   String(value).toLowerCase().includes(lowerQuery)
      //       // )
      //     )
      //     return JSON.stringify(filtered, null, 2)
      //   },
      // },

      // addResource: tool({
      //   description: `add a resource to your knowledge base.
      //     If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation.`,
      //   inputSchema: z.object({
      //     content: z
      //       .string()
      //       .describe('the content or resource to add to the knowledge base'),
      //   }),
      //   execute: async ({ content }) => createResource({ content }),
      // }),
      // getInformation: tool({
      //   description: `get information from your knowledge base to answer questions.`,
      //   inputSchema: z.object({
      //     question: z.string().describe('the users question'),
      //   }),
      //   execute: async ({ question }) => findRelevantContent(question),
      // }),
      getTransactions: tool({
        description: `get banking transactions from the transactions database to answer questions about user transactions.`,
        inputSchema: z.object({
          offset: z
            .number()
            .describe('the number of transactions to skip')
            .default(0),
          limit: z.number().describe('the number of transactions to return'),
          account: z
            .enum(['Personal', 'Family'])
            .describe('the account type can be either Personal or Family')
            .optional()
            .default('Personal'),
          subAccount: z.string().describe('family member name').optional(),
        }),
        execute: async ({
          offset,
          limit,
          account,
          subAccount,
        }: {
          offset: number
          limit: number
          account: string
          subAccount?: string
        }) => {
          console.log('getTransactions', account)
          if (account === 'Family' && subAccount) {
            console.log('subAccount', subAccount)
            const data = await db
              .select()
              .from(transactions)
              .where(
                and(
                  eq(transactions.account, 'Family'),
                  ilike(transactions.subAccount, `%${subAccount}%`)
                )
              )
              .offset(offset)
              .limit(limit)
            return JSON.stringify(data, null, 2)
          } else {
            const data = await db
              .select()
              .from(transactions)
              .where(eq(transactions.account, account))
              .offset(offset)
              .limit(limit)
            return JSON.stringify(data, null, 2)
          }
        },
      }),
      // getFamilyTransactions: tool({
      //   description: `get banking transactions from the transactions database to answer questions about family transactions.`,
      //   inputSchema: z.object({
      //     offset: z
      //       .number()
      //       .describe('the number of transactions to skip')
      //       .default(0),
      //     limit: z.number().describe('the number of transactions to return'),
      //     subAccount: z.string().describe('family member name'),
      //     description: z
      //       .string()
      //       .describe(
      //         'A keyword or phrase to search for in the transaction descriptions. For example, "petrol" or "rent".'
      //       ),
      //   }),
      //   execute: async ({
      //     offset,
      //     limit,
      //     subAccount,
      //     description,
      //   }: {
      //     offset: number
      //     limit: number
      //     subAccount: string
      //     description: string
      //   }) => {
      //     console.log('getTransactions', subAccount)
      //     const data = await db
      //       .select()
      //       .from(transactions)
      //       .where(
      //         and(
      //           eq(transactions.account, 'Family'),
      //           eq(transactions.subAccount, subAccount),
      //           ilike(transactions.description, `%${description}%`)
      //         )
      //       )
      //       .offset(offset)
      //       .limit(limit)
      //     return JSON.stringify(data, null, 2)
      //   },
      // }),
      getCreditTransactions: tool({
        description: `get banking credit transactions from the transactions database to answer questions about user credit transactions.`,
        inputSchema: z.object({
          offset: z
            .number()
            .describe('the number of transactions to skip')
            .default(0),
          limit: z.number().describe('the number of transactions to return'),
          account: z
            .enum(['Personal', 'Family'])
            .optional()
            .default('Personal'),
        }),
        execute: async ({
          offset,
          limit,
          account,
        }: {
          offset: number
          limit: number
          account: string
        }) => {
          console.log('getCreditTransactions', account)
          const data = await db
            .select()
            .from(transactions)
            .where(
              and(
                eq(transactions.account, account),
                gt(transactions.credit, '0')
              )
            )
            .offset(offset)
            .limit(limit)
          return JSON.stringify(data, null, 2)
        },
      }),
      getTransactionByDescription: tool({
        description: `get banking transactions by description from the transactions database to answer questions about user transactions.`,
        inputSchema: z.object({
          description: z
            .string()
            .describe(
              'A keyword or phrase to search for in the transaction descriptions. For example, "petrol" or "rent".'
            ),
          account: z
            .enum(['Personal', 'Family'])
            .optional()
            .default('Personal'),
          subAccount: z.string().describe('family member name').optional(),
        }),
        execute: async ({
          description,
          account,
          subAccount,
        }: {
          description: string
          account: string
          subAccount?: string
        }) => {
          console.log('getTransactionByDescription', description, account)

          if (account === 'Family' && subAccount) {
            const parts = description.split(' ')
            const data = await db
              .select()
              .from(transactions)
              .where(
                and(
                  eq(transactions.account, 'Family'),
                  eq(transactions.subAccount, subAccount),
                  parts.length > 1
                    ? ilike(transactions.description, `%${parts[0]}%`)
                    : ilike(transactions.description, `%${description}%`)
                )
              )
            return JSON.stringify(data, null, 2)
          } else {
            const data = await db
              .select()
              .from(transactions)
              .where(
                and(
                  eq(transactions.account, account),
                  ilike(transactions.description, `%${description}%`)
                )
              )
            return JSON.stringify(data, null, 2)
          }
        },
      }),
      getTransactionsByDate: tool({
        description: `get banking transactions by date from the transactions database to answer questions about user transactions.`,
        inputSchema: z.object({
          date: z
            .string()
            .describe(
              'The date of the transaction to look for (format: YYYY-MM-DD)'
            ),
        }),
        execute: async ({ date }: { date: string }) => {
          console.log(date)

          const data = await db
            .select()
            .from(transactions)
            .where(eq(transactions.date, date))
          return JSON.stringify(data, null, 2)
        },
      }),
    },
  })

  // send sources and reasoning back to the client
  return result.toUIMessageStreamResponse()
}
