export class ChatPanel {
  constructor(root) {
    this.root = root.querySelector("[data-chat-panel]");
    this.messages = root.querySelector("[data-chat-messages]");
    this.typing = root.querySelector("[data-typing]");
    this.input = root.querySelector("[data-chat-input]");
    this.isOpen = true;
  }

  toggle(force) {
    this.isOpen = typeof force === "boolean" ? force : !this.isOpen;
    this.root.classList.toggle("is-open", this.isOpen);
    return this.isOpen;
  }

  reset() {
    this.messages.replaceChildren();
    const status = document.createElement("p");
    status.className = "system-message";
    status.textContent = "You’re connected. Say something real.";
    this.messages.append(status);
    this.input.value = "";
    this.setTyping(false);
  }

  addMessage(text, own = false) {
    const bubble = document.createElement("p");
    bubble.className = `chat-bubble${own ? " chat-bubble--you" : ""}`;
    bubble.textContent = text;
    this.messages.append(bubble);
    this.messages.scrollTop = this.messages.scrollHeight;
  }

  addStatus(text) {
    const status = document.createElement("p");
    status.className = "system-message";
    status.textContent = text;
    this.messages.append(status);
    this.messages.scrollTop = this.messages.scrollHeight;
  }

  setTyping(typing) {
    this.typing.hidden = !typing;
  }
}
