#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const toolDirectory = path.dirname(fileURLToPath(import.meta.url))
const languageDirectory = path.resolve(toolDirectory, '..', 'languages')
const sourcePath = path.join(languageDirectory, 'en_CA.json')
const targetPath = path.join(languageDirectory, 'zh.json')
const pendingPath = path.join(languageDirectory, 'zh.pending.json')

const source = JSON.parse(await fs.readFile(sourcePath, 'utf8'))

const glossary = {
  'Account': '账户',
  'Accounts': '账户',
  'Account Settings': '账户设置',
  'Admin': '管理员',
  'Alarm': '告警',
  'Alarms': '告警',
  'Archive': '归档',
  'Archived': '已归档',
  'Camera': '摄像机',
  'Camera is not recording': '摄像机未在录像',
  'Camera is not running': '摄像机未运行',
  'Camera is not streaming': '摄像机未在传输视频流',
  'Dashboard': '控制台',
  'Detector': '检测器',
  'Detection': '检测',
  'Disabled': '已禁用',
  'Event': '事件',
  'Events': '事件',
  'FileBin': '文件箱',
  'Live Grid': '实时画面',
  'Live View': '实时预览',
  'Log': '日志',
  'Logs': '日志',
  'Monitor': '监控',
  'Monitors': '监控',
  'Monitor Settings': '监控设置',
  'Motion': '移动侦测',
  'Motion Detection': '移动侦测',
  'Record': '录像',
  'Recording': '录像',
  'Recording Mode': '录像模式',
  'Save': '保存',
  'Settings': '设置',
  'Stream': '视频流',
  'Streaming': '视频流',
  'Timelapse': '延时摄影',
  'Video': '录像',
  'Videos': '录像',
  'Watch-Only': '仅观看',
  'Yes': '是',
  'No': '否',
  'On': '开启',
  'Off': '关闭',
  'Enabled': '已启用',
  'Delete': '删除',
  'Edit': '编辑',
  'Add': '添加',
  'Close': '关闭',
  'Open': '打开',
  'Search': '搜索',
  'Download': '下载',
  'Upload': '上传',
  'Username': '用户名',
  'Password': '密码',
  'Email': '电子邮箱',
  'Home': '首页',
  'System': '系统',
  'Network': '网络',
  'Storage': '存储',
  'Plugin': '插件',
  'Plugins': '插件',
  'Plugin Manager': '插件管理器',
  'Superuser': '超级管理员',
  'Sub-Account': '子账户',
  'Sub-Accounts': '子账户',
  'Authentication': '身份验证',
  '2-Factor Authentication': '双重身份验证',
  'Allow Next Discord Alert': '允许下一次 Discord 告警 <small>（分钟）</small>',
  'Allow Next Email': '允许下一封电子邮件 <small>（分钟）</small>',
  'Check Signal Interval': '信号检查间隔 <small>（分钟）</small>',
  'Rate': '帧率 <small>（FPS）</small>',
  'Recording Segment Interval': '录像分段间隔 <small>（分钟）</small>',
  'Retry Connection': '重试连接 <small>允许失败的次数</small>',
  'HowToConnectDes1': "<b>此功能仅供移动许可证订阅者使用。</b>如需获取 API 密钥，请登录 <a href='https://licenses.shinobi.video/login' target='_blank'>Shinobi <b>商店</b></a>，并创建一个与<b>任意有效订阅 ID</b> 关联的密钥。<a href='https://hub.shinobi.video/articles/view/3Yhivc6djTtuBPE' target='_blank'>了解更多。</a>",
  'HowToConnectDes2': "如需使用私有（专用）P2P 服务器，请在 <a href='https://licenses.shinobi.video/login' target='_blank'>Shinobi <b>商店</b></a>创建账户，然后通过在线聊天联系我们。",
  'Current': '当前',
  'Current Version': '当前版本',
  'CPU': 'CPU',
  'RAM': '内存',
  'Shinobi': 'Shinobi',
  'ONVIF': 'ONVIF',
  'RTSP': 'RTSP',
  'RTMP': 'RTMP',
  'HTTP': 'HTTP',
  'HTTPS': 'HTTPS',
  'WebDAV': 'WebDAV',
  'FFmpeg': 'FFmpeg',
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

function translatedTextFromResponse(payload) {
  if (!Array.isArray(payload?.[0])) throw new Error('Unexpected Google Translate response')
  return payload[0].map((part) => part?.[0] || '').join('')
}

async function requestTranslation(markup, attempt = 1) {
  const query = new URLSearchParams({
    client: 'gtx',
    sl: 'en',
    tl: 'zh-CN',
    dt: 't',
    q: markup,
  })
  try {
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?${query}`, {
      headers: { 'user-agent': 'Shinobi-zh-CN-language-maintainer/1.0' },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return translatedTextFromResponse(await response.json())
  } catch (error) {
    if (attempt >= 5) throw error
    await sleep(1000 * 2 ** (attempt - 1))
    return requestTranslation(markup, attempt + 1)
  }
}

function buildBatches(entries, maximumCharacters = 3200) {
  const batches = []
  let batch = []
  let length = 0
  for (const entry of entries) {
    const markup = `<x id="${entry.index}">${entry.value}</x>`
    if (batch.length && length + markup.length > maximumCharacters) {
      batches.push(batch)
      batch = []
      length = 0
    }
    batch.push({ ...entry, markup })
    length += markup.length
  }
  if (batch.length) batches.push(batch)
  return batches
}

function parseBatch(markup, batch) {
  const values = new Map()
  const expression = /<x\s+id=["']?(\d+)["']?>([\s\S]*?)<\/x>/g
  for (const match of markup.matchAll(expression)) values.set(Number(match[1]), match[2])
  if (values.size !== batch.length) {
    throw new Error(`Expected ${batch.length} translated values, received ${values.size}`)
  }
  return values
}

const entries = Object.entries(source).map(([key, value], index) => ({ key, value, index }))
const batches = buildBatches(entries)
const translated = {}

for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
  const batch = batches[batchIndex]
  const markup = batch.map((entry) => entry.markup).join('')
  const translatedMarkup = await requestTranslation(markup)
  const values = parseBatch(translatedMarkup, batch)
  for (const entry of batch) translated[entry.key] = values.get(entry.index)
  await fs.writeFile(pendingPath, `${JSON.stringify(translated, null, 2)}\n`)
  process.stdout.write(`\rTranslated ${Object.keys(translated).length}/${entries.length}`)
  await sleep(250)
}

for (const key of Object.keys(translated)) {
  translated[key] = translated[key]
    .replaceAll('帐户', '账户')
    .replaceAll('监视器', '监控')
    .replaceAll('摄像头', '摄像机')
    .replaceAll('仪表板', '控制台')
    .replaceAll('运动检测', '移动侦测')
}

for (const [key, value] of Object.entries(glossary)) {
  if (Object.hasOwn(source, key)) translated[key] = value
}

const ordered = Object.fromEntries(Object.keys(source).sort().map((key) => [key, translated[key]]))
const missing = Object.keys(source).filter((key) => typeof ordered[key] !== 'string' || ordered[key] === '')
if (missing.length) throw new Error(`Missing translations: ${missing.join(', ')}`)

await fs.writeFile(targetPath, `${JSON.stringify(ordered, null, 2)}\n`)
await fs.rm(pendingPath, { force: true })
console.log(`\nWrote ${Object.keys(ordered).length} translations to ${targetPath}`)
