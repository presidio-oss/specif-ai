/**
 * Editor Adapter Interface
 * 
 * This interface defines the contract that any editor implementation must fulfill
 * to work with the InlineEdit component. By implementing this interface, any text
 * editor can be made compatible with the inline edit functionality.
 */
export interface EditorAdapter {
  /**
   * Get the current selected text from the editor
   */
  getSelectedText(): string;
  
  /**
   * Get the start position of the current selection
   */
  getSelectionStart(): number;
  
  /**
   * Get the end position of the current selection
   */
  getSelectionEnd(): number;
  
  /**
   * Get the surrounding context (full content or partial content around selection)
   */
  getContext(): string;
  
  /**
   * Set the selection to the specified range
   */
  setSelection(start: number, end: number): void;
  
  /**
   * Replace the selected text with the provided content
   */
  replaceSelection(content: string): void;
  
  /**
   * Apply highlighting to the current selection
   */
  highlightSelection(): void;
  
  /**
   * Remove highlighting from the editor
   */
  removeHighlight(): void;
  
  /**
   * Focus the editor
   */
  focus(): void;
  
  /**
   * Get the editor's DOM element
   */
  getEditorElement(): HTMLElement;
  
  /**
   * Calculate position for the inline edit popup relative to selection
   */
  calculatePopupPosition(): { top: number, left: number };
}

/**
 * Selection Lock Handler Interface
 * 
 * This interface defines methods for locking and unlocking selections
 * to prevent new selections while inline edit is active
 */
export interface SelectionLockHandler {
  /**
   * Lock the current selection to prevent new selections
   */
  lockSelection(): void;
  
  /**
   * Unlock the selection to allow new selections again
   */
  unlockSelection(): void;
  
  /**
   * Check if selection is currently locked
   */
  isSelectionLocked(): boolean;
}

/**
 * Editor Manager Interface
 * 
 * This interface combines the EditorAdapter and SelectionLockHandler
 * to provide a complete interface for editor interaction
 */
export interface EditorManager extends EditorAdapter, SelectionLockHandler {
  /**
   * Get the editor instance - implementation specific
   */
  getEditorInstance(): any;
}
