/**
 * 阿里云语音识别服务 - 修复版
 * 支持实时语音转文字
 */

import { getAliyunConfig } from './aliyunTTS'

interface ASRConfig {
  accessKeyId: string
  accessKeySecret: string
  appKey: string
  region?: string
}

// 获取阿里云配置
const getConfig = (): ASRConfig | null => {
  const config = getAliyunConfig()
  if (!config || !config.accessKeyId) return null
  
  return {
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    appKey: config.appKey,
    region: config.region || 'cn-shanghai',
  }
}

// 检查是否有ASR配置
export const hasASRConfig = (): boolean => {
  const config = getAliyunConfig()
  return !!(config && config.accessKeyId && config.accessKeySecret && config.appKey)
}

// 使用浏览器原生语音识别（作为fallback）
export const useBrowserASR = (
  onResult: (text: string, isFinal: boolean) => void,
  onError?: (error: string) => void
): {
  start: () => void
  stop: () => void
  isSupported: boolean
} => {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  
  if (!SpeechRecognition) {
    console.log('浏览器不支持语音识别')
    return {
      start: () => {},
      stop: () => {},
      isSupported: false,
    }
  }
  
  const recognition = new SpeechRecognition()
  recognition.lang = 'zh-CN'
  recognition.continuous = true
  recognition.interimResults = true
  
  recognition.onresult = (event: any) => {
    let finalTranscript = ''
    let interimTranscript = ''
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript
      if (event.results[i].isFinal) {
        finalTranscript += transcript
      } else {
        interimTranscript += transcript
      }
    }
    
    if (finalTranscript) {
      onResult(finalTranscript, true)
    } else if (interimTranscript) {
      onResult(interimTranscript, false)
    }
  }
  
  recognition.onerror = (event: any) => {
    console.error('语音识别错误:', event.error)
    if (onError) onError(event.error)
  }
  
  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
    isSupported: true,
  }
}

// 将音频缓冲区转换为WAV格式
function bufferToWav(abuffer: AudioBuffer, len: number): Blob {
  let numOfChan = abuffer.numberOfChannels
  let length = len * numOfChan * 2 + 44
  let buffer = new ArrayBuffer(length)
  let view = new DataView(buffer)
  let channels: Float32Array[] = []
  let i: number
  let sample: number
  let offset = 0
  let pos = 0

  // 写入WAV头部
  setUint32(0x46464952) // "RIFF"
  setUint32(length - 8) // 文件长度-8
  setUint32(0x45564157) // "WAVE"
  setUint32(0x20746d66) // "fmt " chunk
  setUint32(16) // 长度 = 16
  setUint16(1) // PCM (无压缩)
  setUint16(numOfChan)
  setUint32(abuffer.sampleRate)
  setUint32(abuffer.sampleRate * 2 * numOfChan) // 平均字节率
  setUint16(numOfChan * 2) // 块对齐
  setUint16(16) // 每个样本的位数
  setUint32(0x61746164) // "data" - chunk
  setUint32(length - pos - 4) // 数据长度

  // 写入音频数据
  for (i = 0; i < abuffer.numberOfChannels; i++)
    channels.push(abuffer.getChannelData(i))

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]))
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0
      view.setInt16(pos, sample, true)
      pos += 2
    }
    offset++
  }

  return new Blob([buffer], { type: 'audio/wav' })

  function setUint16(data: number) {
    view.setUint16(pos, data, true)
    pos += 2
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true)
    pos += 4
  }
}

// 录音并发送到后端进行语音识别
export class AliyunASRService {
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private audioBuffer: AudioBuffer | null = null
  private isRecording = false
  private recordedChunks: Float32Array[] = []
  private sampleRate = 16000

  async startRecording(
    onResult: (text: string) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    try {
      console.log('[AliyunASR] 开始录音...')
      
      const config = getConfig()
      if (!config) {
        console.error('[AliyunASR] 未配置阿里云语音识别')
        if (onError) onError('未配置阿里云语音识别')
        return
      }

      // 获取麦克风权限
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: this.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      })
      console.log('[AliyunASR] 麦克风权限已获取')

