export function getMousePosition(dom: HTMLElement, x: number, y: number): [number, number] {
  const rect = dom.getBoundingClientRect()
  return [x - rect.left, y - rect.top]
}
