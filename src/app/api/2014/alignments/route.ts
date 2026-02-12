import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connection'
import AlignmentModel from '@/lib/db/models/alignment'

export async function GET() {
  await connectDB()
  const data = await AlignmentModel.find({})
    .select({ index: 1, name: 1, url: 1, _id: 0 })
    .sort({ index: 'asc' })
    .lean()
  return NextResponse.json({ count: data.length, results: data })
}
