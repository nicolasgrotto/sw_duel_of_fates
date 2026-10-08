import { Action } from '../config/controlsConfig.js';
import { touchLayoutConfig } from '../config/touchLayoutConfig.js';

export function containsTouch(point, circle) {
  return Math.hypot(point.x - circle.x, point.y - circle.y) <= circle.radius;
}

export class TouchInput {
  constructor({ target, config = touchLayoutConfig }) {
    this.target = target;
    this.config = config;
    this.kind = 'touch';
    this.actions = new Set();
    this.nextActions = new Set();
    this.pointers = new Map();
    this.taps = [];
    this.joystick = null;
    this.mode = 'menu';
    this.hasBack = false;
    this.enabled = true;
    this.handleDown = this.handleDown.bind(this);
    this.handleMove = this.handleMove.bind(this);
    this.handleUp = this.handleUp.bind(this);
    target.addEventListener('pointerdown', this.handleDown);
    target.addEventListener('pointermove', this.handleMove);
    target.addEventListener('pointerup', this.handleUp);
    target.addEventListener('pointercancel', this.handleUp);
    target.addEventListener('lostpointercapture', this.handleUp);
  }

  setContext(mode, hasBack = false) {
    this.reset();
    this.mode = mode;
    this.hasBack = hasBack;
  }

  point(event) {
    const rect = this.target.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * this.config.width / rect.width, y: (event.clientY - rect.top) * this.config.height / rect.height };
  }

  handleDown(event) {
    if (!this.enabled || event.pointerType !== 'touch') return;
    event.preventDefault();
    this.onActivity?.();
    const point = this.point(event);
    this.target.setPointerCapture?.(event.pointerId);
    let action = null;
    if (this.mode === 'duel') {
      action = this.config.buttons.find((button) => containsTouch(point, button))?.action ?? null;
      if (!action && !this.joystick && point.x < this.config.joystick.halfWidth && point.y >= this.config.joystick.top) {
        this.joystick = { id: event.pointerId, originX: point.x, originY: point.y, x: point.x, y: point.y, evaded: false };
      }
    } else if (this.hasBack && containsTouch(point, this.config.back)) {
      action = Action.BACK;
    } else {
      this.taps.push(point);
    }
    this.pointers.set(event.pointerId, action);
    this.refreshActions();
  }

  handleMove(event) {
    if (!this.pointers.has(event.pointerId)) return;
    event.preventDefault();
    this.onActivity?.();
    if (this.joystick?.id !== event.pointerId) return;
    const point = this.point(event);
    this.joystick.x = point.x;
    this.joystick.y = point.y;
    this.refreshActions();
  }

  handleUp(event) {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.delete(event.pointerId);
    if (this.joystick?.id === event.pointerId) this.joystick = null;
    this.refreshActions();
  }

  refreshActions() {
    this.nextActions.clear();
    for (const action of this.pointers.values()) if (action) this.nextActions.add(action);
    if (this.joystick) {
      const { deadzone, evadeThreshold } = this.config.joystick;
      const dx = this.joystick.x - this.joystick.originX;
      const dy = this.joystick.y - this.joystick.originY;
      if (Math.abs(dx) > deadzone) this.nextActions.add(dx < 0 ? Action.MOVE_LEFT : Action.MOVE_RIGHT);
      if (dy > evadeThreshold && dy > Math.abs(dx) && !this.joystick.evaded) {
        this.nextActions.add(Action.EVADE);
        this.joystick.evaded = true;
      }
    }
    for (const action of this.nextActions) if (!this.actions.has(action)) this.onPress?.(action);
    const previous = this.actions;
    this.actions = this.nextActions;
    this.nextActions = previous;
  }

  endFrame() {
    this.taps.length = 0;
    this.actions.delete(Action.EVADE);
  }

  reset() {
    for (const id of this.pointers.keys()) {
      if (this.target.hasPointerCapture?.(id)) this.target.releasePointerCapture?.(id);
    }
    this.pointers.clear();
    this.actions.clear();
    this.nextActions.clear();
    this.taps.length = 0;
    this.joystick = null;
  }

  destroy() {
    this.reset();
    this.target.removeEventListener('pointerdown', this.handleDown);
    this.target.removeEventListener('pointermove', this.handleMove);
    this.target.removeEventListener('pointerup', this.handleUp);
    this.target.removeEventListener('pointercancel', this.handleUp);
    this.target.removeEventListener('lostpointercapture', this.handleUp);
  }
}
