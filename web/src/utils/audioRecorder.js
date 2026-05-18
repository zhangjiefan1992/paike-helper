export function createAudioRecorder() {
  let stream = null
  let audioContext = null
  let processor = null
  let source = null
  let chunks = []
  let recording = false
  let startTime = 0
  let durationTimer = null
  let onDurationChange = null

  function float32ToInt16(float32Array) {
    const int16 = new Int16Array(float32Array.length)
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }
    return int16
  }

  function downsampleBuffer(buffer, inputRate, outputRate) {
    if (inputRate === outputRate) return buffer
    const ratio = inputRate / outputRate
    const newLength = Math.round(buffer.length / ratio)
    const result = new Float32Array(newLength)
    for (let i = 0; i < newLength; i++) {
      const idx = Math.round(i * ratio)
      result[i] = buffer[idx] || 0
    }
    return result
  }

  function encodeWAV(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2)
    const view = new DataView(buffer)

    function writeString(offset, str) {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + samples.length * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, samples.length * 2, true)

    const offset = 44
    for (let i = 0; i < samples.length; i++) {
      view.setInt16(offset + i * 2, samples[i], true)
    }

    return new Blob([buffer], { type: 'audio/wav' })
  }

  async function start() {
    if (recording) return

    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, sampleRate: 16000 }
    })

    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 })
    source = audioContext.createMediaStreamSource(stream)

    const bufferSize = 4096
    processor = audioContext.createScriptProcessor(bufferSize, 1, 1)
    chunks = []

    processor.onaudioprocess = (e) => {
      if (!recording) return
      const input = e.inputBuffer.getChannelData(0)
      chunks.push(new Float32Array(input))
    }

    source.connect(processor)
    processor.connect(audioContext.destination)

    recording = true
    startTime = Date.now()

    durationTimer = setInterval(() => {
      if (onDurationChange) {
        onDurationChange(Math.floor((Date.now() - startTime) / 1000))
      }
    }, 500)
  }

  function stop() {
    if (!recording) return Promise.resolve(null)

    recording = false
    clearInterval(durationTimer)

    if (processor) {
      processor.disconnect()
      processor = null
    }
    if (source) {
      source.disconnect()
      source = null
    }
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
      stream = null
    }

    if (chunks.length === 0) return Promise.resolve(null)

    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0)
    const merged = new Float32Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      merged.set(chunk, offset)
      offset += chunk.length
    }

    const downsampled = downsampleBuffer(merged, 16000, 16000)
    const int16 = float32ToInt16(downsampled)
    const blob = encodeWAV(int16, 16000)
    chunks = []

    return Promise.resolve(blob)
  }

  function destroy() {
    if (recording) stop()
  }

  function setOnDurationChange(cb) {
    onDurationChange = cb
  }

  return {
    start,
    stop,
    destroy,
    setOnDurationChange,
    get isRecording() { return recording },
    get duration() { return recording ? Math.floor((Date.now() - startTime) / 1000) : 0 }
  }
}
