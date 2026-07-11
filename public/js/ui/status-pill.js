export class StatusPill {
  constructor(root) {
    this.root = root.querySelector('[data-connection-pill]')
    this.label = root.querySelector('[data-connection-label]')
  }

  set(label, tone = 'waiting') {
    this.label.textContent = label
    this.root.dataset.tone = tone
  }
}
