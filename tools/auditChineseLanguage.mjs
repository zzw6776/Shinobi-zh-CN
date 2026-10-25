#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const toolDirectory = path.dirname(fileURLToPath(import.meta.url))
const languageDirectory = path.resolve(toolDirectory, '..', 'languages')
const source = JSON.parse(await fs.readFile(path.join(languageDirectory, 'en_CA.json'), 'utf8'))
const target = JSON.parse(await fs.readFile(path.join(languageDirectory, 'zh.json'), 'utf8'))

const errors = []
const warnings = []

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right))
}

function sameMultiset(left, right) {
  return JSON.stringify(sorted(left)) === JSON.stringify(sorted(right))
}

function collect(text, expression, transform = (match) => match[0]) {
  return [...text.matchAll(expression)].map(transform)
}

function htmlTags(text) {
  return collect(text, /<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi, (match) => `${match[0][1] === '/' ? '/' : ''}${match[1].toLowerCase()}`)
}

function htmlAttributes(text, attribute) {
  const expression = new RegExp(`\\b${attribute}=(['"])(.*?)\\1`, 'gi')
  return collect(text, expression, (match) => match[2].replace(/https:\s+\/\//gi, 'https://'))
}

function placeholders(text) {
  return collect(text, /\{\{[^{}]+\}\}|(?<!\{)\{[A-Za-z_][^{}]*\}(?!\})|\$\{[^{}]+\}|%[sdif]/g)
}

function codeBlocks(text) {
  return collect(text, /<code\b[^>]*>([\s\S]*?)<\/code>/gi, (match) => match[1].trim())
}

const sourceKeys = Object.keys(source)
const targetKeys = Object.keys(target)
const missingKeys = sourceKeys.filter((key) => !Object.hasOwn(target, key))
const extraKeys = targetKeys.filter((key) => !Object.hasOwn(source, key))
if (missingKeys.length) errors.push(`缺少 ${missingKeys.length} 个词条：${missingKeys.join(', ')}`)
if (extraKeys.length) errors.push(`多出 ${extraKeys.length} 个词条：${extraKeys.join(', ')}`)

for (const key of sourceKeys) {
  const english = source[key]
  const chinese = target[key]
  if (typeof chinese !== 'string' || !chinese.trim()) {
    errors.push(`${key}: 译文为空或不是字符串`)
    continue
  }
  if (!sameMultiset(htmlTags(english), htmlTags(chinese))) errors.push(`${key}: HTML 标签与英文原文不一致`)
  if (!sameMultiset(placeholders(english), placeholders(chinese))) errors.push(`${key}: 变量占位符与英文原文不一致`)
  if (!sameMultiset(htmlAttributes(english, 'class'), htmlAttributes(chinese, 'class'))) errors.push(`${key}: HTML class 属性与英文原文不一致`)
  if (!sameMultiset(htmlAttributes(english, 'href'), htmlAttributes(chinese, 'href'))) errors.push(`${key}: 链接地址与英文原文不一致`)
  if (!sameMultiset(codeBlocks(english), codeBlocks(chinese))) errors.push(`${key}: <code> 中的技术内容与英文原文不一致`)
}

const forbidden = [
  ['忍者', 'Shinobi 品牌名被错误翻译'],
  ['不和谐', 'Discord 品牌名被错误翻译'],
  ['禁止行动', 'No Motion 被错误翻译'],
  ['视频流媒体', 'Stream 术语不统一'],
  ['最大无差异', 'Max Indifference 旧术语被直译'],
  ['最小无差异', 'Indifference 旧术语被直译'],
  ['Timstamp', 'Timestamp 未翻译'],
  ['<小>', 'HTML small 标签被翻译'],
  ['undefined', '出现异常 undefined 文本'],
  ['null', '出现异常 null 文本'],
]

for (const [needle, reason] of forbidden) {
  for (const [key, value] of Object.entries(target)) {
    if (value.includes(needle)) errors.push(`${key}: ${reason}（${needle}）`)
  }
}

const requiredValues = {
  'Dashboard': '控制台',
  'Live Grid': '实时画面',
  'Monitor': '监控',
  'Monitor Settings': '监控设置',
  'Motion Detection': '移动侦测',
  'Recording': '录像',
  'Videos': '录像',
  'Event': '事件',
  'Archive': '归档',
  'Account Settings': '账户设置',
  'Substream': '子码流',
  'Indifference': '灵敏度阈值',
  'Max Indifference': '最大灵敏度阈值',
  'Shinobi': 'Shinobi',
}

for (const [key, expected] of Object.entries(requiredValues)) {
  if (target[key] !== expected) errors.push(`${key}: 核心术语应为“${expected}”，实际为“${target[key]}”`)
}

const naturalEnglish = /\b(the|this|that|with|from|your|when|where|only|failed|error|settings|monitor|camera|video|stream|recording|please|cannot|enable|disable|save|delete|account|server)\b/i
for (const [key, value] of Object.entries(target)) {
  const visible = value.replace(/<[^>]*>/g, ' ').replace(/https?:\/\/\S+/g, ' ')
  if (!/[\u3400-\u9fff]/.test(visible) && naturalEnglish.test(visible)) warnings.push(`${key}: 可能仍有未翻译的自然语言（${visible.trim()}）`)
}

if (warnings.length) {
  console.warn(`警告 ${warnings.length} 项：`)
  for (const warning of warnings) console.warn(`- ${warning}`)
}

if (errors.length) {
  console.error(`审计失败，共 ${errors.length} 项：`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`审计通过：${sourceKeys.length} 个词条完整，HTML、链接、代码片段、变量和核心术语均符合要求。`)
