let handler: () => void = () => {};

export function setSessionExpiredHandler(next: () => void) {
  handler = next;
}

export function notifySessionExpired() {
  handler();
}
