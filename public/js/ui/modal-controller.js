export class ModalController {
  constructor(root = document) {
    this.modals = new Map(
      [...root.querySelectorAll("[data-modal]")].map((modal) => [
        modal.dataset.modal,
        modal,
      ]),
    );
  }

  open(name) {
    const modal = this.modals.get(name);
    if (modal && !modal.open) modal.showModal();
  }

  close(name) {
    const modal = this.modals.get(name);
    if (modal?.open) modal.close();
  }
}
