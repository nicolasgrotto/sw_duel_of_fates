import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { saberTrail } from '../src/config/fighterVisualConfig.js';
import { computePose, createPose } from '../src/rendering/fighterPose.js';
import { SaberTrail } from '../src/rendering/SaberTrail.js';
import { getBladeWorldPoints } from '../src/rendering/saberRenderer.js';
import { spawnFighter } from './helpers.js';

function createRecordingRenderer() {
  const polygons = [];
  return {
    polygons,
    save: () => {},
    restore: () => {},
    setBlendMode: () => {},
    setAlpha: () => {},
    fillPolygon: (points) => polygons.push([...points]),
  };
}

function blade(x) {
  return { baseX: x, baseY: 500, tipX: x + 50, tipY: 450 };
}

describe('getBladeWorldPoints', () => {
  it('mirrors the blade when the fighter faces left', () => {
    const right = spawnFighter(500, 1);
    const left = spawnFighter(500, -1);
    const rightPoints = getBladeWorldPoints(right, computePose(right, createPose()), {});
    const leftPoints = getBladeWorldPoints(left, computePose(left, createPose()), {});

    assert.ok(rightPoints.tipX > 500);
    assert.ok(leftPoints.tipX < 500);
    assert.equal(rightPoints.tipY, leftPoints.tipY);
  });
});

describe('SaberTrail', () => {
  it('draws one band between each pair of recent samples', () => {
    const trail = new SaberTrail();
    const renderer = createRecordingRenderer();

    trail.record(1.0, blade(100));
    trail.record(1.02, blade(110));
    trail.record(1.04, blade(120));
    trail.draw(renderer, 1.04, '#3fa9ff');

    assert.equal(renderer.polygons.length, 2);
    assert.deepEqual(renderer.polygons[0], [120, 500, 170, 450, 160, 450, 110, 500]);
  });

  it('ignores a second sample at the same time', () => {
    const trail = new SaberTrail();
    const renderer = createRecordingRenderer();

    trail.record(1.0, blade(100));
    trail.record(1.0, blade(200));
    trail.record(1.02, blade(110));
    trail.draw(renderer, 1.02, '#3fa9ff');

    assert.equal(renderer.polygons.length, 1);
    assert.equal(renderer.polygons[0][6], 100);
  });

  it('fades out after the trail duration', () => {
    const trail = new SaberTrail();
    const renderer = createRecordingRenderer();

    trail.record(1.0, blade(100));
    trail.record(1.02, blade(110));
    trail.draw(renderer, 1.02 + saberTrail.duration, '#3fa9ff');

    assert.equal(renderer.polygons.length, 0);
  });
});
