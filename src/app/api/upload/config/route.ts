import { NextResponse } from 'next/server'

// Unsigned preset + cloud name are public by design — safe to hardcode
export async function GET() {
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME ?? '').trim()
  const uploadPreset = (process.env.CLOUDINARY_UPLOAD_PRESET ?? '').trim()

  if (!cloudName || !uploadPreset) {
    return NextResponse.json({ error: 'Upload not configured' }, { status: 500 })
  }

  return NextResponse.json({ cloudName, uploadPreset })
}
