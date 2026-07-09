const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const https = require('node:https')
const net = require('node:net')

// 通过 window 对象向渲染进程注入 nodejs 能力
window.services = {
  // 读文件
  readFile (file) {
    return fs.readFileSync(file, { encoding: 'utf-8' })
  }
}

// ============================================================
// 【新增功能 8】服务连通性检测 —— Node 探测能力注入
// 只新增 probe，不改动上方 readFile。组件渲染层通过 window.healthServices.probe 调用，
// 绕过浏览器 CORS 限制，不使用 fetch / XMLHttpRequest。
// ============================================================

// 地址解析：把任意 url 转为 { host, port, protocol, isHttp }，无协议时补 http://
const parseProbeTarget = (rawUrl) => {
  let s = String(rawUrl || '').trim()
  if (!s) return null
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s)) s = 'http://' + s
  let u
  try { u = new URL(s) } catch (e) { return null }
  const host = u.hostname
  if (!host) return null
  let port = u.port
  if (!port) {
    if (u.protocol === 'https:') port = '443'
    else if (u.protocol === 'http:') port = '80'
    else port = '80'
  }
  return { host, port: Number(port), protocol: u.protocol, isHttp: u.protocol === 'http:' || u.protocol === 'https:' }
}

const isTlsCertificateError = (err) => {
  const code = err && err.code
  return code === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
    code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
    code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
    code === 'CERT_HAS_EXPIRED' ||
    code === 'ERR_TLS_CERT_ALTNAME_INVALID'
}

const resolveHttpStatus = (statusCode) => {
  const code = Number(statusCode)
  if (code === 408 || code === 504) return { status: 'timeout', httpStatus: code, errorMsg: `HTTP ${code}` }
  if (code >= 500) return { status: 'offline', httpStatus: code, errorMsg: `HTTP ${code}` }
  return { status: 'online', httpStatus: code, errorMsg: '' }
}

// 单次探测。返回 { status, latency, httpStatus, errorMsg }
// status: 'online' | 'offline' | 'timeout' | 'unknown'
const probeEndpoint = (rawUrl, strategy, timeout) => {
  return new Promise((resolve) => {
    const target = parseProbeTarget(rawUrl)
    if (!target) { resolve({ status: 'unknown', latency: null, httpStatus: null, errorMsg: '地址无效' }); return }
    const useHttp = strategy === 'http' || (strategy === 'auto' && target.isHttp)
    if (useHttp) {
      const lib = target.protocol === 'https:' ? https : http
      const started = Date.now()
      let done = false
      const finish = (r) => { if (done) return; done = true; r.latency = Date.now() - started; resolve(r) }
      const runGetFallback = () => {
        try {
          const req2 = lib.request({ method: 'GET', hostname: target.host, port: target.port, path: '/', timeout: timeout }, (res2) => {
            res2.resume()
            finish(resolveHttpStatus(res2.statusCode))
          })
          req2.on('error', (err2) => {
            if (isTlsCertificateError(err2)) finish({ status: 'online', httpStatus: null, errorMsg: String(err2.code || 'TLS_CERT_ERROR') })
            else finish({ status: 'offline', httpStatus: null, errorMsg: String((err2 && err2.code) || (err2 && err2.message) || 'GET_ERROR') })
          })
          req2.on('timeout', () => { req2.destroy(); finish({ status: 'timeout', httpStatus: null, errorMsg: 'timeout' }) })
          req2.end()
        } catch (e2) {
          finish({ status: 'offline', httpStatus: null, errorMsg: String((e2 && e2.message) || e2) })
        }
      }
      let req
      try {
        req = lib.request({
          method: 'HEAD',
          hostname: target.host,
          port: target.port,
          path: '/',
          timeout: timeout,
          headers: { 'User-Agent': 'utools-healthcheck/1.0' }
        }, (res) => {
          res.resume()
          if (res.statusCode === 405) { runGetFallback(); return }
          finish(resolveHttpStatus(res.statusCode))
        })
      } catch (e) {
        finish({ status: 'offline', httpStatus: null, errorMsg: String((e && e.message) || e) })
        return
      }
      req.on('error', (err) => {
        if (isTlsCertificateError(err)) {
          finish({ status: 'online', httpStatus: null, errorMsg: String(err.code || 'TLS_CERT_ERROR') })
        } else if (err && err.code === 'ECONNREFUSED') {
          finish({ status: 'offline', httpStatus: null, errorMsg: 'ECONNREFUSED' })
        } else if (err && (err.code === 'ECONNRESET' || err.code === 'EPIPE')) {
          runGetFallback()
        } else {
          finish({ status: 'offline', httpStatus: null, errorMsg: String((err && err.code) || (err && err.message) || err) })
        }
      })
      req.on('timeout', () => { req.destroy(); finish({ status: 'timeout', httpStatus: null, errorMsg: 'timeout' }) })
      req.end()
    } else {
      // TCP 端口连接探测
      const started = Date.now()
      let done = false
      const finish = (r) => { if (done) return; done = true; r.latency = Date.now() - started; resolve(r) }
      try {
        const socket = new net.Socket()
        socket.setTimeout(timeout)
        socket.once('connect', () => { socket.destroy(); finish({ status: 'online', httpStatus: null, errorMsg: '' }) })
        socket.once('error', (err) => {
          if (err && err.code === 'ECONNREFUSED') finish({ status: 'offline', httpStatus: null, errorMsg: 'ECONNREFUSED' })
          else if (err && (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN')) finish({ status: 'offline', httpStatus: null, errorMsg: '域名解析失败' })
          else finish({ status: 'offline', httpStatus: null, errorMsg: String((err && err.code) || err) })
        })
        socket.once('timeout', () => { socket.destroy(); finish({ status: 'timeout', httpStatus: null, errorMsg: 'timeout' }) })
        socket.connect(target.port, target.host)
      } catch (e) {
        finish({ status: 'offline', httpStatus: null, errorMsg: String((e && e.message) || e) })
      }
    }
  })
}

// 暴露给渲染层：opts = { url, strategy, timeout }
window.healthServices = {
  probe (opts) {
    const url = (opts && opts.url) || ''
    const strategy = (opts && opts.strategy) || 'auto'
    const timeout = Number((opts && opts.timeout) || 5000)
    return probeEndpoint(url, strategy, timeout)
  },
  available: true
}
