export async function triggerN8nWorkflow(workflowData) {
  try {
    const response = await fetch(process.env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.N8N_API_KEY}`
      },
      body: JSON.stringify(workflowData)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return {
      success: true,
      data
    }
  } catch (error) {
    console.error('Error triggering n8n workflow:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

export async function scheduleAutomatedLearning(userId, conceptId) {
  return triggerN8nWorkflow({
    type: 'schedule_learning',
    userId,
    conceptId,
    timestamp: new Date().toISOString()
  })
}

export async function generateLearningMaterials(concept, difficulty) {
  return triggerN8nWorkflow({
    type: 'generate_materials',
    concept,
    difficulty,
    timestamp: new Date().toISOString()
  })
}

export async function trackUserProgress(userId, progress) {
  return triggerN8nWorkflow({
    type: 'track_progress',
    userId,
    progress,
    timestamp: new Date().toISOString()
  })
} 