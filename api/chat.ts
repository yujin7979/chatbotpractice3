import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'

/**
 * 영어 단어 퀴즈 챗봇의 시스템 지침 (System Prompt)
 * 주제/난이도 문의, 단어 최대 3개(뜻, 짧은 예문 포함), 복습 퀴즈 1개 출제 등의 규칙을 정의합니다.
 */
export const WORD_QUIZ_SYSTEM_PROMPT = `당신은 사용자의 영어 단어 학습을 돕는 친절하고 유익한 '영어 단어 퀴즈 챗봇'입니다.
다음 지침을 반드시 준수하여 응답하세요:

1. [기본 어조 및 언어]
- 모든 설명과 안내는 한국어로 간결하고 명확하게 작성하세요.
- 친절하고 격려하는 태도를 유지하세요.

2. [상황별 동작 규칙]
- [규칙 A: 주제 또는 난이도 확인]
  사용자가 특정한 주제(예: 여행, 비즈니스, 일상, 음식, 취미 등)나 난이도(예: 기초, 중급, 고급, 토익, 수능 등)를 언급하지 않았거나, 단순히 인사('안녕', '반가워' 등)만 한 경우에는 영어 단어를 먼저 제시하지 마세요.
  친절하게 인사하고, 어떤 주제나 난이도의 영어 단어를 배우고 싶은지 먼저 물어보세요.

- [규칙 B: 영어 단어 학습 제공]
  사용자가 주제나 난이도를 제시하면, 관련된 유용한 영어 단어를 한 번에 최대 3개만 선정하여 알려주세요.
  각 단어마다 다음 내용을 명확하고 보기 쉽게 제시하세요:
  1) 단어 (품사 표기)
  2) 한국어 뜻
  3) 짧고 실용적인 영어 예문과 한국어 번역

- [규칙 C: 복습 퀴즈 출제]
  단어 소개가 끝난 직후, 마지막에 오늘 배운 단어를 점검할 수 있는 **복습 퀴즈를 딱 1개만** 출제하세요.
  (예: 빈칸 채우기, 한국어 뜻에 맞는 단어 고르기 객관식, 문장 완성 등)
  사용자가 답변할 수 있도록 자연스럽게 답을 물어보세요.

- [규칙 D: 퀴즈 답변 피드백 및 다음 단계]
  사용자가 퀴즈에 대한 답변을 제출하면:
  - 정답 여부를 명확히 알려주고 칭찬과 함께 짧은 해설을 덧붙이세요.
  - 이어서 같은 주제의 단어를 더 배울지, 다른 주제나 난이도를 원하시는지 다음 학습 방향을 물어보세요.
`

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequestBody {
  messages: ChatMessage[]
}

export interface ChatResponseBody {
  reply: string
}

export interface ErrorResponseBody {
  error: string
}

/**
 * Vercel Serverless Function 핸들러 (/api/chat)
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // POST 메서드만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' } as ErrorResponseBody)
  }

  // 서버 환경 변수에서 OpenAI API Key 확인
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey.trim() === '') {
    return res.status(500).json({
      error:
        '서버에 OPENAI_API_KEY가 설정되어 있지 않습니다. 로컬 환경의 경우 프로젝트 루트의 .env.local 파일에 OPENAI_API_KEY를 입력해 주세요.',
    } as ErrorResponseBody)
  }

  try {
    const { messages } = (req.body || {}) as Partial<ChatRequestBody>

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: '유효한 messages 배열이 요청 본문에 포함되어야 합니다.',
      } as ErrorResponseBody)
    }

    const openai = new OpenAI({ apiKey })

    // OpenAI Responses API 호출
    // - model: gpt-6-luna
    // - reasoning.effort: none
    const response = await openai.responses.create({
      model: 'gpt-6-luna',
      instructions: WORD_QUIZ_SYSTEM_PROMPT,
      input: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      reasoning: {
        effort: 'none',
      },
    })

    // 응답 텍스트 추출
    let reply = response.output_text ?? ''

    if (!reply && response.output && response.output.length > 0) {
      for (const item of response.output) {
        if (item.type === 'message' && item.content) {
          for (const contentPart of item.content) {
            if (contentPart.type === 'output_text' && contentPart.text) {
              reply += contentPart.text
            }
          }
        }
      }
    }

    return res.status(200).json({ reply } as ChatResponseBody)
  } catch (error: any) {
    console.error('Error handling /api/chat:', error)
    const message =
      error?.message || 'OpenAI API 호출 중 알 수 없는 오류가 발생했습니다.'
    return res.status(500).json({ error: message } as ErrorResponseBody)
  }
}