      // 创建AudioContext
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate })
      const source = this.audioContext.createMediaStreamSource(this.mediaStream)
      
      // 创建脚本处理器来捕获音频数据
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1)
      this.recordedChunks = []
      
      processor.onaudioprocess = (e) => {
        if (this.isRecording) {
          const channelData = e.inputBuffer.getChannelData(0)
          this.recordedChunks.push(new Float32Array(channelData))
        }
      }
      
      source.connect(processor)
      processor.connect(this.audioContext.destination)
      
      this.isRecording = true
      console.log('[AliyunASR] 录音已启动')
      
      // 保存引用以便停止时使用
      ;(this as any).processor = processor
      ;(this as any).source = source
      
    } catch (error) {
      console.error('[AliyunASR] 启动录音失败:', error)
      if (onError) {
        onError('无法访问麦克风: ' + (error as Error).message)
      }
    }
  }

  stopRecording(): void {
    if (!this.isRecording) return
    
    this.isRecording = false
    console.log('[AliyunASR] 录音停止，开始处理...')
    
    // 断开连接
    if ((this as any).source) {
      (this as any).source.disconnect()
    }
    if ((this as any).processor) {
      (this as any).processor.disconnect()
    }
    
    // 停止麦克风
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
    }
    
    // 关闭AudioContext
    if (this.audioContext) {
      this.audioContext.close()
    }
  }

  async sendToASR(
    onResult: (text: string) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    const config = getConfig()
    if (!config) {
      console.error('[AliyunASR] 未配置阿里云语音识别')
      if (onError) onError('未配置阿里云语音识别')
      return
    }

    try {
      // 合并所有音频块
      const totalLength = this.recordedChunks.reduce((acc, chunk) => acc + chunk.length, 0)
      const mergedData = new Float32Array(totalLength)
      let offset = 0
      
      for (const chunk of this.recordedChunks) {
        mergedData.set(chunk, offset)
        offset += chunk.length
      }
      
      console.log('[AliyunASR] 音频数据长度:', mergedData.length)
      
      // 创建AudioBuffer
      const audioBuffer = new AudioBuffer({
        length: mergedData.length,
        numberOfChannels: 1,
        sampleRate: this.sampleRate,
      })
      audioBuffer.copyToChannel(mergedData, 0)
      
      // 转换为WAV
      const wavBlob = bufferToWav(audioBuffer, mergedData.length)
      console.log('[AliyunASR] WAV文件大小:', wavBlob.size, 'bytes')
      
      // 转换为base64
      const reader = new FileReader()
      reader.readAsDataURL(wavBlob)
      
      reader.onloadend = async () => {
        const base64Audio = reader.result as string
        console.log('[AliyunASR] 音频已转换为base64，长度:', base64Audio.length)
        
        // 发送到后端进行识别
        console.log('[AliyunASR] 发送请求到后端...')
        const response = await fetch('http://localhost:8000/api/v1/asr/recognize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audio: base64Audio,
            accessKeyId: config.accessKeyId,
            accessKeySecret: config.accessKeySecret,
            appKey: config.appKey,
            format: 'wav',
            sampleRate: 16000,
          }),
        })

        console.log('[AliyunASR] 收到响应，状态:', response.status)

        if (!response.ok) {
          throw new Error('语音识别请求失败: ' + response.status)
        }

        const result = await response.json()
        console.log('[AliyunASR] 识别结果:', result)
        
        if (result.success && result.data.text) {
          onResult(result.data.text)
        } else {
          if (onError) onError(result.message || '语音识别失败')
        }
      }
      
      reader.onerror = () => {
        if (onError) onError('音频转换失败')
      }
      
    } catch (error) {
      console.error('[AliyunASR] 识别失败:', error)
      if (onError) {
        onError('语音识别失败: ' + (error as Error).message)
      }
    }
  }
}

// 创建全局实例
export const aliyunASRService = new AliyunASRService()
