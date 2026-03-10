import { NextResponse } from 'next/server'

// Unsigned preset + cloud name are public by design (client uploads directly to Cloudinary)
export async function GET() {
  return NextResponse.json({
    cloudName: 'dbwkbqdqi',
    uploadPreset: 'octagonbet_chat',
  })
}
