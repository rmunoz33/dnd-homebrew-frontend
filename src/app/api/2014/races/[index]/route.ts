import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connection'
import RaceModel from '@/lib/db/models/race'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ index: string }> }
) {
  const { index } = await params
  await connectDB()
  const data = await RaceModel.findOne({ index }).lean()
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(data)
}
