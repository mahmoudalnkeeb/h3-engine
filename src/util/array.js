/**
 * Remove matching items in place, keeping order, without allocating.
 * @template T
 * @param {T[]} list
 * @param {(item: T) => boolean} shouldRemove
 * @returns {T[]} The same array.
 */
export const removeWhere = (list, shouldRemove) => {
  let kept = 0;
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (!shouldRemove(item)) list[kept++] = item;
  }
  list.length = kept;
  return list;
};
