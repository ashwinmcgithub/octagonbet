import { NextResponse } from 'next/server'

// Unsigned preset + cloud name are public by design — safe to expose
export async function GET() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    return NextResponse.json({ error: 'Upload not configured' }, { status: 500 })
  }

  return NextResponse.json({ cloudName, uploadPreset })
}
