// 阿里云语音合成配置
// 请从环境变量或本地配置文件读取敏感信息

// 从localStorage读取配置，如果没有则使用空值
const getStoredConfig = () => {
  const stored = localStorage.getItem('aliyun_config')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (e) {
      console.error('解析阿里云配置失败:', e)
    }
  }
  return null
}

const storedConfig = getStoredConfig()

export const ALIYUN_CONFIG = {
  accessKeyId: storedConfig?.accessKeyId || '',
  accessKeySecret: storedConfig?.accessKeySecret || '',
  appKey: storedConfig?.appKey || '',
  region: storedConfig?.region || 'cn-shanghai',
  voice: storedConfig?.voice || 'xiaoyun',
}

// 保存配置到localStorage
export const saveAliyunConfig = (config: {
  accessKeyId: string
  accessKeySecret: string
  appKey: string
  region?: string
  voice?: string
}) => {
  localStorage.setItem('aliyun_config', JSON.stringify({
    ...ALIYUN_CONFIG,
    ...config
  }))
  // 更新当前配置
  Object.assign(ALIYUN_CONFIG, config)
}

// 导出配置
export const getAliyunConfig = () => ALIYUN_CONFIG

// 可选发音人列表说明：
// xiaoyun - 小云（标准女声，默认）
// xiaogang - 小刚（标准男声）
// ruoxi - 若兮（温柔女声）
// siqi - 思琪（温柔女声）
// sijia - 思佳（标准女声）
// sicheng - 思诚（标准男声）
// aiqi - 艾琪（温柔女声）
// aijia - 艾佳（标准女声）
// aicheng - 艾诚（标准男声）
// aida - 艾达（标准男声）
// ninger - 宁儿（标准女声）
// ruilin - 瑞琳（标准女声）
