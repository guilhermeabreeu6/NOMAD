export interface Announcer {
  announce(message: string): void;
}

/** Região aria-live="polite" compartilhada. */
export function createAnnouncer(el: HTMLElement): Announcer {
  let timer: number | undefined;
  return {
    announce(message: string): void {
      el.textContent = '';
      window.clearTimeout(timer);
      // pequeno atraso para leitores de tela perceberem a mudança
      timer = window.setTimeout(() => {
        el.textContent = message;
      }, 50);
    },
  };
}
