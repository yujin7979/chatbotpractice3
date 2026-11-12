import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'
import path from 'node:path'

// 로컬 개발 환경에서 .env.local 및 .env 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config()

/**
 * 로컬 개발 서버(npm run dev) 환경에서 Vercel 서버 함수(api/chat.ts)를
 * /api/chat 엔드포인트로 직접 호출할 수 있도록 해주는 Vite 플러그인
 */
function vercelApiDevPlugin(): Plugin {
  return {
    name: 'vite-plugin-vercel-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // /api/chat 엔드포인트 요청 처리
        if (req.url && req.url.startsWith('/api/chat')) {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Method Not Allowed' }))
            return
          }

          try {
            // 요청 본문(body) 수집 및 파싱
            const chunks: Buffer[] = []
            for await (const chunk of req) {
              chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
            }
            const rawBody = Buffer.concat(chunks).toString('utf-8')
            let body = {}
            if (rawBody.trim()) {
              try {
                body = JSON.parse(rawBody)
              } catch {
                body = {}
              }
            }

            // VercelRequest 형태 모방
            const vercelReq = Object.assign(req, {
              body,
              query: {},
              cookies: {},
            })

            // VercelResponse 형태 모방
            const vercelRes = Object.assign(res, {
              status(statusCode: number) {
                res.statusCode = statusCode
                return vercelRes
              },
              json(data: unknown) {
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify(data))
                return vercelRes
              },
              send(data: unknown) {
                res.end(data)
                return vercelRes
              },
            })

            // Vite의 ssrLoadModule을 통해 api/chat.ts를 불러와 실행
            const apiModule = await server.ssrLoadModule('/api/chat.ts')
            const handler = apiModule.default || apiModule.handler

            if (typeof handler === 'function') {
              await handler(vercelReq as any, vercelRes as any)
            } else {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(
                JSON.stringify({
                  error: 'api/chat.ts 에서 export default 핸들러를 찾을 수 없습니다.',
                })
              )
            }
          } catch (error: any) {
            console.error('API Error in dev server:', error)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(
              JSON.stringify({
                error: error?.message || '로컬 서버 함수 처리 중 오류가 발생했습니다.',
              })
            )
          }
          return
        }

        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vercelApiDevPlugin()],
})
