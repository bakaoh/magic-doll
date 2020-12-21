/**
 * @param {number[]} candidates - candidate numbers we're picking from.
 * @param {number} remainingSum - remaining sum after adding candidates to currentCombination.
 * @param {function(number[])} onCombination - combination callback function.
 * @param {number[]} currentCombination - currently explored candidates.
 * @param {number} startFrom - index of the candidate to start further exploration from.
 */
function combinationManaSumRecursive(
  candidates,
  remainingSum,
  onCombination,
  currentCombination = [],
  startFrom = 0,
  color = ""
) {
  if (remainingSum < 0) {
    // By adding another candidate we've gone below zero.
    // This would mean that the last candidate was not acceptable.
    return true;
  }

  if (remainingSum === 0) {
    // If after adding the previous candidate our remaining sum
    // became zero - we need to save the current combination since it is one
    // of the answers we're looking for.
    return onCombination(currentCombination.slice());
  }

  if (currentCombination.length == 6) {
    if (remainingSum < 3 || remainingSum > 40)
      return onCombination(currentCombination.slice());
    return true;
  }

  // If we haven't reached zero yet let's continue to add all
  // possible candidates that are left.
  for (
    let candidateIndex = startFrom;
    candidateIndex < candidates.length;
    candidateIndex += 1
  ) {
    const currentCandidate = candidates[candidateIndex];
    const oldColor = color;
    if (currentCandidate.color != "Gray" && currentCandidate.color != "Gold") {
      if (!color) {
        color = currentCandidate.color;
      } else if (currentCandidate.color != color) {
        continue;
      }
    }
    // Let's try to add another candidate.
    currentCombination.push(currentCandidate);

    // Explore further option with current candidate being added.
    if (
      !combinationManaSumRecursive(
        candidates,
        remainingSum - currentCandidate.mana,
        onCombination,
        currentCombination,
        candidateIndex + 1,
        color
      )
    ) {
      return false;
    }

    // BACKTRACKING.
    // Let's get back, exclude current candidate and try another ones later.
    currentCombination.pop();
    color = oldColor;
  }

  return true;
}

/**
 * Backtracking algorithm of finding all possible combination for specific sum.
 *
 * @param {number[]} candidates
 * @param {number} target
 * @param {number} onCombination
 */
module.exports = function(candidates, target, onCombination) {
  combinationManaSumRecursive(candidates, target, onCombination);
};
