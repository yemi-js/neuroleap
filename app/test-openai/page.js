'use client'

import { useState } from 'react'

export default function TestOpenAI() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const testOpenAI = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/test-openai')
      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-800 to-violet-900 p-8">
      <div className="max-w-2xl mx-auto bg-white/10 backdrop-blur-lg rounded-lg p-6">
        <h1 className="text-2xl font-bold text-white mb-6">OpenAI Test Page</h1>
        
        <button
          onClick={testOpenAI}
          disabled={loading}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test OpenAI Connection'}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-white">
            <h2 className="font-semibold mb-2">Error:</h2>
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-lg text-white">
            <h2 className="font-semibold mb-2">Result:</h2>
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
} 