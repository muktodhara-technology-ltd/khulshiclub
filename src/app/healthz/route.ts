export function GET() {
  return new Response('ok\n', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  })
}
