import { createRealtimeResponseController, type RealtimeResponseRequest } from '../realtime/realtimeResponseController';

export type SupplyResponseGateReason = 'tool' | 'user';

export interface SupplyResponseGateDrain {
  shouldCreateResponse: boolean;
  reason?: SupplyResponseGateReason;
}

export interface SupplyResponseGate {
  markResponseCreated(): void;
  markResponseRequestFailed(): void;
  markResponseDone(): SupplyResponseGateDrain;
  markToolCallStarted(): void;
  markToolCallFinished(): void;
  requestResponseForToolOutput(): boolean;
  requestResponseForUserTurn(): boolean;
  reset(): void;
}

function toSupplyDrain(request: RealtimeResponseRequest): SupplyResponseGateDrain {
  if (!request.shouldCreateResponse) return { shouldCreateResponse: false };
  return {
    shouldCreateResponse: true,
    reason: request.reason === 'tool' ? 'tool' : 'user',
  };
}

export function createSupplyResponseGate(): SupplyResponseGate {
  const controller = createRealtimeResponseController();
  let toolCallActive = false;

  return {
    markResponseCreated() {
      controller.markResponseCreated();
    },
    markResponseRequestFailed() {
      controller.markResponseRequestFailed();
    },
    markResponseDone() {
      return toSupplyDrain(controller.markResponseDone());
    },
    markToolCallStarted() {
      toolCallActive = true;
      controller.beginToolCall();
    },
    markToolCallFinished() {
      if (!toolCallActive) return;
      toolCallActive = false;
      controller.completeToolCall();
    },
    requestResponseForToolOutput() {
      if (toolCallActive) {
        toolCallActive = false;
        controller.completeToolCall();
      }
      return controller.requestToolContinuation().shouldCreateResponse;
    },
    requestResponseForUserTurn() {
      return controller.requestTextTurn('supply typed turn').shouldCreateResponse;
    },
    reset() {
      toolCallActive = false;
      controller.reset();
    },
  };
}
