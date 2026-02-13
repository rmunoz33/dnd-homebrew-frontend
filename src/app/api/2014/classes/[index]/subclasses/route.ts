import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connection'
import SubclassModel from '@/lib/db/models/subclass'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ index: string }> }
) {
  const { index } = await params
  await connectDB()
  const urlString = '/api/2014/classes/' + index
  const data = await SubclassModel.find({ 'class.url': urlString })
    .select({ index: 1, name: 1, url: 1, _id: 0 })
    .sort({ url: 'asc' })
    .lean()

  return NextResponse.json({ count: data.length, results: data })
}
