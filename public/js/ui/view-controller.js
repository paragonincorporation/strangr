import { ModalController } from './modal-controller.js'
import { ChatPanel } from './chat-panel.js'
import { VideoTiles } from './video-tiles.js'
import { StatusPill } from './status-pill.js'

export class ViewController {
  constructor(root = document) {
    this.root = root
    this.views = new Map([...root.querySelectorAll('[data-view]')].map((view) => [view.dataset.view, view]))
    this.modals = new ModalController(root)
    this.chat = new ChatPanel(root)
    this.videos = new VideoTiles(root)
    this.status = new StatusPill(root)
    this.room = this.views.get('room')
    this.notice = root.querySelector('[data-room-notice]')
    this.toastElement = root.querySelector('[data-toast]')
    this.toastTimer = null
  }

  show(name) {
    for (const [viewName, view] of this.views) {
      view.classList.toggle('is-active', viewName === name)
      view.classList.remove('is-entering')
    }
    const next = this.views.get(name)
    next?.classList.add('is-entering')
  }

  matching(stage, mode = 'video') {
    const stages = {
      media: ['01', 'Checking camera and mic'],
      socket: ['02', 'Opening a private channel'],
      queued: ['03', 'Scanning for someone new'],
      pairing: ['04', 'Locking in the connection'],
    }
    const [number, label] = stages[stage] || stages.queued
    this.root.querySelector('[data-match-step-number]').textContent = number
    this.root.querySelector('[data-match-status]').textContent = label
    this.root.querySelector('[data-match-mode]').textContent = mode === 'video' ? 'Video ready' : 'Text-only mode'
  }

  waitTime(text) {
    this.root.querySelector('[data-wait-time]').textContent = text
  }

  enterRoom(mode) {
    this.show('room')
    this.room.classList.toggle('room--text', mode === 'text')
    this.room.classList.add('is-match-hit')
    setTimeout(() => this.room.classList.remove('is-match-hit'), 400)
    this.chat.reset()
    const chatOpen = this.chat.toggle(mode === 'text' || !window.matchMedia('(max-width: 980px)').matches)
    this.root.querySelector('[data-chat-count]').textContent = chatOpen ? 'OPEN' : 'CLOSED'
    this.videos.setTextMode(mode === 'text')
    this.root.querySelector('[data-peer-media]').textContent = mode === 'text' ? 'TEXT ONLY' : 'CAMERA ON'
    this.hideNotice()
    this.status.set(mode === 'text' ? 'Text connected' : 'Linking video', mode === 'text' ? 'connected' : 'waiting')
  }

  showNotice({ title, copy, countdown = '', canWait = true }) {
    this.root.querySelector('[data-notice-title]').textContent = title
    this.root.querySelector('[data-notice-copy]').textContent = copy
    this.root.querySelector('[data-reconnect-countdown]').textContent = countdown
    this.root.querySelector('[data-action="notice-wait"]').hidden = !canWait
    this.notice.hidden = false
  }

  updateCountdown(text) {
    this.root.querySelector('[data-reconnect-countdown]').textContent = text
  }

  hideNotice() {
    this.notice.hidden = true
  }

  updateMedia({ audio, video }) {
    this.root.querySelector('[data-audio-label]').textContent = audio ? 'ON' : 'OFF'
    this.root.querySelector('[data-video-label]').textContent = video ? 'ON' : 'OFF'
    this.root.querySelector('[data-local-media]').textContent = video ? 'LIVE' : 'CAM OFF'
    this.root.querySelector('[data-action="toggle-audio"]').setAttribute('aria-pressed', String(!audio))
    this.root.querySelector('[data-action="toggle-video"]').setAttribute('aria-pressed', String(!video))
    this.videos.localEmpty.hidden = video
  }

  toast(message) {
    clearTimeout(this.toastTimer)
    this.toastElement.textContent = message
    this.toastElement.hidden = false
    this.toastTimer = setTimeout(() => { this.toastElement.hidden = true }, 3600)
  }
}
