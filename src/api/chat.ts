export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponseBody {
  reply: string
}

export interface ErrorResponseBody {
  error: string
}

/**
 * 백엔드 서버 함수(/api/chat)로 대화 메시지를 전송하고 응답을 받아옵니다.
 * @param messages 지금까지의 대화 메시지 기록
 * @returns 챗봇의 응답 문자열
 */
export async function sendChatMessage(messages: ChatMessage[]): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  })

  if (!response.ok) {
    let errorMessage = `서버 응답 오류 (HTTP ${response.status})`
    try {
      const errorJson = (await response.json()) as ErrorResponseBody
      if (errorJson?.error) {
        errorMessage = errorJson.error
      }
    } catch {
      // JSON 파싱 실패 시 기본 상태 텍스트 사용
      if (response.statusText) {
        errorMessage = `서버 오류: ${response.statusText}`
      }
    }
    throw new Error(errorMessage)
  }

  const data = (await response.json()) as ChatResponseBody
  return data.reply
}

