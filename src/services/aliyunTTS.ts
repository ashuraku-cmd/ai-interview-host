// 阿里云语音合成服务

import { getAliyunConfig as getConfigFromFile } from './aliyunConfig'

// 阿里云配置类型
interface AliyunConfig {
  accessKeyId: string
  accessKeySecret: string
  appKey: string
  region: string
}

// 语音合成参数
interface TTSParams {
  text: string
  voice?: string // 发音人
  format?: string // 音频格式
  sampleRate?: number // 采样率
  volume?: number // 音量 0-100
  speechRate?: number // 语速 -500~500
  pitchRate?: number // 音调 -500~500
}

// 默认发音人列表
export const VOICE_OPTIONS = [
  { value: 'xiaoyun', label: '小云（标准女声）' },
  { value: 'xiaogang', label: '小刚（标准男声）' },
  { value: 'ruoxi', label: '若兮（温柔女声）' },
  { value: 'siqi', label: '思琪（温柔女声）' },
  { value: 'sijia', label: '思佳（标准女声）' },
  { value: 'sicheng', label: '思诚（标准男声）' },
  { value: 'aiqi', label: '艾琪（温柔女声）' },
  { value: 'aijia', label: '艾佳（标准女声）' },
  { value: 'aicheng', label: '艾诚（标准男声）' },
  { value: 'aida', label: '艾达（标准男声）' },
  { value: 'ninger', label: '宁儿（标准女声）' },
  { value: 'ruilin', label: '瑞琳（标准女声）' },
]

// 当前播放的音频
let currentAudio: HTMLAudioElement | null = null
let currentUtterance: SpeechSynthesisUtterance | null = null

// 获取阿里云配置（localStorage优先于配置文件，支持覆盖）
export const getAliyunConfig = (): (AliyunConfig & { voice?: string; speechRate?: number }) | null => {
  // 先获取配置文件
  let configFromFile: any = null
  try {
    configFromFile = getConfigFromFile()
  } catch (e) {
    // 配置文件不存在
  }

  // 从localStorage获取用户自定义配置
  const configFromStorage = localStorage.getItem('aliyun_tts_config')
  let configFromLocal: any = null
  if (configFromStorage) {
    try {
      configFromLocal = JSON.parse(configFromStorage)
    } catch (e) {
      console.error('解析localStorage配置失败:', e)
    }
  }

  // 合并配置：localStorage > 配置文件
  if (configFromLocal || configFromFile) {
    return {
      ...configFromFile,
      ...configFromLocal,
    }
  }

  return null
}

// 保存阿里云配置
export const saveAliyunConfig = (config: AliyunConfig & { voice?: string; speechRate?: number }) => {
  localStorage.setItem('aliyun_tts_config', JSON.stringify(config))
}

// 获取阿里云配置
export const getAliyunTTSConfig = (): (AliyunConfig & { voice?: string; speechRate?: number }) | null => {
  return getAliyunConfig()
}

// 使用浏览器原生语音合成
export const useBrowserTTS = (text: string, voiceName?: string, speechRate: number = 1.2): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('浏览器不支持语音合成'))
      return
    }

    // 停止之前的播放
    stopSpeaking()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = speechRate // 使用传入的语速
    utterance.pitch = 1.0
    utterance.volume = 1.0

    // 尝试使用中文语音
    const voices = window.speechSynthesis.getVoices()

    // 根据voiceName选择声音
    let selectedVoice: SpeechSynthesisVoice | undefined

    if (voiceName) {
      // 尝试匹配声音名称
      // 浏览器中文语音有限，优先使用中文语音
      selectedVoice = voices.find(
        (voice) => voice.lang.includes('zh') || voice.lang.includes('cmn')
      )
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice
    }

    utterance.onend = () => {
      currentUtterance = null
      resolve()
    }
    utterance.onerror = (e) => {
      console.error('语音播放错误:', e)
      currentUtterance = null
      reject(new Error('语音播放失败'))
    }

    currentUtterance = utterance
    window.speechSynthesis.speak(utterance)
  })
}

// 播放音频
export const playAudio = (audioData: ArrayBuffer): Promise<void> => {
  return new Promise((resolve, reject) => {
    const blob = new Blob([audioData], { type: 'audio/mp3' })
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)

    audio.onended = () => {
      URL.revokeObjectURL(url)
      resolve()
    }

    audio.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('音频播放失败'))
    }

    audio.play()
  })
}

// 调用后端TTS API
const synthesizeSpeechFromBackend = async (params: {
  text: string
  voice: string
  speechRate: number
  volume: number
  pitchRate: number
}): Promise<ArrayBuffer | null> => {
  const config = getAliyunConfig()
  if (!config) return null

  console.log('调用后端TTS API:', {
    voice: params.voice,
    speechRate: params.speechRate,
  })

  try {
    const response = await fetch('http://localhost:8000/api/v1/tts/synthesize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: params.text,
        accessKeyId: config.accessKeyId,
        accessKeySecret: config.accessKeySecret,
        appKey: config.appKey,
        region: config.region,
        voice: params.voice,
        speech_rate: Math.round((params.speechRate - 1) * 500), // 转换为阿里云参数
        pitch_rate: params.pitchRate,
        volume: params.volume,
        format: 'mp3',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('TTS请求失败:', response.status, errorText)
      throw new Error(`TTS请求失败: ${response.status}`)
    }

    return await response.arrayBuffer()
  } catch (error) {
    console.error('TTS API调用失败:', error)
    throw error
  }
}

// 主语音合成函数
export const speak = async (
  text: string,
  options?: Partial<TTSParams>
): Promise<void> => {
  const config = getAliyunConfig()
  // 使用配置中的发音人和语速，如果没有则使用默认值
  const voice = options?.voice || config?.voice || 'xiaoyun'
  const speechRate = options?.speechRate || config?.speechRate || 1.2

  console.log('语音合成:', { voice, speechRate, text: text.substring(0, 50) })

  // 如果有阿里云配置，尝试使用后端TTS API
  if (config && config.accessKeyId) {
    try {
      const audioData = await synthesizeSpeechFromBackend({
        text,
        voice,
        speechRate,
        volume: options?.volume || 50,
        pitchRate: options?.pitchRate || 0,
      })

      if (audioData && audioData.byteLength > 0) {
        console.log('使用阿里云TTS播放')
        await playAudio(audioData)
        return
      }
    } catch (error) {
      console.warn('阿里云TTS失败，使用浏览器原生:', error)
    }
  }

  // Fallback到浏览器原生TTS
  console.log('使用浏览器原生TTS播放')
  await useBrowserTTS(text, voice, speechRate)
}

// 停止播放
export const stopSpeaking = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  currentUtterance = null
}

// 检查是否有配置
export const hasAliyunConfig = (): boolean => {
  return getAliyunConfig() !== null
}

// 预加载语音列表
export const loadVoices = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      resolve(voices)
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        resolve(window.speechSynthesis.getVoices())
      }
    }
  })
}
