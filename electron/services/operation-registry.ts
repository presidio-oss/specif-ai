class OperationRegistry {
  private static instance: OperationRegistry;
  private operations: Map<string, AbortController> = new Map();

  private constructor() {}

  public static getInstance(): OperationRegistry {
    if (!OperationRegistry.instance) {
      OperationRegistry.instance = new OperationRegistry();
    }
    return OperationRegistry.instance;
  }

  /**
   * Create and register a new AbortController for an operation
   * @param operationId - Unique identifier for the operation
   * @returns AbortController instance
   */
  public createController(operationId: string): AbortController {
    const previous = this.getController(operationId);
    if (previous && !previous.signal.aborted) {
      previous.abort("superseded");
    }
    this.remove(operationId);

    const controller = new AbortController();
    this.operations.set(operationId, controller);

    console.log(
      `[OperationRegistry] Created AbortController for operation: ${operationId}`
    );
    return controller;
  }

  /**
   * Get an existing AbortController
   * @param operationId - Unique identifier for the operation
   * @returns AbortController instance or undefined if not found
   */
  public getController(operationId: string): AbortController | undefined {
    return this.operations.get(operationId);
  }

  /**
   * Get the AbortSignal for an operation
   * @param operationId - Unique identifier for the operation
   * @returns AbortSignal or undefined if not found
   */
  public getSignal(operationId: string): AbortSignal | undefined {
    return this.operations.get(operationId)?.signal;
  }

  /**
   * Cancel an operation by aborting its controller
   * @param operationId - Unique identifier for the operation
   * @param reason - Optional reason for aborting
   * @returns true if operation was aborted, false if not found
   */
  public cancel(operationId: string, reason?: string): boolean {
    const controller = this.operations.get(operationId);
    if (controller && !controller.signal.aborted) {
      console.log(
        `[OperationRegistry] Aborting operation: ${operationId}${
          reason ? ` - ${reason}` : ""
        }`
      );
      controller.abort(reason);
      this.operations.delete(operationId);
      return true;
    }
    return false;
  }

  /**
   * Check if an operation is cancelled
   * @param operationId - Unique identifier for the operation
   * @returns true if aborted, false otherwise
   */
  public isCancelled(operationId: string): boolean {
    const controller = this.operations.get(operationId);
    return controller?.signal.aborted ?? false;
  }

  /**
   * Remove operation from registry
   * @param operationId - Unique identifier for the operation
   */
  public remove(operationId: string): void {
    const controller = this.operations.get(operationId);
    if (controller) {
      this.operations.delete(operationId);
      console.log(`[OperationRegistry] Removed operation: ${operationId}`);
    }
  }

  /**
   * Throw error if operation is cancelled
   * @param operationId - Unique identifier for the operation
   */
  public checkCancellation(operationId: string): void {
    if (this.isCancelled(operationId)) {
      throw new Error(`Operation cancelled: ${operationId}`);
    }
  }

  /**
   * Get all active operation IDs
   * @returns Array of active operation IDs
   */
  public getActiveOperations(): string[] {
    return Array.from(this.operations.keys());
  }

  /**
   * Abort all active operations
   * @param reason - Optional reason for aborting all operations
   */
  public abortAllOperations(reason?: string): void {
    const operations = this.getActiveOperations();
    console.log(
      `[OperationRegistry] Aborting ${operations.length} operations${
        reason ? ` - ${reason}` : ""
      }`
    );

    operations.forEach((operationId) => {
      this.cancel(operationId, reason);
    });
  }

  /**
   * Clean up all controllers
   */
  public cleanup(): void {
    this.abortAllOperations("Application cleanup");
    this.operations.clear();
  }
}

export { OperationRegistry };
