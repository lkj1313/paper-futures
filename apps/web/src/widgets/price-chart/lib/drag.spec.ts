import { describe, expect, it } from 'vitest';
import { findDraggableLine } from './drag';

describe('findDraggableLine', () => {
  const lines = [
    { id: undefined, y: 100 },
    { id: 'order-1', y: 200 },
    { id: 'order-2', y: 206 },
    { id: 'order-3', y: null },
  ];

  it('누른 높이에서 5px 안에 있는 끌 수 있는 선 중 가장 가까운 선을 고른다', () => {
    expect(findDraggableLine(lines, 202)).toBe('order-1');
    expect(findDraggableLine(lines, 204)).toBe('order-2');
    expect(findDraggableLine(lines, 195)).toBe('order-1');
  });

  it('id가 없는 선(포지션 선)과 화면 밖 선은 고르지 않는다', () => {
    expect(findDraggableLine(lines, 100)).toBeNull();
    expect(findDraggableLine([{ id: 'order-3', y: null }], 0)).toBeNull();
  });

  it('포지션 선이 더 가까워도 끌 수 있는 주문 선을 고른다', () => {
    expect(
      findDraggableLine(
        [
          { id: undefined, y: 200 },
          { id: 'order-1', y: 203 },
        ],
        200,
      ),
    ).toBe('order-1');
  });

  it('5px보다 멀면 고르지 않는다', () => {
    expect(findDraggableLine(lines, 194)).toBeNull();
    expect(findDraggableLine(lines, 212)).toBeNull();
  });
});
