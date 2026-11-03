let selectionHandler = null;

export function setMapPickerSelectionHandler(handler) {
  selectionHandler = handler;
}

export function completeMapPickerSelection(location) {
  const handler = selectionHandler;
  selectionHandler = null;
  handler?.(location);
}
