export const storyConditions = Object.freeze({
  always: () => true,
  healthRatioAbove: ({ threshold }, { result }) => result.fighters[0].healthRatio > threshold,
  alignmentIs: ({ alignment }, { run }) => run.protagonist.alignment === alignment,
});

export function evaluateCondition(condition, context) {
  const test = storyConditions[condition.type];
  if (!test) {
    throw new Error(`Unknown story condition: ${condition.type}`);
  }
  return test(condition, context);
}
