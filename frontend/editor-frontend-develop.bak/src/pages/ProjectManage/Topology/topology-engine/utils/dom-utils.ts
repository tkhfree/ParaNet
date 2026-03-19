export const getMousePosition = (dom: HTMLElement, x: number, y: number) => {
  const rect = dom.getBoundingClientRect()
  return [x - rect.left, y - rect.top]
}

export const getAbsolutePosition = (dom: HTMLElement, x: number, y: number) => {
  const { offsetWidth, offsetHeight } = dom
  return [x * offsetWidth, y * offsetHeight]
}

export const isLeftMouseDown = (event: MouseEvent) => {
  return event.button === 0 && event.buttons === 1
}

export const isLeftMouseUp = (event: MouseEvent) => {
  return event.button === 0 && event.buttons === 0
}

export const isRightMouseDown = (event: MouseEvent) => {
  return event.button === 2 && event.buttons === 2
}

export const isRightMouseUp = (event: MouseEvent) => {
  return event.button === 2 && event.buttons === 0
}

export const isMouseMove = (event: MouseEvent) => {
  return event.button === -1 && event.buttons === 0
}
