import { NextRequest, NextResponse } from 'next/server'

const API = 'http://localhost:3001'

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/')
  const url = `${API}/${path}${req.nextUrl.search}`

  const res = await fetch(url, {
    method: req.method,
    headers: { 'Content-Type': 'application/json' },
    body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export const GET    = handler
export const POST   = handler
export const PATCH  = handler
export const DELETE = handler
