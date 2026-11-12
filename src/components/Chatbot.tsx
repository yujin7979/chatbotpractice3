import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react'
import { sendChatMessage, type ChatMessage } from '../api/chat'
import './Chatbot.css'

// 추천 주제/난이도 빠른 선택 칩 목록
const QUICK_PROMPTS = [
  { label: '🌱 초급 일상회화', text: '초급 난이도로 일상에서 자주 쓰는 단어를 배우고 싶어요.' },
  { label: '✈️ 여행 필수 단어', text: '해외여행 갈 때 꼭 필요한 영어 단어를 알려주세요.' },
  { label: '💼 비즈니스 영어', text: '비즈니스 이메일이나 미팅에서 쓰는 중급 단어 알려주세요.' },
  { label: '🎯 토익 빈출 어휘', text: '토익 시험에 자주 나오는 고급 어휘를 공부하고 싶어요.' },
]

export function Chatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        '안녕하세요! 영어 단어 퀴즈 챗봇입니다. 🎓\n\n배우고 싶은 **주제**(예: 여행, 비즈니스, 일상 등)나 **난이도**(초급, 중급, 토익 등)를 말씀해 주시면, 맞춤 단어 3개와 복습 퀴즈를 준비해 드릴게요!',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // 메시지 업데이트 시 스크롤을 항상 아래로 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = async (textToSend?: string) => {
    const trimmed = (textToSend ?? input).trim()
    if (!trimmed || isLoading) return

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(newMessages)
    setInput('')
    setError(null)
    setIsLoading(true)

    try {
      const reply = await sendChatMessage(newMessages)
      setMessages([...newMessages, { role: 'assistant', content: reply }])
    } catch (err: unknown) {
      const errMessage =
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      setError(errMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    handleSend()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleReset = () => {
    setMessages([
      {
        role: 'assistant',
        content:
          '대화가 초기화되었습니다. 😊\n\n원하시는 주제나 난이도를 입력해 주시면 새로운 단어와 퀴즈로 안내해 드릴게요!',
      },
    ])
    setError(null)
  }

  return (
    <div className="chatbot-wrapper">
      <header className="chatbot-header">
        <div className="header-left">
          <span className="header-icon">📚</span>
          <div>
            <h1 className="header-title">영어 단어 퀴즈 챗봇</h1>
            <p className="header-subtitle">OpenAI gpt-6-luna (Responses API)</p>
          </div>
        </div>
        <button
          type="button"
          className="reset-btn"
          onClick={handleReset}
          title="대화 초기화"
        >
          🔄 새로 시작
        </button>
      </header>

      {/* 추천 키워드 칩 바 */}
      <div className="quick-prompt-bar">
        <span className="quick-label">빠른 시작:</span>
        <div className="quick-chips">
          {QUICK_PROMPTS.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              className="quick-chip"
              disabled={isLoading}
              onClick={() => handleSend(chip.text)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* 대화 영역 */}
      <div className="chatbot-messages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message-row ${msg.role === 'user' ? 'message-user' : 'message-assistant'}`}
          >
            <div className="message-avatar">
              {msg.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className="message-content">
              <div className="message-author">
                {msg.role === 'user' ? '나' : '단어 퀴즈 챗봇'}
              </div>
              <div className="message-bubble">
                {msg.content.split('\n').map((line, i) => (
                  <p key={i}>{line || '\u00A0'}</p>
                ))}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message-row message-assistant">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="message-author">단어 퀴즈 챗봇</div>
              <div className="message-bubble loading-bubble">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="loading-text">단어와 퀴즈를 생성하고 있어요...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 에러 알림창 */}
      {error && (
        <div className="chatbot-error-banner">
          <span className="error-icon">⚠️</span>
          <div className="error-text">
            <strong>오류:</strong> {error}
            {error.includes('OPENAI_API_KEY') && (
              <p className="error-hint">
                💡 프로젝트 루트의 <code>.env.local</code> 파일에 본인의 OpenAI API Key를 입력한 후 다시 시도해 주세요.
              </p>
            )}
          </div>
          <button
            type="button"
            className="error-dismiss"
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* 입력 영역 */}
      <form className="chatbot-input-form" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="chatbot-input"
          placeholder="주제나 난이도를 입력하거나 퀴즈의 답을 적어주세요... (Shift+Enter로 줄바꿈)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="chatbot-send-btn"
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? '생성 중...' : '전송 ➔'}
        </button>
      </form>
    </div>
  )
}
export default Chatbot

